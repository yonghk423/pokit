import { clearDailyRhythmOnboardingCompleted } from './dailyMateOnboardingStorage';
import { clearReadingBookstoreTapGuide } from './readingBookstoreTapGuideStorage';
import { clearPokitLocalStorage, flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { HERO_THUMBNAIL_STRIP_KEY } from './heroThumbnailStripStorage';
import { initializeHeroCardEditHint } from './heroCardEditHintStorage';
import { notifyHeroInfoHintReset } from './heroInfoHintStorage';

/** AI 일러스트 보관함과 썸네일 표시 설정을 보존하고 앱 데이터를 초기화합니다. */
export async function resetAppLocalData(): Promise<void> {
  const thumbnailPreference = localStorageClient.getItemRaw(HERO_THUMBNAIL_STRIP_KEY);
  // Keep the independent AI collection, including captions and explicit deletions.
  const preserved = new Map<string, string>();
  for (const key of localStorageClient.listKeys()) {
    if (key.startsWith('pokit:hero-ai-caption:') || key === 'pokit:hero-ai-library-deleted:v1' || key === 'pokit:comic-character-name:generated-illustrations') {
      const value = localStorageClient.getItemRaw(key);
      if (value !== null) preserved.set(key, value);
    }
  }
  // Older illustrations recover their captions from diaries. Keep those captions
  // before the diary records are cleared, without overwriting the original index.
  const library = localStorageClient.getJson<{ diaries?: { createdAt?: number; scenes?: { artworkUri?: string; title?: string; memo?: string }[] }[] }>('pokit:comic-diaries:v1');
  for (const diary of library?.diaries ?? []) {
    for (const scene of diary.scenes ?? []) {
      const filename = scene.artworkUri?.split('/').pop();
      if (!filename || !/^hero-[a-zA-Z0-9-]+-\d+\.png$/.test(filename)) continue;
      const key = `pokit:hero-ai-caption:${filename}`;
      if (!preserved.has(key)) preserved.set(key, JSON.stringify({ title: scene.title, memo: scene.memo, createdAt: diary.createdAt }));
    }
  }
  await clearPokitLocalStorage();
  for (const [key, value] of preserved) localStorageClient.setItemRaw(key, value);
  if (thumbnailPreference !== null) localStorageClient.setItemRaw(HERO_THUMBNAIL_STRIP_KEY, thumbnailPreference);
  notifyHeroInfoHintReset();
  // clearPokitLocalStorage 이후에도 세션 래치가 남으면 온보딩이 다시 안 뜬다
  clearDailyRhythmOnboardingCompleted();
  clearReadingBookstoreTapGuide();
  // Opt back into the hint before Settings saves the fresh default day plan.
  initializeHeroCardEditHint();
  await flushLocalStorageClientWrites();
}
