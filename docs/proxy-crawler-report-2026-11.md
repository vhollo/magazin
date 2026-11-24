---
title: Disguised crawler on a residential proxy network — diabetes.hu access log analysis
report_date: 2026-11-23
site: diabetes.hu (MODX Evolution CMS on Apache; a SvelteKit rewrite runs on Netlify)
log_source: Apache combined access log, HTTPS vhost, no extra headers (no Accept-Language, no TLS fingerprint, no request timing)
log_window: 2026-10-31T13:09:36+01:00 .. 2026-11-23T13:10:43+01:00 (23.0 days)
scaling_note: "per 30 days" figures = log count × 30 / 23
language: en
audience: AI agents and engineers; every number below is measured unless marked ASSUMPTION or INFERENCE
key_metrics:
  total_requests: 1205718
  total_page_requests: 493633          # not a file under /assets/, /manager/, not a static file extension
  crawler_user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  crawler_page_requests: 300909        # 61.0% of all page requests
  crawler_page_requests_per_30d: 392490
  crawler_file_requests: 3215          # images/CSS/JS: it does not render pages
  crawler_distinct_ips: 167920
  crawler_status_404_share_of_artifact_requests: 0.9998
  all_relative_link_artifact_page_requests: 328188   # 66.5% of page requests, all user agents together
  all_automated_share_of_page_requests: ~0.92        # disguised + declared crawlers + prefetch, see section 7
---

# Disguised crawler on a residential proxy network (diabetes.hu, 2026-10-31 … 11-23)

## 1. Summary

- One crawler accounts for **61.0% of all page requests** of the site (300,909 of 493,633 in 23 days, ≈392k per 30 days). Together with smaller bots that hit the same kind of broken URLs, **66.5%** of all page requests (328,188) were requests for URLs that do not exist.
- It presents a single, fixed desktop Chrome user agent (macOS, Chrome 142), sends **no Referer**, uses **only GET**, never requests `robots.txt` or a sitemap, and does **not render** pages (3,215 file requests for 300,909 pages).
- Each request comes from a different IP address of a very large pool: **167,920 distinct IPv4 addresses**, median **1 request per IP**, 2,168 distinct /16 networks, 77% of addresses geolocated to the US. INFERENCE: a rotating residential proxy service.
- It is stuck in a **crawler trap**: it resolves root-relative links written without a leading slash (`href="cikkek/diabetes/2604/…"`) against the current folder instead of the page's `<base href="/">`, so every 404 page yields new, longer, non-existent URLs. 99.98% of its artifact requests got 404. Only 883 of its requests reached a real page (HTTP 200).
- It behaves like **one centrally scheduled crawl frontier**: 99.6% of its URLs were requested exactly once across all IPs, 97.6% of its URLs extend a folder it had fetched earlier, with a median queue delay of ~2.8 days, and URL depth stops at exactly 14 path segments.
- INFERENCE: purpose is bulk content scraping (AI training data, aggregation or SEO/market data). It is not an attack (no exploit probes, no POST, no logins) and not a DoS (average ≈9 requests/minute, peak 58/minute).

## 2. Identification (how to recognise its requests)

All of these hold for the crawler's requests in this log:

