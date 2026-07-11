#!/usr/bin/env bash
# 하위 호환: 전체 아이콘 동기화는 sync-app-icons.mjs 사용
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/sync-app-icons.mjs"
