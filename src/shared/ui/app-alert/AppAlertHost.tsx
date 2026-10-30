import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  findNodeHandle,
  Keyboard,
  Modal as NativeModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeAlertScope, useAppAlertStore, type AppAlertRequest } from '@shared/lib/app-alert';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';

function PaperAlert({ request, onPress, onDismiss }: {
  request: AppAlertRequest;
  onPress: (index: number) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const titleRef = useRef<View>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const buttons = request.buttons.length ? request.buttons : [{ text: t('common.confirm') }];
  const horizontal = request.options?.buttonLayout === 'horizontal';
  const stacked = request.options?.buttonLayout === 'vertical' || (!horizontal && buttons.length > 2);
  const destructive = buttons.some((button) => button.style === 'destructive');
  const primaryIndex = buttons.reduce((index, button, i) => button.style !== 'cancel' ? i : index, -1);
  const paper = isDark ? '#292B34' : '#FBFAF6';
  const ink = isDark ? '#F4F1E9' : '#252725';
  const muted = isDark ? '#C5C6C2' : '#62655F';
  const line = isDark ? '#A8ABA4' : '#6C7069';
  const danger = isDark ? '#FFB4A8' : '#AE423B';

  useEffect(() => {
    Keyboard.dismiss();
    const animation = Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true });
    animation.start();
    const frame = requestAnimationFrame(() => {
      const handle = findNodeHandle(titleRef.current);
      if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => { animation.stop(); cancelAnimationFrame(frame); back.remove(); };
  }, [onDismiss, opacity, request.id]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity, paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom) }]}
      accessibilityViewIsModal
      importantForAccessibility="yes">
      <Pressable
        style={StyleSheet.absoluteFill}
        accessible={false}
        onPress={() => { tapHaptic(); onDismiss(); }}
      />
      <Animated.View style={[
        styles.panel,
        {
          width: Math.min(384, Math.max(0, width - 40)),
          maxHeight: Math.max(120, height - Math.max(24, insets.top) - Math.max(24, insets.bottom)),
          backgroundColor: paper,
          transform: [{ scale: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
        },
      ]}>
        <PaperGrain opacity={isDark ? 0.12 : 0.42} />
        <HanddrawnFrame color={line} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          bounces={false}
          keyboardShouldPersistTaps="always">
          <View style={[styles.accent, { backgroundColor: destructive ? danger : '#8BBFBA' }]} />
          <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={request.title}>
            <ThemedText lineBreakStrategyIOS="hangul-word" style={[styles.title, { color: ink }]}>{request.title}</ThemedText>
          </View>
          {request.message ? <ThemedText lineBreakStrategyIOS="hangul-word" style={[styles.message, { color: muted }]}>{request.message}</ThemedText> : null}
          <View style={[styles.actions, stacked && styles.actionsStack, horizontal && styles.actionsHorizontal]}>
            {buttons.map((button, index) => {
              const isDanger = button.style === 'destructive';
              const primary = index === primaryIndex && button.style !== 'cancel';
              const fill = isDanger
                ? isDark ? '#4A302F' : '#F9E7E2'
                : primary ? isDark ? '#274E4B' : '#D2E9E2' : paper;
              const color = isDanger ? danger : ink;
              return (
                <Pressable
                  key={`${request.id}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={button.text ?? t('common.confirm')}
                  onPress={() => { tapHaptic(isDanger ? 'warn' : button.style === 'cancel' ? 'press' : 'confirm'); onPress(index); }}
                  style={({ pressed }) => [
                    styles.button,
                    stacked && styles.buttonStack,
                    horizontal && styles.buttonHorizontal,
                    { backgroundColor: fill, opacity: pressed ? 0.68 : 1 },
                  ]}>
                  <PaperGrain opacity={0.25} />
                  <HanddrawnFrame color={isDanger ? danger : line} bold={primary || isDanger} />
                  <ThemedText lineBreakStrategyIOS="hangul-word" style={[styles.buttonText, { color }]}>{button.text ?? t('common.confirm')}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

/** Native root dialogs must finish dismissing before a callback can present another native sheet. */
function RootAlertHost() {
  const request = useAppAlertStore((state) => state.queue[0]);
  const scopes = useAppAlertStore((state) => state.scopes);
  const [closing, setClosing] = useState(false);
  const completionRef = useRef<(() => void) | null>(null);
  const resumeFrameRef = useRef<number | null>(null);
  const visible = Boolean(request) && activeAlertScope(scopes) === 'root' && !closing;
  const afterClose = useCallback((action: () => void) => {
    completionRef.current = action;
    setClosing(true);
  }, []);
  const finishClose = useCallback(() => {
    const action = completionRef.current;
    completionRef.current = null;
    action?.();
    // Modal scopes opened by the callback must register before another queued root alert appears.
    if (resumeFrameRef.current != null) cancelAnimationFrame(resumeFrameRef.current);
    resumeFrameRef.current = requestAnimationFrame(() => { resumeFrameRef.current = null; setClosing(false); });
  }, []);
  useEffect(() => () => {
    if (resumeFrameRef.current != null) cancelAnimationFrame(resumeFrameRef.current);
  }, []);
  const press = useCallback((index: number) => {
    if (request) useAppAlertStore.getState().press(request.id, index, Platform.OS === 'ios' ? afterClose : undefined);
  }, [afterClose, request]);
  const dismiss = useCallback(() => {
    if (request) useAppAlertStore.getState().dismiss(request.id, Platform.OS === 'ios' ? afterClose : undefined);
  }, [afterClose, request]);
  return (
    <NativeModal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={dismiss} onDismiss={finishClose}>
      {visible && request ? <PaperAlert key={request.id} request={request} onPress={press} onDismiss={dismiss} /> : null}
    </NativeModal>
  );
}

function InlineAlertHost({ scopeId }: { scopeId: string }) {
  const request = useAppAlertStore((state) => state.queue[0]);
  const scopes = useAppAlertStore((state) => state.scopes);
  const press = useCallback((index: number) => {
    if (request) useAppAlertStore.getState().press(request.id, index);
  }, [request]);
  const dismiss = useCallback(() => {
    if (request) useAppAlertStore.getState().dismiss(request.id);
  }, [request]);
  if (!request || activeAlertScope(scopes) !== scopeId) return null;
  return <PaperAlert key={request.id} request={request} onPress={press} onDismiss={dismiss} />;
}

export function AppAlertHost({ scopeId }: { scopeId: string }) {
  return scopeId === 'root' ? <RootAlertHost /> : <InlineAlertHost scopeId={scopeId} />;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(22,25,24,0.36)' },
  panel: { shadowColor: '#171B18', shadowOpacity: 0.18, shadowOffset: { width: 3, height: 5 }, shadowRadius: 7, elevation: 12 },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  accent: { width: 28, height: 4, transform: [{ rotate: '-2deg' }] },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  message: { fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  actionsHorizontal: { flexWrap: 'nowrap' },
  buttonHorizontal: { flex: 1, minWidth: 0, paddingHorizontal: 5 },
  actionsStack: { flexDirection: 'column', alignItems: 'stretch' },
  button: { minWidth: 84, minHeight: 46, maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 1 },
  buttonStack: { alignSelf: 'stretch' },
  buttonText: { fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
});
