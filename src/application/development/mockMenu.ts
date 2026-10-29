import { DevSettings } from 'react-native';
import { getAppLocale } from '@shared/lib/i18n';
import { getDevelopmentStorageProfile, setDevelopmentStorageProfile, flushLocalStorageClientWrites, clearPokitLocalStorage, localStorageClient, type DevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { COMIC_DIARY_STORAGE_KEY } from '@pages/day-plan/lib/heroDiaryStorage';
import { addDevelopmentColorMockData, ensureDevelopmentMockData } from './mockData';
let registered = false;
let switching = false;
const DEVELOPMENT_PROFILES: DevelopmentStorageProfile[] = ['ko', 'en', 'ja', 'zh-TW'];

async function switchProfile(profile: DevelopmentStorageProfile | null, reset = false, colorSamples = false) {
  if (!__DEV__ || switching) return;
  switching = true;
  try {
    await flushLocalStorageClientWrites();
    setDevelopmentStorageProfile(profile);
    if (profile) { if (reset) await clearPokitLocalStorage(); ensureDevelopmentMockData(reset); }
    if (profile && colorSamples) addDevelopmentColorMockData();
    await flushLocalStorageClientWrites();
    DevSettings.reload();
  } finally { switching = false; }
}

async function addColorSamplesForAllLanguages() {
  if (!__DEV__ || switching) return;
  switching = true;
  const profileToRestore = getDevelopmentStorageProfile() ?? getAppLocale();
  try {
    await flushLocalStorageClientWrites();
    for (const profile of DEVELOPMENT_PROFILES) {
      setDevelopmentStorageProfile(profile);
      const library = localStorageClient.getJson<{ diaries?: unknown[] }>(COMIC_DIARY_STORAGE_KEY);
      if (!Array.isArray(library?.diaries) || library.diaries.length === 0) ensureDevelopmentMockData();
      addDevelopmentColorMockData();
      await flushLocalStorageClientWrites();
    }
    setDevelopmentStorageProfile(profileToRestore);
    await flushLocalStorageClientWrites();
    DevSettings.reload();
  } finally {
    if (getDevelopmentStorageProfile() !== profileToRestore) {
      setDevelopmentStorageProfile(profileToRestore);
      await flushLocalStorageClientWrites();
    }
    switching = false;
  }
}

export function registerDevelopmentMockMenu() {
  if (!__DEV__ || registered) return;
  registered = true;
  const items = [
    { name: '목업 데이터 · 한국어', callback: () => { void switchProfile('ko'); }, shouldCollapse: true },
    { name: 'Mock data · English', callback: () => { void switchProfile('en'); }, shouldCollapse: true },
    { name: 'モックデータ · 日本語', callback: () => { void switchProfile('ja'); }, shouldCollapse: true },
    { name: '模擬資料 · 繁體中文', callback: () => { void switchProfile('zh-TW'); }, shouldCollapse: true },
    { name: '컬러 목업 추가 · 모든 언어 · Add all languages', callback: () => { void addColorSamplesForAllLanguages(); }, shouldCollapse: true },
    { name: '목업 수정 내용 초기화 · Reset mock edits', callback: () => { const profile = getDevelopmentStorageProfile(); if (profile) void switchProfile(profile, true); }, shouldCollapse: true },
    { name: '목업 종료 · 내 데이터로 돌아가기', callback: () => { void switchProfile(null); }, shouldCollapse: true },
  ];
  items.forEach(item => DevSettings.addMenuItem(item.name, item.callback));
  // Expo development builds use their own menu, separate from React Native's.
  void import('expo-dev-menu').then(menu => menu.registerDevMenuItems(items)).catch(() => {
    // Plain React Native builds still have the DevSettings entries above.
  });
}