| Signal | Value |
|---|---|
| User-Agent (exact string, never varies) | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36` |
| Method | GET only (300,909 of 300,909 page requests) |
| Referer | empty (`-`) on 299,829 of 299,832 artifact requests |
| robots.txt / sitemap requests | 0 |
| Page vs file requests | 300,909 pages, 3,215 files |
| Typical URL | `/cikkek/<folder>/<issue>/cikkek/<section>/…` with 12–14 segments, a site section name (`cikkek`, `hirek`, `clicks`, `alapitvany`, `receptsarok`, `junior`, …) repeated below the root |
| Response | 404 for 299,770 of 299,832 artifact requests (200: 58, 500: 4) |

The user-agent string alone is **not** a safe block criterion: real Chrome users on macOS can send the same string (Chrome freezes the macOS version at `10_15_7`). ASSUMPTION: Chrome 142 was the stable version around late 2025 (4-week release cadence), so in November 2026 this is a roughly one-year-old, hard-coded version string; a real user population would be spread over newer versions.

The reliable signal is the **URL structure**: a live root section name appearing again below the root. The rule used on this site (TypeScript `isRelativeLinkArtifact`, mod_rewrite and Netlify `_redirects` versions) matched 328,188 page requests with 0 false positives on all 329k distinct page paths of the log.

## 3. Volume and timing

| Metric | Value |
|---|---|
| Page requests in 23.0 days | 300,909 (≈392,490 per 30 days) |
| Of which relative-link artifacts | 299,832 |
| Real pages reached (HTTP 200) | 883 (top: `/cikkek` 199 times) |
| Bytes sent to it | 3.69 GB (4.0% of the site's 92.1 GB; the site's bytes are dominated by images) |
| Active span | first request 2026-10-31 13:09:43 +01:00, last 2026-11-23 13:10:43 +01:00 — i.e. the whole log window; it started before the log and was still running at the end |
| Inter-arrival time (all IPs together) | median 5 s, mean 6.6 s, longest pause 1,401 s |
| Requests per minute | median 7 per active minute, maximum 58 |

Artifact requests per day (UTC days from 2026-10-31, first and last day partial):
`6140, 9936, 11123, 11412, 9924, 10806, 13793, 21087, 17019, 11509, 20789, 20799, 19743, 20217, 12275, 9639, 9978, 8430, 8463, 10871, 9920, 10310, 10390, 5259`

Artifact requests by hour of day (UTC, 00 … 23), whole window:
`9839, 9693, 9290, 9089, 8992, 9448, 9480, 12268, 12613, 13313, 14349, 15470, 14782, 15133, 18547, 14792, 14636, 12910, 13045, 12906, 14879, 13469, 11513, 9376`

Observation: activity is continuous around the clock; the busiest hour has only ~2× the requests of the quietest. There is no human day/night rhythm.

## 4. Network origin

| Metric | Value |
|---|---|
| Distinct IPv4 addresses (page requests) | 167,920 (no IPv6) |
| Requests per IP | median 1, maximum 11 |
| IPs with exactly 1 request | 84,896 of the 167,092 IPs used for artifact requests |
| IPs with ≤ 3 requests | 155,164 of 167,092 |
| IPs seen on more than one day | 79,302 of 167,920 |
| Distinct /16 networks | 2,168 |
| Largest /16 networks (artifact requests) | 84.37/16: 11,070 · 172.252/16: 10,296 · 142.147/16: 9,951 · 40.223/16: 8,417 · 170.23/16: 6,219 |
| Country (DB-IP Lite, by address) | US 77%, GB 4%, IL 3%, PL 2%, CA 2%, MX 2%, BR 2%, ES 2%, SE 1%, ZA 1% |
| Same IP fetching a source page and a URL derived from it | 2 cases out of 293,776 |

INFERENCE: rotating residential proxy network (a commercial service that routes traffic through home internet connections). Basis: the very large number of addresses, one request per address, wide spread over unrelated networks and countries, and addresses recurring on different days (consistent with dynamic home IPs shared in a pool). NOT VERIFIED: no ASN/ISP lookup was done, so the share of residential vs. datacenter addresses and the proxy provider are unknown. Individual IP addresses are deliberately not listed in this report.

## 5. Crawl behaviour (the trap)

The CMS templates write internal links root-relative but without a leading slash and rely on `<base href="/">`:

```html
<base href="/">
<a href="cikkek/diabetes/2604/some-article">…</a>
<img src="assets/cache/images/cikkek/dt1503/photo-600x-f74.jpg">
```

A browser resolves these against `/`. This crawler resolves them against the current page's folder. Example of the result (one real request):

`/cikkek/hypertonia/alapitvany/clicks/clicks/cikkek/alapitvany/cikkek/diabetes/2604/rendezveny`

Every such URL returned the CMS's full 404 page, which contains the same relative links again, so the crawler's frontier grows on its own output.

Measured evidence that a single scheduler drives it:

| Evidence | Value |
|---|---|
| Distinct URLs among its artifact requests | 298,643 of 299,832 |
| URLs requested exactly once | 297,497 (99.6%); maximum repeats of one URL: 14 |
| URLs extending a folder it fetched earlier | 293,776 of 300,909 (97.6%) |
| Delay between fetching a folder and fetching a URL derived from it | p10 ≈ 14 h, median ≈ 2.8 days, p90 ≈ 8.7 days |
| URL depth (path segments) | 1: 287 · 2: 231 · 3: 228 · 4: 718 · 5: 346 · 6: 428 · 7: 1,060 · 8: 2,502 · 9: 6,068 · 10: 13,200 · 11: 26,505 · 12: 48,513 · 13: 79,946 · 14: 120,877 · >14: 0 |
| First path segment | `/cikkek` 291,367; others ≤ 1,333 each |
| Unrendered template tags followed as links | 1,146 requests start with `/[~[*id*]~]` (URL-encoded), a CMS link tag that only appears unprocessed in page source or scripts |

INFERENCE: a queue-based crawl (likely breadth-first) with URL deduplication, a maximum depth of 14 segments, and a delay of days between discovery and fetch; requests are spread over the proxy pool, one request per exit address. Most of its current work is at the depth limit, where the queue grows fastest.

## 6. Intent

Not observable directly; the following are inferences from behaviour.

- **Not an attack**: no POST requests, and no requests for admin, login, configuration or known-vulnerable paths (`wp-*`, `.env`, `.git`, `phpmyadmin`, `xmlrpc`, SQL or path-traversal strings). Its only `.php` requests (106) are the site's own image-thumbnail links (`…/assets/snippets/phpThumb/phpThumb.php?src=…`) resolved against the wrong folder.
- **Not a denial of service**: ≈9 requests per minute on average.
- **Not ad or analytics fraud**: it does not execute JavaScript or load page resources, so analytics scripts never see it.
- **Most likely bulk content scraping** (AI training data, content aggregation, or SEO/market-research datasets). The disguise (browser user agent, residential proxies, no robots.txt) is typical of collectors that want to avoid bot filters and IP blocking. Declared crawlers (Googlebot, GPTBot, ClaudeBot, …) identify themselves and read robots.txt; this one does neither.
- The behaviour fits both a poorly written in-house scraper and a large rented crawling service; the log does not allow a narrower attribution. Operator: unknown.

## 7. Context: other automated traffic in the same log (≈ per 30 days)

| Actor | Volume | Notes |
|---|---|---|
| This crawler (Mac Chrome/142) | ≈392k page requests | sections 1–6 |
| Other user agents on the same artifact URLs | ≈37k page requests | Mac Chrome/120 (9,369 in log), X11 Linux Chrome/157 (5,093), Mac Chrome/136 (2,026), others |
| "Windows Chrome/120" bot on AWS addresses | ≈115k file requests | requests relative **image** links resolved against the article folder (`/cikkek/diabetes/1503/assets/cache/images/…png`), sends the real article as Referer; a different actor with the same link-resolution defect |
| Rendering bot "X11 Linux Chrome/156–158" | ≈8.4k page views | executes JavaScript, `Referer: https://www.google.com/`, US browser time zone, one residential IP per page, leaves after ~3 s; shows up in Simple Analytics as "US / google / desktop Chrome" |
| Declared crawlers | ≈103k page requests | Facebook 27k, Moz DotBot 13k, Semrush 10k, Googlebot 9k, Ahrefs 8k, OpenAI 4k, Anthropic 2k, … |
| Chrome private prefetch proxy | ≈24k page requests | Google IP ranges, search-result prefetch, no JavaScript |
| Real browsers | ≈28k page requests | consistent with Simple Analytics and GA4 numbers for Hungary |

