#!/usr/bin/env bash
set -euo pipefail
BASE="${SMOKE_BASE_URL:-http://localhost:3000}"
echo "Smoke against ${BASE}"

curl -sfS "${BASE}/api/verse/daily" >/dev/null
curl -sfS "${BASE}/api/audio/reciters" >/dev/null
curl -sfS "${BASE}/api/quran/juz" >/dev/null
curl -sfS "${BASE}/api/quran/hizbs?language=en" >/dev/null
curl -sfS "${BASE}/api/prayer/times?latitude=21.3891&longitude=39.8579" >/dev/null

echo "OK — core read-only routes reachable"
