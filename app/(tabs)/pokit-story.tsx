import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { PokitStoryPage } from '@pages/pokit-story';
import { useDayPlanTabBridge } from '@pages/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { NativeTabContent } from '@shared/ui/native-tab-content';

export default function PokitStoryTab() {
  const { registerStoryWebLight } = useDayPlanTabBridge();
  const isDark = useColorScheme() === 'dark';
  const [initialLoading, setInitialLoading] = useState(true);
  const storyTabLight = initialLoading && !isDark;
  useFocusEffect(useCallback(() => {
    registerStoryWebLight(storyTabLight);
    return () => registerStoryWebLight(false);
  }, [registerStoryWebLight, storyTabLight]));
  return (
    <NativeTabContent chromeColor={storyTabLight ? '#F7F6F4' : undefined}>
      <PokitStoryPage onInitialLoadingChange={setInitialLoading} />
    </NativeTabContent>
  );
}
