import * as Application from 'expo-application';
import Constants from 'expo-constants';

/** 스토어에 표시되는 앱 마케팅 버전 (예: 1.4.2) */
export function getNativeAppVersion(): string | null {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
  if (!version || !version.trim()) return null;
  return version.trim();
}
