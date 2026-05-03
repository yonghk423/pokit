#!/usr/bin/env bash
# app.json 아이콘만 바꾸면 ios/ AppIcon 은 자동 갱신되지 않음 — 앱 아이콘 소스 PNG 를 1024 App Icon 으로 반영
# 스플래시는 SplashScreen.storyboard 의 POKIT 라벨 사용(이 스크립트에서 스플래시 이미지는 건드리지 않음)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON="$ROOT/assets/pokit2.png"
APPICON="$ROOT/ios/Pokit/Images.xcassets/AppIcon.appiconset"

if [[ ! -f "$ICON" ]]; then
  echo "missing: $ICON" >&2
  exit 1
fi

sips -c 1024 1024 "$ICON" --out "$APPICON/App-Icon-1024x1024@1x.png"

echo "OK: AppIcon updated from $ICON"
echo "Next: delete app from device/simulator, Clean Build Folder, then npx expo run:ios"
