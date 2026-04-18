import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** 공식 문의 메일 (고객센터) */
export const SUPPORT_EMAIL = 'pokit.app.help@gmail.com';

/** 네이티브 메일 작성 화면 제목 (앱 표시명: POKIT) */
export function getSupportMailSubject(): string {
  return '[POKIT 고객센터]';
}

/**
 * 메일 본문: 문의 안내 + 기기/OS/앱 버전 (고객센터 대응용)
 * 참고 앱과 동일하게 진단 줄을 먼저 채움.
 */
export function getSupportMailBody(): string {
  const deviceLine = (() => {
    if (Platform.OS === 'ios') {
      const id = Device.modelId;
      const name = Device.modelName;
      if (id && name) return `${name} (${id})`;
      if (id) return id;
      return name ?? '—';
    }
    if (Platform.OS === 'android') {
      return [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || '—';
    }
    return Device.modelName ?? '—';
  })();

  const osName = Device.osName ?? (Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS);
  const osVer = Device.osVersion ?? String(Platform.Version);

  const appVer =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';

  return [
    '문의 내용을 아래에 적어 주세요.',
    '',
    `기기: ${deviceLine}`,
    `OS 버전: ${osName} ${osVer}`,
    `App 버전: ${appVer}`,
  ].join('\n');
}

/** 설정 화면에 표시할 앱 버전 문자열 (사용자에게 보이는 버전만) */
export function getDisplayedAppVersionLabel(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';
}
