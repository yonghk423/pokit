import { useIsFocused } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  isStoryRoutinePayload,
  StoryRoutineImportSheet,
  type StoryRoutineArticle,
} from '@features/story-routine-import';
import { useTranslation } from '@shared/lib/i18n';
import { WebViewScreen } from '@shared/ui/web-view';

import {
  POKIT_STORY_ALLOWED_HOST_SUFFIXES,
  resolvePokitStoryUrl,
} from '../config/pokitStoryUrl';
import { PokitStoryWebViewProgressLoader } from './PokitStoryWebViewProgressLoader';

/** POKIT 공식 웹사이트(pokitstory.com) WebView 탭 + 루틴 추가 브릿지 */
export function PokitStoryPage() {
  const isFocused = useIsFocused();
  const { locale } = useTranslation();
  const storyUri = resolvePokitStoryUrl(locale);
  const [sheetArticle, setSheetArticle] = useState<StoryRoutineArticle | null>(null);

  const handleWebMessage = useCallback((data: unknown) => {
    if (isStoryRoutinePayload(data)) {
      setSheetArticle(data.article);
    }
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetArticle(null);
  }, []);

  return (
    <>
      {isFocused ? (
        <WebViewScreen
          uri={storyUri}
          allowedHostSuffixes={POKIT_STORY_ALLOWED_HOST_SUFFIXES}
          onMessage={handleWebMessage}
          renderInitialLoading={(progress) => (
            <PokitStoryWebViewProgressLoader progress={progress} />
          )}
        />
      ) : (
        <View style={styles.placeholder} collapsable={false} />
      )}
      <StoryRoutineImportSheet
        visible={isFocused && sheetArticle !== null}
        article={sheetArticle}
        onClose={handleSheetClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
  },
});
