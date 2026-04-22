import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

/** 목표 상세 설정 화면과 동일 톤의 라이트 셸 */
const SHELL_BG = '#ffffff';
const ON_SURFACE = GoalDetailSessionUi.onSurface;
const MUTED = GoalDetailSessionUi.muted;
const BORDER = GoalDetailSessionUi.border;

type Props = {
  /** 호환용 — 셸은 항상 라이트 흰색(상세 설정과 통일) */
  backgroundColor?: string;
  accentColor: string;
  /** 더 이상 사용하지 않음(호환용) */
  accentGlow: string;
  onSurface: string;
  muted: string;
  /** 더 이상 사용하지 않음(호환용) */
  brand: string;
  /** 더 이상 사용하지 않음(호환용) */
  aboutKicker: string;
  headerTitle: string;
  iconName: SymbolViewProps['name'];
  iconSize?: number;
  sessionKicker: string;
  /** 남은 시간 등 */
  timerDisplay: ReactNode;
  flowCaption: string;
  onBack: () => void;
  scrollBottomPadding: number;
  children: ReactNode;
  bottomBar: ReactNode;
};

/**
 * 하루 일과(세션) 셸 — 목표 상세 설정과 동일한 헤더·여백·카드형 요약.
 * 예전 몰입용 대형 아이콘·글로우·리플 레이어는 제거했다.
 */
export function SessionImmersionLayout({
  accentColor,
  accentGlow: _accentGlow,
  onSurface: _onSurface,
  muted: _muted,
  brand: _brand,
  aboutKicker: _aboutKicker,
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
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <View style={[styles.screen, { backgroundColor: SHELL_BG }]}>
      <View style={[styles.flex, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: BORDER }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={styles.headerBtn}
            onPress={onBack}>
            <IconSymbol name="chevron.left" size={22} color={PrimaryColor.rgb} />
          </Pressable>
          <ThemedText
            style={styles.headerTitle}
            lightColor={ON_SURFACE}
            darkColor={ON_SURFACE}
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
          <View style={[styles.summaryCard, { borderColor: BORDER }]}>
            <IconSymbol name={iconName} size={iconSize} color={accentColor} />
            <View style={styles.summaryTexts}>
              <Text style={[styles.sessionKicker, { color: MUTED }]}>{sessionKicker}</Text>
              <View style={styles.timerSlot}>{timerDisplay}</View>
              <ThemedText style={styles.flowCaption} lightColor={MUTED} darkColor={MUTED} numberOfLines={3}>
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
  /** 수분 등 밝은 액센트 위 전경색 (기본: 흰색) */
  completeForeground?: string;
  disabled?: boolean;
};

/** 목표 상세 하단 CTA와 동일한 필(가로 꽉 찬 강조 버튼) */
export function ImmersionBottomControls({
  accentColor,
  borderColor,
  paddingBottom,
  onEndSession,
  completeLabel = '완료',
  completeForeground = '#fff',
  disabled = false,
}: BottomProps) {
  return (
    <View style={[styles.bottomBar, { borderTopColor: borderColor, paddingBottom, backgroundColor: SHELL_BG }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[
          styles.completeBtn,
          { backgroundColor: accentColor },
          disabled ? { opacity: 0.45 } : null,
        ]}
        disabled={disabled}
        onPress={onEndSession}>
        <IconSymbol name="checkmark.circle.fill" size={20} color={completeForeground} />
        <ThemedText style={[styles.completeBtnText, { color: completeForeground }]}>{completeLabel}</ThemedText>
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
  return (
    <View style={[styles.cardShell, { borderColor }, padded ? styles.cardShellPad : null]}>{children}</View>
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
  return (
    <View style={[styles.cardShell, styles.halfCardInner, { borderColor, flex: 1 }]}>{children}</View>
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
    backgroundColor: SHELL_BG,
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
    backgroundColor: SHELL_BG,
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
    shadowColor: PrimaryColor.rgb,
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
