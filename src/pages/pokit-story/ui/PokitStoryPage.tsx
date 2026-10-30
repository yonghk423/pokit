import { useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { useTranslation } from '@shared/lib/i18n';
import { WebViewScreen } from '@shared/ui/web-view';

import {
  POKIT_STORY_ALLOWED_HOST_SUFFIXES,
  resolvePokitStoryUrl,
} from '../config/pokitStoryUrl';
import { PokitStoryWebViewProgressLoader } from './PokitStoryWebViewProgressLoader';

/** Your Day 일기·메모 콘텐츠만 여는 앱 내 WebView 탭 */
export function PokitStoryPage({ onInitialLoadingChange }: { onInitialLoadingChange?: (loading: boolean) => void }) {
  const isFocused = useIsFocused();
  const isDark = useColorScheme() === 'dark';
  const pageBg = isDark ? '#262B28' : '#F7F6F4';
  const { locale } = useTranslation();
  const storyUri = resolvePokitStoryUrl(locale);

  return (
    <>
      {isFocused ? (
        <WebViewScreen
          style={{ backgroundColor: pageBg }}
          uri={storyUri}
          allowedHostSuffixes={POKIT_STORY_ALLOWED_HOST_SUFFIXES}
          onInitialLoadingChange={onInitialLoadingChange}
          renderInitialLoading={(progress) => (
            <PokitStoryWebViewProgressLoader progress={progress} />
          )}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: pageBg }]} collapsable={false} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
  },
});
