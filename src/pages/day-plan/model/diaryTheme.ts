import { proPhotoWallDimensions } from './proPhotoWallArtwork';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { diaryImages, installDiaryItem } from '../lib/calendarStoreDownload';
import { proDiaryCatalog } from './proDiaryCatalog';
import { classicDiaryCatalog } from './classicDiaryCatalog';

export type DiaryItem = typeof proDiaryCatalog[number] | typeof classicDiaryCatalog[number];
export type ThemeSlot = DiaryItem['category'];
export const categoryNames: Record<ThemeSlot, [string, string]> = {
  frame: ['사진틀','Frames'], camera: ['카메라','Cameras'], trash: ['휴지통','Bins'], tab: ['탭 장식','Tab decor'],
  date: ['날짜 장식','Date decor'], mark: ['책갈피','Bookmarks'], memo: ['메모지','Memo paper'],
  corner: ['사진 코너','Photo corners'], pin: ['핀과 씰','Pins and seals'],
  charm: ['사진 참','Photo charms'], pocket: ['포켓','Pockets'],
  clip: ['집게','Clips'], photoWall: ['포토월','Photo walls'],
};
const frameReplacements: Record<string, string> = {"decor-cat-frame": "print-border-cat", "decor-shell-frame": "print-border-shell", "decor-chick-frame": "print-border-chick", "decor-ribbon-frame": "print-border-ribbon", "decor-berry-frame": "print-border-berry", "decor-stamp-frame": "print-border-stamp"};
const dateReplacements: Record<string, string> = {"mini-bunny-date": "date-label-bunny", "mini-toast-date": "date-label-toast", "mini-clover-date": "date-label-clover"};
const tabReplacements: Record<string, string> = {"decor-cat-tab": "tab-label-cat", "decor-shell-tab": "tab-label-shell", "decor-chick-tab": "tab-label-chick", "decor-ribbon-tab": "tab-label-ribbon", "decor-berry-tab": "tab-label-berry", "decor-stamp-tab": "tab-label-stamp", "mini-bunny-tab": "tab-label-bunny", "mini-clover-tab": "tab-label-clover"};
const key = 'pokit:diary-theme-items';
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
type Selection = Partial<Record<ThemeSlot, string>>;
function read(): Selection { return localStorageClient.getJson<Selection>(key) ?? {}; }
export function applyTheme(item: DiaryItem | null, slot: ThemeSlot) {
  const free = item && classicDiaryCatalog.some(entry => entry.id === item.id && entry.category === slot);
  if (item && (item.category !== slot || (!free && (!selectCanTestProStoreItems(useSubscriptionStore.getState()) || !diaryImages(item.id)?.image)))) return;
  const selection = read();
  if (item && slot === 'mark') delete selection.clip;
  if (item && slot === 'clip') delete selection.mark;
  if (item) selection[slot] = item.id;
  else delete selection[slot];
  localStorageClient.setJson(key, selection);
  listeners.forEach(listener => listener());
}
export function useDiaryTheme(slot: ThemeSlot) {
  const pro = useSubscriptionStore(selectCanTestProStoreItems);
  const snapshot = () => {
    const saved = read()[slot];
    return saved ? (slot === 'tab' ? tabReplacements[saved] : slot === 'date' ? dateReplacements[saved] : slot === 'frame' ? frameReplacements[saved] : undefined) ?? saved : saved;
  };
  const saved = useSyncExternalStore(subscribe, snapshot, snapshot);
  const classic = classicDiaryCatalog.find(item => item.id === saved && item.category === slot);
  const id = saved && (proDiaryCatalog.some(i => i.id === saved && i.category === slot) ? saved : 'decor-' + saved + '-' + slot);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!pro || !id || !proDiaryCatalog.some(item => item.id === id && item.category === slot)) return;
    let live = true;
    void installDiaryItem(id).then(() => { if (live) refresh(value => value + 1); }).catch(() => {});
    return () => { live = false; };
  }, [pro, id, slot]);
  const uri = pro && id ? diaryImages(id)?.image : undefined;
  return classic ? { id: classic.id, source: classic.preview } : uri ? { id, source: { uri, ...(id ? proPhotoWallDimensions[id] : undefined) } } : undefined;
}
