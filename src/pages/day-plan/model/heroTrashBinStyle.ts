import { BASIC_STORE_THUMBNAILS } from '../lib/basicStoreThumbnails';
import { applyTheme } from './diaryTheme';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { TRASH_ASSETS, type TrashBinStyle } from '@shared/ui/icon-symbol/TrashIcon';

const KEY = 'yourday:diary-trash-bin-style';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = (): TrashBinStyle => {
  const saved = localStorageClient.getJson(KEY);
  return typeof saved === 'string' && Object.prototype.hasOwnProperty.call(TRASH_ASSETS, saved)
    ? saved as TrashBinStyle
    : 'mesh';
};

export const isProTrashBinStyle = (style: TrashBinStyle) => style !== 'mesh' && style !== 'ivory' && style !== 'sage';

export function useHeroTrashBinStyle() {
  const style = useSyncExternalStore(subscribe, read, read);
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  return !isPro && isProTrashBinStyle(style) ? 'mesh' : style;
}

export function applyHeroTrashBinStyle(style: TrashBinStyle) {
  if (isProTrashBinStyle(style) && !selectCanTestProStoreItems(useSubscriptionStore.getState())) return;
  applyTheme(null, 'trash');
  localStorageClient.setJson(KEY, style);
  listeners.forEach(listener => listener());
}

export const HERO_TRASH_BIN_PREVIEWS = {
  ...TRASH_ASSETS,
  mesh: { empty: BASIC_STORE_THUMBNAILS['trash-mesh-empty'], filled: BASIC_STORE_THUMBNAILS['trash-mesh-filled'] },
  ivory: { empty: BASIC_STORE_THUMBNAILS['trash-ivory-empty'], filled: BASIC_STORE_THUMBNAILS['trash-ivory-filled'] },
  sage: { empty: BASIC_STORE_THUMBNAILS['trash-sage-empty'], filled: BASIC_STORE_THUMBNAILS['trash-sage-filled'] },
};

export const HERO_TRASH_BIN_ITEMS: { id: TrashBinStyle; ko: string; en: string }[] = [
  { id: 'mesh', ko: '메쉬 휴지통', en: 'Mesh wastebasket' },
  { id: 'ivory', ko: '아이보리 도자기', en: 'Ivory ceramic' },
  { id: 'sage', ko: '세이지 에나멜', en: 'Sage enamel' },
  { id: 'rattan', ko: '라탄', en: 'Rattan' },
  { id: 'walnut', ko: '월넛 우드', en: 'Walnut wood' },
  { id: 'leather', ko: '브라운 가죽', en: 'Brown leather' },
  { id: 'steel', ko: '스테인리스', en: 'Stainless steel' },
  { id: 'pink', ko: '연분홍 사각', en: 'Blush pink' },
  { id: 'charcoal', ko: '차콜 사각', en: 'Charcoal' },
  { id: 'ash', ko: '밝은 원목', en: 'Light wood' },
  { id: 'canvas', ko: '패브릭', en: 'Canvas' },
  { id: 'vintage', ko: '파우더 블루', en: 'Powder blue enamel' },
];
