import { HeroHistoryPackets } from './HeroHistoryPackets';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { t as translate, useTranslation } from '@shared/lib/i18n';
import { loadComicDiaryLibrary, saveComicDiaryLibrary, updateComicDiary, deleteComicDiaries, type ComicDiaryLibrary as Library } from '../lib/heroDiaryStorage';

/** Persistent tab surface; reuses the full history search and management controls. */
export function HeroDiaryHistoryPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const date = getLocalDateKey(useTodayDate());
  const [library, setLibrary] = useState<Library | null>(null);
  const readLatest = useCallback(() => loadComicDiaryLibrary(date, number => translate('comicDiary.defaultTitle', locale, { number })), [date, locale]);
  useFocusEffect(useCallback(() => { setLibrary(readLatest()); }, [readLatest]));
  const commit = (next: Library) => { saveComicDiaryLibrary(next); setLibrary(next); };
  if (!library) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F7F6F4' }}><ActivityIndicator color="#555A4F" /></View>;
  return <HeroHistoryPackets diaries={library.diaries} onCreate={() => router.navigate({ pathname: '/(tabs)', params: { historyCreate: String(Date.now()) } })} onDeleteMany={ids => commit(deleteComicDiaries(readLatest(), ids))} onRemoveScenes={entries => {
    let latest = readLatest();
    for (const diaryId of new Set(entries.map(entry => entry.diaryId))) {
      const diary = latest.diaries.find(item => item.id === diaryId);
      if (!diary) continue;
      const removed = new Set(entries.filter(entry => entry.diaryId === diaryId).map(entry => entry.sceneId));
      latest = updateComicDiary(latest, diaryId, { scenes: diary.scenes.filter(scene => !removed.has(scene.id)) });
    }
    commit(latest);
  }} onUpdateScene={(diaryId, sceneId, text) => {
    const latest = readLatest();
    const diary = latest.diaries.find(item => item.id === diaryId);
    if (!diary) return;
    commit(updateComicDiary(latest, diaryId, { scenes: diary.scenes.map(scene => scene.id === sceneId ? { ...scene, ...text } : scene) }));
  }} />;
}
