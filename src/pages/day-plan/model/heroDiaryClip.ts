import { applyTheme } from './diaryTheme';
import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
export type DiaryClip = keyof typeof DIARY_CLIP_IMAGES;
const KEY = 'yourday:diary-clip';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = (): DiaryClip => {
  const saved = localStorageClient.getJson(KEY);
  return DIARY_CLIPS.some(clip => clip.id === saved) ? saved as DiaryClip : 'blue';
};
export function useHeroDiaryClip() { return useSyncExternalStore(subscribe, read, read); }
export function applyHeroDiaryClip(clip: DiaryClip) { applyTheme(null, 'clip'); localStorageClient.setJson(KEY, clip); listeners.forEach(listener => listener()); }
export const DIARY_CLIP_IMAGES = {
  'purple': require('../../../../assets/pro-store-previews/vivid-purple-clipboard-clip.webp'),
  'burgundy': require('../../../../assets/pro-store-previews/vivid-burgundy-clipboard-clip.webp'),
  'emerald': require('../../../../assets/pro-store-previews/vivid-emerald-clipboard-clip.webp'),
  'golden-yellow': require('../../../../assets/pro-store-previews/vivid-golden-yellow-clipboard-clip.webp'),
  'orange': require('../../../../assets/pro-store-previews/vivid-orange-clipboard-clip.webp'),
  'vivid-pink': require('../../../../assets/pro-store-previews/vivid-pink-clipboard-clip.webp'),
  lavender: require('../../../../assets/pro-store-previews/pastel-lavender-clipboard-clip.webp'),
  sky: require('../../../../assets/pro-store-previews/pastel-sky-clipboard-clip.webp'),
  mint: require('../../../../assets/pro-store-previews/pastel-mint-clipboard-clip.webp'),
  yellow: require('../../../../assets/pro-store-previews/pastel-yellow-clipboard-clip.webp'),
  peach: require('../../../../assets/pro-store-previews/pastel-peach-clipboard-clip.webp'),
  pink: require('../../../../assets/pro-store-previews/pastel-pink-clipboard-clip.webp'),
  blue: require('../../../../assets/control-illustrations/blue-clipboard-clip.png'),
  red: require('../../../../assets/control-illustrations/red-clipboard-clip.png'),
  black: require('../../../../assets/control-illustrations/black-clipboard-clip.png'),
};

export const DIARY_CLIPS: { id: DiaryClip; name: string; english: string; pro: boolean }[] = [
  { id: 'blue', name: '파란 집게', english: 'Blue Clip', pro: false },
  { id: 'black', name: '검은 집게', english: 'Black Clip', pro: false },
  { id: 'red', name: '빨간 집게', english: 'Red Clip', pro: false },
  { id: 'pink', name: '베이비 핑크', english: 'Baby Pink', pro: true },
  { id: 'peach', name: '피치', english: 'Peach', pro: true },
  { id: 'yellow', name: '버터 옐로', english: 'Butter Yellow', pro: true },
  { id: 'mint', name: '민트', english: 'Mint', pro: true },
  { id: 'sky', name: '스카이 블루', english: 'Sky Blue', pro: true },
  { id: 'lavender', name: '라벤더', english: 'Lavender', pro: true },
  { id: 'vivid-pink', name: '라즈베리 핑크', english: 'Raspberry Pink', pro: true },
  { id: 'orange', name: '탠저린 오렌지', english: 'Tangerine Orange', pro: true },
  { id: 'golden-yellow', name: '선플라워 옐로', english: 'Sunflower Yellow', pro: true },
  { id: 'emerald', name: '에메랄드', english: 'Emerald', pro: true },
  { id: 'burgundy', name: '딥 버건디', english: 'Deep Burgundy', pro: true },
  { id: 'purple', name: '바이올렛', english: 'Violet', pro: true },
];
