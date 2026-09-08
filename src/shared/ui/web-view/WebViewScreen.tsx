import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useThemeColor } from '@shared/lib/hooks/use-theme-color';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

type Props = {
  uri: string;
  allowedHostSuffixes?: readonly string[];
  onMessage?: (data: unknown) => void;
  /** 기본 true — 스토리 WebView 등에서 당겨서 새로고침 */
  pullToRefreshEnabled?: boolean;
  /** 첫 로딩 중 표시 UI — progress 0~100 */
  renderInitialLoading?: (progress: number) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

function isAllowedHost(url: string, allowedHostSuffixes: readonly string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowedHostSuffixes.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function shouldOpenExternally(url: string): boolean {
  return url.startsWith('mailto:') || url.startsWith('tel:');
}

export function WebViewScreen({
  uri,
  allowedHostSuffixes = [],
  onMessage,
  pullToRefreshEnabled = true,
  renderInitialLoading,
  style,
}: Props) {
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const backFace = isDark ? tone.surfaceAlt : '#FFFFFF';
  const backShadow = isDark ? tone.solidShadow : '#000000';
  const BACK_SHADOW = 2;

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setLoadProgress(0);
    webViewRef.current?.reload();
  }, []);

  const handleNavigationStateChange = useCallback((event: WebViewNavigation) => {
    setCanGoBack(event.canGoBack);
  }, []);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      const { url } = request;

      if (shouldOpenExternally(url)) {
        void Linking.openURL(url);
        return false;
      }

      if (allowedHostSuffixes.length === 0 || isAllowedHost(url, allowedHostSuffixes)) {
        return true;
      }

      void openBrowserAsync(url);
      return false;
    },
    [allowedHostSuffixes],
  );

  const handleGoBack = useCallback(() => {
    webViewRef.current?.goBack();
  }, []);

  const handleRefresh = useCallback(() => {
    if (hasError) {
      handleRetry();
      return;
    }
    setIsRefreshing(true);
    webViewRef.current?.reload();
  }, [hasError, handleRetry]);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setIsRefreshing(false);
    setHasLoadedOnce(true);
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      if (!onMessage) return;
      try {
        const parsed = JSON.parse(event.nativeEvent.data);
        onMessage(parsed);
      } catch {
        /* invalid JSON — ignore */
      }
    },
    [onMessage],
  );

  return (
    <ThemedView style={[styles.container, style]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {canGoBack ? (
          <View style={styles.toolbar}>
            <View
              style={[
                styles.backShell,
                { marginRight: BACK_SHADOW, marginBottom: BACK_SHADOW },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.backShadow,
                  {
                    backgroundColor: backShadow,
                    transform: [{ translateX: BACK_SHADOW }, { translateY: BACK_SHADOW }],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                onPress={handleGoBack}
                style={[styles.backButton, { backgroundColor: backFace }]}>
                <ThemedText style={[styles.backLabel, { color: tone.text }]}>
                  {t('common.back')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {hasError ? (
          <View style={[styles.errorContainer, { backgroundColor: tone.bg }]}>
            <ThemedText style={[styles.errorTitle, { color: tone.text }]}>
              {t('webView.errorTitle')}
            </ThemedText>
            <ThemedText style={[styles.errorBody, { color: tone.textMuted }]}>
              {t('webView.errorBody')}
            </ThemedText>
            <BrutalConfirmButton
              label={t('common.retry')}
              accessibilityLabel={t('common.retry')}
              onPress={handleRetry}
            />
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri }}
            style={[styles.webView, { backgroundColor }]}
            originWhitelist={['https://*', 'http://*']}
            pullToRefreshEnabled={pullToRefreshEnabled}
            refreshControl={
              pullToRefreshEnabled && Platform.OS === 'android' ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
              ) : undefined
            }
            onLoadStart={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            onLoadProgress={({ nativeEvent }) => {
              const next = Math.round(nativeEvent.progress * 100);
              setLoadProgress((prev) => Math.max(prev, next));
            }}
            onLoadEnd={handleLoadEnd}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onHttpError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onMessage={onMessage ? handleMessage : undefined}
            startInLoadingState
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
          />
        )}

        {isLoading && !hasError && !hasLoadedOnce ? (
          <View
            style={
              renderInitialLoading ? styles.loadingOverlayFill : styles.loadingOverlayCentered
            }
            pointerEvents="none">
            {renderInitialLoading ? (
              renderInitialLoading(loadProgress)
            ) : (
              <ActivityIndicator size="large" color={tintColor} />
            )}
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backShell: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  backShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 1,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  webView: {
    flex: 1,
  },
  loadingOverlayFill: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlayCentered: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  errorBody: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});
