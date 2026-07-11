#!/usr/bin/env node
/**
 * app.json 의 최신 아이콘(assets/pokit5.png)을
 * - iOS AppIcon
 * - Android 런처(mipmap)
 * - Android 알림(drawable/notification_icon)
 * 에 동기화한다.
 *
 * Expo prebuild 없이도 로컬 ios/·android/ 네이티브 폴더를 맞출 때 사용.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const expo = appJson.expo ?? {};
const notificationsPlugin = expo.plugins?.find(
  (p) => Array.isArray(p) && p[0] === 'expo-notifications',
)?.[1];

const ICON = path.resolve(ROOT, expo.icon ?? './assets/pokit5.png');
const ADAPTIVE_BG = expo.android?.adaptiveIcon?.backgroundColor ?? '#F2EDE4';
const NOTIFICATION_ICON =
  notificationsPlugin?.icon ?? expo.notification?.icon ?? expo.icon ?? './assets/pokit5.png';
const NOTIFICATION_COLOR =
  notificationsPlugin?.color ?? expo.notification?.color ?? '#000000';

if (!fs.existsSync(ICON)) {
  console.error(`missing icon: ${ICON}`);
  process.exit(1);
}

const iosAppIcon = path.join(
  ROOT,
  'ios/Pokit/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
);
fs.mkdirSync(path.dirname(iosAppIcon), { recursive: true });
execFileSync('sips', ['-c', '1024', '1024', ICON, '--out', iosAppIcon], { stdio: 'inherit' });
console.log(`OK: iOS AppIcon ← ${path.relative(ROOT, ICON)}`);

const { setIconAsync } = require('@expo/prebuild-config/build/plugins/icons/withAndroidIcons');
const {
  setNotificationIconAsync,
} = require('expo-notifications/plugin/build/withNotificationsAndroid');

await setIconAsync(ROOT, {
  icon: path.relative(ROOT, ICON),
  backgroundColor: ADAPTIVE_BG,
  backgroundImage: null,
  monochromeImage: null,
  isAdaptive: true,
});
console.log(`OK: Android launcher icons ← ${path.relative(ROOT, ICON)} (bg ${ADAPTIVE_BG})`);

const colorsPath = path.join(ROOT, 'android/app/src/main/res/values/colors.xml');
if (fs.existsSync(colorsPath)) {
  let colorsXml = fs.readFileSync(colorsPath, 'utf8');
  const upsertColor = (name, value) => {
    const re = new RegExp(`(<color name="${name}">)[^<]+(</color>)`);
    if (re.test(colorsXml)) {
      colorsXml = colorsXml.replace(re, `$1${value}$2`);
    } else {
      colorsXml = colorsXml.replace(
        '</resources>',
        `  <color name="${name}">${value}</color>\n</resources>`,
      );
    }
  };
  upsertColor('iconBackground', ADAPTIVE_BG);
  upsertColor('notification_icon_color', NOTIFICATION_COLOR);
  fs.writeFileSync(colorsPath, colorsXml);
  console.log(
    `OK: colors.xml iconBackground=${ADAPTIVE_BG}, notification_icon_color=${NOTIFICATION_COLOR}`,
  );
}

await setNotificationIconAsync(ROOT, NOTIFICATION_ICON);
console.log(`OK: Android notification_icon ← ${NOTIFICATION_ICON}`);

console.log('');
console.log('Next: 기기에서 앱 삭제 후 Clean Build, 그다음 npx expo run:ios / run:android');
console.log('iOS 알림 아이콘은 설치된 앱 아이콘을 쓰므로 재설치가 필요합니다.');
