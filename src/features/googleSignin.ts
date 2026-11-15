import { Platform } from 'react-native';
let configured = false;
export function googleSdk() {
  if (Platform.OS === 'web') throw new Error('Google 백업은 iPhone과 Android 앱에서 사용할 수 있어요.');
  // Lazy loading allows the settings screen to work in builds without the native module.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module may be absent in an older installed build
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    if (!configured) GoogleSignin.configure({ scopes: [], iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
    configured = true;
    return GoogleSignin;
  } catch { throw new Error('Google 연결 모듈을 포함해 앱을 다시 빌드해 주세요.'); }
}
