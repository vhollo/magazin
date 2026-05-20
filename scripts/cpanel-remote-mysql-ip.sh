#!/usr/bin/env bash
# Add or remove a host in cPanel Remote MySQL (UAPI Mysql::add_host / remove_host).
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
  api_func="remove_host"
else
  echo "Unknown action: $action (use add or remove)" >&2
  exit 1
fi

base="${CPANEL_URL%/}"
resp="$(
  curl -fsS -G \
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
    --data-urlencode "host=${host}" \
    "${base}/execute/Mysql/${api_func}"
)"

status="$(echo "$resp" | jq -r '.result.status // 0')"
if [[ "$status" != "1" ]]; then
  echo "cPanel Mysql/${api_func} failed for host=${host}:" >&2
  if command -v jq >/dev/null 2>&1; then
    echo "$resp" | jq . >&2 || echo "$resp" >&2
  else
    echo "$resp" >&2
  fi
  exit 1
fi

echo "cPanel Mysql/${api_func} succeeded for ${host}"
