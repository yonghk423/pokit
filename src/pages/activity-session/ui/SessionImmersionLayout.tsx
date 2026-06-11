import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  backgroundColor?: string;
  accentColor: string;
  accentGlow: string;
  onSurface: string;
  muted: string;
  brand: string;
  aboutKicker: string;
  headerTitle: string;
  iconName: SymbolViewProps['name'];
  iconSize?: number;
  sessionKicker: string;
  timerDisplay: ReactNode;
  flowCaption: string;
  onBack: () => void;
  scrollBottomPadding: number;
  children: ReactNode;
  bottomBar: ReactNode;
};

export function SessionImmersionLayout({
  accentColor,
  onSurface,
  muted,
  headerTitle,
  iconName,
  iconSize = 26,
  sessionKicker,
  timerDisplay,
  flowCaption,
  onBack,
  scrollBottomPadding,
  children,
  bottomBar,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const ui = getGoalDetailSessionUi(isDark);
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <View style={[styles.screen, { backgroundColor: ui.screenBg }]}>
      <View style={[styles.flex, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: ui.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={styles.headerBtn}
            onPress={onBack}>
            <IconSymbol name="chevron.left" size={22} color={ui.primary} />
          </Pressable>
          <ThemedText
            style={styles.headerTitle}
            lightColor={onSurface}
            darkColor={onSurface}
            numberOfLines={1}>
            {headerTitle}
          </ThemedText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          bounces>
          <View style={[styles.summaryCard, { borderColor: ui.border, backgroundColor: ui.cardBg }]}>
            <IconSymbol name={iconName} size={iconSize} color={accentColor} />
            <View style={styles.summaryTexts}>
              <Text style={[styles.sessionKicker, { color: muted }]}>{sessionKicker}</Text>
              <View style={styles.timerSlot}>{timerDisplay}</View>
              <ThemedText style={styles.flowCaption} lightColor={muted} darkColor={muted} numberOfLines={3}>
                {flowCaption}
              </ThemedText>
            </View>
          </View>

          {children}
        </ScrollView>

        {bottomBar}
      </View>
    </View>
  );
}

type BottomProps = {
  accentColor: string;
  borderColor: string;
  paddingBottom: number;
  onEndSession: () => void;
  completeLabel?: string;
  completeForeground?: string;
  disabled?: boolean;
};

export function ImmersionBottomControls({
  accentColor,
  borderColor,
  paddingBottom,
  onEndSession,
  completeLabel = '완료',
  completeForeground,
  disabled = false,
}: BottomProps) {
  const isDark = useColorScheme() === 'dark';
  const ui = getGoalDetailSessionUi(isDark);
  const fg = completeForeground ?? ui.primaryOnAccent;

  return (
    <View style={[styles.bottomBar, { borderTopColor: borderColor, paddingBottom, backgroundColor: ui.screenBg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[
          styles.completeBtn,
          { backgroundColor: accentColor, shadowColor: isDark ? '#000' : accentColor },
          disabled ? { opacity: 0.45 } : null,
        ]}
        disabled={disabled}
        onPress={onEndSession}>
        <IconSymbol name="checkmark.circle.fill" size={20} color={fg} />
        <ThemedText style={[styles.completeBtnText, { color: fg }]}>{completeLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

export function ImmersionCardShell({
  borderColor,
  padded = true,
  children,
}: {
  borderColor: string;
  padded?: boolean;
  children: ReactNode;
}) {
  const isDark = useColorScheme() === 'dark';
  const ui = getGoalDetailSessionUi(isDark);

  return (
    <View style={[styles.cardShell, { borderColor, backgroundColor: ui.cardBg }, padded ? styles.cardShellPad : null]}>
      {children}
    </View>
  );
}

export function ImmersionSplitRow({ children }: { children: ReactNode }) {
  return <View style={styles.splitRow}>{children}</View>;
}

export function ImmersionHalfCard({
  borderColor,
  children,
}: {
  borderColor: string;
  children: ReactNode;
}) {
  const isDark = useColorScheme() === 'dark';
  const ui = getGoalDetailSessionUi(isDark);

  return (
    <View style={[styles.cardShell, styles.halfCardInner, { borderColor, backgroundColor: ui.cardBg, flex: 1 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 12,
    alignItems: 'stretch',
    width: '100%',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryTexts: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  sessionKicker: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  timerSlot: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
  },
  flowCaption: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.15,
  },
  cardShell: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  cardShellPad: {
    padding: 20,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  halfCardInner: {
    minHeight: 120,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  bottomBar: {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  completeBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  completeBtnText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
