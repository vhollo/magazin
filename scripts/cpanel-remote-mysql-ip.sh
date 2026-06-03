#!/usr/bin/env bash
# Add or remove a host in cPanel Remote MySQL (UAPI Mysql::add_host / delete_host).
#
# Usage:
#   cpanel-remote-mysql-ip.sh add [ip]   # ip defaults to this machine's public IPv4
#   cpanel-remote-mysql-ip.sh remove <ip>
#
# Env: CPANEL_URL (https://host:2083), CPANEL_USER, CPANEL_TOKEN

set -euo pipefail

action="${1:?usage: add|remove}"
host="${2:-}"

for var in CPANEL_URL CPANEL_USER CPANEL_TOKEN; do
  if [[ -z "${!var:-}" ]]; then
    echo "$var is required" >&2
    exit 1
  fi
done

if [[ "$action" == "add" ]]; then
  if [[ -z "$host" ]]; then
    host="$(curl -4 -fsS https://api.ipify.org)"
    echo "Detected runner public IPv4: $host"
  fi
  api_func="add_host"
elif [[ "$action" == "remove" ]]; then
  if [[ -z "$host" ]]; then
    echo "IP address is required for remove" >&2
    exit 1
  fi
  api_func="delete_host"
else
  echo "Unknown action: $action (use add or remove)" >&2
  exit 1
fi

base="${CPANEL_URL%/}"
url="${base}/execute/Mysql/${api_func}"

# The cPanel endpoint occasionally returns transient HTTP errors (e.g. 415 from a
# WAF/proxy in front of it), so retry with backoff instead of failing on the first hit.
attempts=5
delay=3
resp=""
http_code=""
for ((i = 1; i <= attempts; i++)); do
  body_file="$(mktemp)"
  http_code="$(
    curl -sS -G \
      -o "$body_file" \
      -w '%{http_code}' \
      -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
      -H "Accept: application/json" \
      --data-urlencode "host=${host}" \
      "$url"
  )" || http_code="000"
  resp="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$http_code" == "200" ]]; then
    break
  fi

  echo "Attempt ${i}/${attempts}: cPanel Mysql/${api_func} returned HTTP ${http_code} for host=${host}" >&2
  if [[ "$i" -lt "$attempts" ]]; then
    sleep "$delay"
    delay=$(( delay * 2 ))
  fi
done

if [[ "$http_code" != "200" ]]; then
  echo "cPanel Mysql/${api_func} failed with HTTP ${http_code} after ${attempts} attempts for host=${host}:" >&2
  echo "$resp" >&2
  exit 1
fi

# UAPI normally nests under .result; some hosts return a flat { status, data, errors, ... } object.
status="$(echo "$resp" | jq -r '(.result.status // .status // 0)')"
errors="$(echo "$resp" | jq -r '(.result.errors // .errors // empty) | if type == "array" then .[] else . end' 2>/dev/null || true)"

if [[ "$status" != "1" ]]; then
  echo "cPanel Mysql/${api_func} failed for host=${host} (status=${status}):" >&2
  if command -v jq >/dev/null 2>&1; then
    echo "$resp" | jq . >&2 || echo "$resp" >&2
  else
    echo "$resp" >&2
  fi
  exit 1
fi

if [[ -n "$errors" ]]; then
  echo "cPanel Mysql/${api_func} warning for host=${host}: ${errors}" >&2
fi

echo "cPanel Mysql/${api_func} succeeded for ${host}"