Share of page requests that are automated (all rows except real browsers): ≈92%.

## 8. Impact on this site

- Each artifact request was a full CMS 404 render (PHP + database). This crawler's requests were ≈63.6% of all page requests the CMS rendered in the window (300,886 of 473,173 page requests answered with 200, 404 or 500).
- No effect on the Netlify mirror: the CMS page starts a mirror iframe only after the `load` event + 2 s, which needs JavaScript; this crawler never ran it. Only ≈10.8k artifact page views per 30 days came from clients that rendered pages (mostly the X11 rendering bot).

## 9. Countermeasures in place (2026-11-23)

1. **Apache `.htaccess`** on the CMS host: a mod_rewrite block answers artifact URLs with `410 Gone` and an 8-byte body (`ErrorDocument 410 "410 Gone"`), before the CMS starts. Existing files are never matched (`!-f`), nor anything under the root `/assets/` folder. Verified live: artifact URL → 410, real pages and files → 200.
2. **Netlify `_redirects`** (for the SvelteKit site that will take over the domain): the same rule as static rules (`/:a/cikkek/* /relative-link-404.html 404`, one pair per section and position 1–6), so the function is never invoked for these URLs.
3. Blocking by IP or user agent was rejected: the IP pool is too large and rotating, and the user agent string is shared with real users.

