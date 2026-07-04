#!/usr/bin/env bash
# app.json 아이콘만 바꾸면 ios/ AppIcon 은 자동 갱신되지 않음
# 스플래시는 assets/splash.png → ios/.../SplashScreen.imageset/image.png 복사 후 storyboard 반영
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON="$ROOT/assets/pokit5.png"
APPICON="$ROOT/ios/Pokit/Images.xcassets/AppIcon.appiconset"

if [[ ! -f "$ICON" ]]; then
  echo "missing: $ICON" >&2
  exit 1
fi

sips -c 1024 1024 "$ICON" --out "$APPICON/App-Icon-1024x1024@1x.png"

echo "OK: AppIcon updated from $ICON"
echo "Next: delete app from device/simulator, Clean Build Folder, then npx expo run:ios"
