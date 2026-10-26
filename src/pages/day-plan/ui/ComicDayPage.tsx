import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '../lib/heroDiaryStorage';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { loadComicCharacterName } from '../lib/heroCharacterName';
import { getLocalDateKey } from '@entities/day-plan';
import { useAppClockEpoch } from '@shared/lib/time/appClock';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DayPlanShellBackgroundContext, useDayPlanHeaderActions } from '../model/dayPlanHeaderActions';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { ComicDiaryMenuButton } from './HeroDiaryMenuButton';
import { IndependentComicPlanner, type ComicDiaryHandle } from './IndependentHeroPlanner';

/** 하단 탭 — 오늘의 주인공(만화 일기) 전용 화면 */
export function ComicDayPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const clockEpoch = useAppClockEpoch();
  const todayKey = useMemo(() => getLocalDateKey(), [clockEpoch]);
  const plannerRef = useRef<ComicDiaryHandle>(null);
  const [initialDiary] = useState(() => {
    const saved = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
    return Array.isArray(saved?.diaries) ? saved.diaries.find(diary => diary?.id === saved.activeId) ?? null : null;
  });
  const [diaryTitle, setDiaryTitle] = useState<string | null>(initialDiary?.title ?? null);
  const [characterName, setCharacterName] = useState<string | null>(() => {
    const character = COMIC_CHARACTERS.find(item => item.id === initialDiary?.characterId);
    return initialDiary?.characterName ?? (character ? loadComicCharacterName(character.id) ?? t(character.name) : null);
  });
  const registerHeaderActions = useDayPlanHeaderActions();
  const setShellBackground = useContext(DayPlanShellBackgroundContext);
  const { registerComicDiaryLight } = useDayPlanTabBridge();

  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const ink = tone.text;
  const muted = tone.textMuted;
  const surface = isDark ? tone.bg : '#F7F6F4';

  useEffect(() => {
    setShellBackground?.(isDark ? null : '#F7F6F4');
    registerComicDiaryLight(!isDark);
    return () => {
      setShellBackground?.(null);
      registerComicDiaryLight(false);
    };
  }, [isDark, setShellBackground, registerComicDiaryLight]);

  const headerLabel = t('comicDay.character.rename');
  const diaryLabel = t(diaryTitle ? 'comicDiary.rename' : 'comicDiary.library');
  const diaryHeading = diaryTitle ?? t('comicDiary.title');
  const header = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.headerMainRow}>
        <ComicDiaryMenuButton onPress={() => plannerRef.current?.openLibrary()} />
        <Pressable accessibilityRole="button" accessibilityLabel={diaryLabel} onPress={() => diaryTitle ? plannerRef.current?.renameDiary() : plannerRef.current?.openLibrary()} style={styles.diaryTitleHit}><ThemedText numberOfLines={1} style={{ color: ink, fontSize: 19, lineHeight: 27 }}>{diaryHeading}</ThemedText></Pressable>
      </View>
      {characterName ? (
        <View style={styles.characterRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={headerLabel} onPress={() => plannerRef.current?.renameCharacter()} style={styles.characterNameHit}>
            <ThemedText numberOfLines={1} style={[styles.title, { color: ink }]}>{characterName}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  ), [characterName, diaryTitle, diaryLabel, diaryHeading, headerLabel, ink]);
  useLayoutEffect(() => {
    registerHeaderActions?.(header);
  }, [registerHeaderActions, header]);
  useLayoutEffect(() => () => registerHeaderActions?.(null), [registerHeaderActions]);

  return (
    <View style={[styles.root, { backgroundColor: surface }]}>
      {!registerHeaderActions ? header : null}
      <IndependentComicPlanner
        ref={plannerRef}
        onOpenBag={() => router.push('/day-plan')}
        onTitleChange={setDiaryTitle}
        onCharacterNameChange={setCharacterName}
        hideCharacterHeading
        key={todayKey}
        date={todayKey}
        ink={ink}
        muted={muted}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: { minHeight: 70, flex: 1, justifyContent: 'center' },
  headerMainRow: { height: 44, flexDirection: 'row', alignItems: 'center' },
  diaryTitleHit: { minHeight: 44, flex: 1, minWidth: 0, justifyContent: 'center' },
  characterRow: { minHeight: 26, marginLeft: 42, marginRight: 8, flexDirection: 'row', alignItems: 'center' },
  characterNameHit: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontSize: 17, lineHeight: 23, textAlign: 'left' },
});
