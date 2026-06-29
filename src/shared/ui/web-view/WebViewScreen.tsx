import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { useThemeColor } from '@shared/lib/hooks/use-theme-color';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

type Props = {
  uri: string;
  allowedHostSuffixes?: readonly string[];
  onMessage?: (data: unknown) => void;
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

export function WebViewScreen({ uri, allowedHostSuffixes = [], onMessage, style }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로"
              onPress={handleGoBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <ThemedText type="defaultSemiBold">뒤로</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.errorContainer}>
            <ThemedText type="subtitle" style={styles.errorTitle}>
              페이지를 불러올 수 없어요
            </ThemedText>
            <ThemedText style={styles.errorBody}>
              네트워크 연결을 확인한 뒤 다시 시도해 주세요.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: tintColor },
                pressed && styles.retryButtonPressed,
              ]}>
              <ThemedText lightColor="#FFFFFF" darkColor="#151718" type="defaultSemiBold">
                다시 시도
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri }}
            style={[styles.webView, { backgroundColor }]}
            originWhitelist={['https://*', 'http://*']}
            onLoadStart={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setIsLoading(false)}
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

        {isLoading && !hasError ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={tintColor} />
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
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
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
  },
  errorBody: {
    textAlign: 'center',
    opacity: 0.72,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
});
