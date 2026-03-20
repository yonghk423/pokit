/**
 * React Native DevTools가 시스템 로케일(ko)로 ko.json을 요구하는데
 * @react-native/debugger-frontend 패키지에 ko.json이 없어 ENOENT가 발생합니다.
 * en-US.json을 ko.json으로 복사해 DevTools가 정상 열리도록 합니다.
 * 패키지가 ko를 정식 지원하면 이 스크립트는 제거해도 됩니다.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'debugger-frontend',
  'dist',
  'third-party',
  'front_end',
  'core',
  'i18n',
  'locales'
);

const source = path.join(localesDir, 'en-US.json');
const target = path.join(localesDir, 'ko.json');

if (fs.existsSync(source) && !fs.existsSync(target)) {
  fs.copyFileSync(source, target);
  console.log('[patch-debugger-locale] ko.json created from en-US.json for DevTools.');
}
