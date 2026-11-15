import { applyTheme } from './diaryTheme';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type HeroCameraStyle = 'mini-evo' | 'mini-12' | 'polaroid-now' | 'kodak-mini-shot' | 'leica-sofort-2';

export const HERO_CAMERA_STORE_ITEMS: { id: HeroCameraStyle; name: { ko: string; en: string } }[] = [
  { id: 'mini-evo', name: { ko: '인스탁스 미니 에보', en: 'instax mini Evo' } },
  { id: 'mini-12', name: { ko: '인스탁스 미니 12', en: 'instax mini 12' } },
  { id: 'polaroid-now', name: { ko: 'Polaroid Now Gen 2', en: 'Polaroid Now Gen 2' } },
  { id: 'kodak-mini-shot', name: { ko: 'KODAK Mini Shot 3 Retro', en: 'KODAK Mini Shot 3 Retro' } },
  { id: 'leica-sofort-2', name: { ko: 'Leica SOFORT 2', en: 'Leica SOFORT 2' } },
];

export const HERO_CAMERA_IMAGES: Record<HeroCameraStyle, number> = {
  'mini-evo': require('../../../../assets/store-cameras/instax-mini-evo.png'),
  'mini-12': require('../../../../assets/pro-store-previews/instax-mini-12.webp'),
  'polaroid-now': require('../../../../assets/pro-store-previews/polaroid-now-gen2.webp'),
  'kodak-mini-shot': require('../../../../assets/pro-store-previews/kodak-mini-shot-3-retro.webp'),
  'leica-sofort-2': require('../../../../assets/pro-store-previews/leica-sofort-2.webp'),
};

const KEY = 'yourday:diary-camera-style';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = (): HeroCameraStyle => {
  const saved = localStorageClient.getJson(KEY);
  return HERO_CAMERA_STORE_ITEMS.some(camera => camera.id === saved) ? saved as HeroCameraStyle : 'mini-evo';
};

export const isProCameraStyle = (style: HeroCameraStyle) =>
  style === 'mini-12' || style === 'kodak-mini-shot';

export function useHeroCameraStyle() {
  const style = useSyncExternalStore(subscribe, read, read);
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  return !isPro && isProCameraStyle(style) ? 'mini-evo' : style;
}

export function applyHeroCameraStyle(style: HeroCameraStyle) {
  applyTheme(null, 'camera');
  localStorageClient.setJson(KEY, style);
  listeners.forEach(listener => listener());
}
