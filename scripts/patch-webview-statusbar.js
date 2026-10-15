/**
 * react-native-webview 13.16.1는 iOS 12 전체화면 영상 버그 우회를
 * iOS 13 이후에도 유지한다. 창이 숨겨질 때마다 UIApplication
 * setStatusBarHidden:animated: / setStatusBarStyle:animated: 를 호출하고,
 * iOS 27에서는 그 API가 동작하지 않으면서 경고만 남긴다.
 * 패키지가 iOS 13+에서 이 우회를 빼면 이 스크립트는 제거해도 된다.
 */

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-webview',
  'apple',
  'RNCWebViewImpl.m'
);

const marker = 'pokit: skip deprecated UIApplication status bar';

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
if (source.includes(marker)) {
  process.exit(0);
}

const replacements = [
  [
    `#if TARGET_OS_IOS
    _savedStatusBarStyle = RCTSharedApplication().statusBarStyle;
    _savedStatusBarHidden = RCTSharedApplication().statusBarHidden;
#endif // TARGET_OS_IOS`,
    `#if TARGET_OS_IOS
    // pokit: skip deprecated UIApplication status bar on iOS 13+.
    // Those getters/setters are no-ops and log on iOS 27.
    if (@available(iOS 13.0, *)) {
      _savedStatusBarStyle = UIStatusBarStyleDefault;
      _savedStatusBarHidden = NO;
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      _savedStatusBarStyle = RCTSharedApplication().statusBarStyle;
      _savedStatusBarHidden = RCTSharedApplication().statusBarHidden;
#pragma clang diagnostic pop
    }
#endif // TARGET_OS_IOS`,
  ],
  [
    `    // Workaround for StatusBar appearance bug for iOS 12
    // https://github.com/react-native-webview/react-native-webview/issues/62
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(showFullScreenVideoStatusBars)
                                                 name:UIWindowDidBecomeVisibleNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hideFullScreenVideoStatusBars)
                                                 name:UIWindowDidBecomeHiddenNotification
                                               object:nil];`,
    `    // Workaround for StatusBar appearance bug for iOS 12 only.
    // https://github.com/react-native-webview/react-native-webview/issues/62
    // On iOS 13+ any window hide (keyboard, splash) hits deprecated UIApplication
    // status bar APIs, which log and do nothing on iOS 27.
    BOOL applyIos12StatusBarWorkaround = YES;
    if (@available(iOS 13.0, *)) {
      applyIos12StatusBarWorkaround = NO;
    }
    if (applyIos12StatusBarWorkaround) {
      [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(showFullScreenVideoStatusBars)
                                                   name:UIWindowDidBecomeVisibleNotification
                                                 object:nil];

      [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(hideFullScreenVideoStatusBars)
                                                   name:UIWindowDidBecomeHiddenNotification
                                                 object:nil];
    }`,
  ],
  [
    `-(void)showFullScreenVideoStatusBars
{
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  if (!_autoManageStatusBarEnabled) {
    return;
  }`,
    `-(void)showFullScreenVideoStatusBars
{
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  if (@available(iOS 13.0, *)) {
    return;
  }
  if (!_autoManageStatusBarEnabled) {
    return;
  }`,
  ],
  [
    `-(void)hideFullScreenVideoStatusBars
{
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  if (!_autoManageStatusBarEnabled) {
    return;
  }`,
    `-(void)hideFullScreenVideoStatusBars
{
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  if (@available(iOS 13.0, *)) {
    return;
  }
  if (!_autoManageStatusBarEnabled) {
    return;
  }`,
  ],
];

let next = source;
for (const [from, to] of replacements) {
  if (!next.includes(from)) {
    console.warn('[patch-webview-statusbar] expected snippet missing; left file unchanged.');
    process.exit(0);
  }
  next = next.replace(from, to);
}

fs.writeFileSync(target, next);
console.log('[patch-webview-statusbar] skipped deprecated UIApplication status bar calls on iOS 13+.');