## 10. Assumptions and open questions

- ASSUMPTION: all requests with this exact user agent belong to the same crawler. Supported by identical behaviour (no referer, GET only, no rendering, one request per IP, artifact URLs). A small number of real macOS users with an outdated Chrome 142 may be mixed in (at most the ~883 requests to real pages).
- ASSUMPTION: residential proxies (see section 4; not verified with ASN data).
- OPEN: whether the crawler reacts to `410` (drops URLs, slows down) or keeps working through its queue. The 410 body contains no links, so the trap no longer produces new URLs; the existing queue size is unknown. Measure: daily count of 410 responses for this user agent in the next monthly access log.
- OPEN: when it started; it was active from the first to the last minute of the log.
- OPEN: identity of the operator and the proxy provider.
- LIMITATION: the log has no request headers beyond Referer and User-Agent, no TLS/HTTP2 fingerprints and no response times, so the client cannot be fingerprinted further from this data.

## 11. Machine-readable data

```json
{
  "report_date": "2026-11-23",
  "site": "diabetes.hu",
  "log_window": {"start": "2026-10-31T13:09:36+01:00", "end": "2026-11-23T13:10:43+01:00", "days": 23.0},
  "site_totals": {"requests": 1205718, "page_requests": 493633, "file_requests": 712085, "bytes": 92094222411},
  "crawler": {
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "page_requests": 300909,
    "page_requests_per_30d": 392490,
    "share_of_page_requests": 0.610,
    "file_requests": 3215,
    "bytes": 3687186278,
    "artifact_requests": 299832,
    "artifact_status": {"404": 299770, "200": 58, "500": 4},
    "real_pages_reached_200": 883,
    "referer_empty": 299829,
    "methods": {"GET": 300909},
    "robots_txt_requests": 0,
    "distinct_urls": 298643,
    "urls_requested_once": 297497,
    "urls_extending_earlier_fetched_folder": 293776,
    "discovery_to_fetch_delay_seconds": {"p10": 50953, "median": 238557, "p90": 750783},
    "max_path_segments": 14,
    "path_segment_histogram": {"1": 287, "2": 231, "3": 228, "4": 718, "5": 346, "6": 428, "7": 1060, "8": 2502, "9": 6068, "10": 13200, "11": 26505, "12": 48513, "13": 79946, "14": 120877},
    "distinct_ipv4": 167920,
    "requests_per_ip": {"median": 1, "max": 11},
    "ips_seen_on_multiple_days": 79302,
    "distinct_slash16": 2168,
    "top_slash16": {"84.37": 11070, "172.252": 10296, "142.147": 9951, "40.223": 8417, "170.23": 6219},
    "country_share_by_ip": {"US": 0.77, "GB": 0.04, "IL": 0.03, "PL": 0.02, "CA": 0.02, "MX": 0.02, "BR": 0.02, "ES": 0.02, "SE": 0.01, "ZA": 0.01},
    "inter_arrival_seconds": {"median": 5.0, "mean": 6.6, "max": 1401},
    "requests_per_minute": {"median_active": 7, "max": 58},
    "artifact_requests_per_utc_day_from_2026_10_31": [6140, 9936, 11123, 11412, 9924, 10806, 13793, 21087, 17019, 11509, 20789, 20799, 19743, 20217, 12275, 9639, 9978, 8430, 8463, 10871, 9920, 10310, 10390, 5259],
    "artifact_requests_per_utc_hour": [9839, 9693, 9290, 9089, 8992, 9448, 9480, 12268, 12613, 13313, 14349, 15470, 14782, 15133, 18547, 14792, 14636, 12910, 13045, 12906, 14879, 13469, 11513, 9376]
  },
  "all_artifact_page_requests_all_user_agents": 328188,
  "all_artifact_share_of_page_requests": 0.665,
  "automated_share_of_page_requests_estimate": 0.92,
  "inferences": {
    "single_scheduler": "high confidence",
    "residential_proxy_network": "likely, not verified by ASN",
    "purpose": "bulk content scraping, operator unknown",
    "attack_or_dos": "no evidence"
  },
  "countermeasures": ["apache_410_by_url_pattern", "netlify_static_404_by_url_pattern"]
}
```
