import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  backgroundColor?: string;
  accentColor: string;
  /** 원형 히어로 뒤 소프트 글로우 (예: rgba(34,211,238,0.18)) */
  accentGlow: string;
  onSurface: string;
  muted: string;
  brand: string;
  aboutKicker: string;
  headerTitle: string;
  iconName: SymbolViewProps['name'];
  iconSize?: number;
  sessionKicker: string;
  /** 큰 타이머 영역 — 문자열 또는 커스텀 노드 */
  timerDisplay: ReactNode;
  flowCaption: string;
  onBack: () => void;
  scrollBottomPadding: number;
  children: React.ReactNode;
  bottomBar: React.ReactNode;
};

/**
 * 수분섭취 몰입 화면과 동일한 골격:
 * 상단 헤더(뒤로·제목) → LOCKFLOW/ABOUT → 원형 아이콘+리플 → 세션 키커+타이머+플로우 캡션 → 본문 → 하단 컨트롤
 */
export function SessionImmersionLayout({
  backgroundColor = '#ffffff',
  accentColor,
  accentGlow,
  onSurface,
  muted,
  brand,
  aboutKicker,
  headerTitle,
  iconName,
  iconSize = 88,
  sessionKicker,
  timerDisplay,
  flowCaption,
  onBack,
  scrollBottomPadding,
  children,
  bottomBar,
}: Props) {
  const insets = useSafeAreaInsets();
  /** `presentation: 'fullScreenModal'` 등에서 SafeAreaView 상단이 0으로 나오는 경우 대비 */
  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <View style={[styles.flex, { paddingTop: topInset }]}>
        <View style={styles.topHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={styles.headerBtn}
            onPress={onBack}>
            <IconSymbol name="chevron.left" size={22} color={accentColor} />
          </Pressable>
          <ThemedText
            style={styles.topHeaderTitle}
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
          bounces={false}>
          <View style={styles.editorialHeader}>
            <Text style={[styles.brand, { color: onSurface }]}>{brand}</Text>
            <Text style={[styles.aboutKicker, { color: muted }]}>{aboutKicker}</Text>
          </View>

          <View style={styles.anchorOuter}>
            <View style={[styles.anchorGlow, { backgroundColor: accentGlow }]} />
            <View style={styles.anchorWrap}>
              <IconSymbol name={iconName} size={iconSize} color={accentColor} weight="light" />
            </View>
            <View style={styles.rippleRow}>
              <View style={[styles.ripple, { width: 36, backgroundColor: accentColor }]} />
              <View style={[styles.ripple, { width: 56, backgroundColor: accentColor }]} />
              <View style={[styles.ripple, { width: 44, backgroundColor: accentColor }]} />
            </View>
          </View>

          <View style={styles.timerBlock}>
            <ThemedText style={styles.timerKicker} lightColor={accentColor} darkColor={accentColor}>
              {sessionKicker}
            </ThemedText>
            <View style={styles.timerSlot}>{timerDisplay}</View>
            <ThemedText style={styles.flowCaption} lightColor={muted} darkColor={muted}>
              {flowCaption}
            </ThemedText>
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
  /** true면 탭 비활성(예: 세션 시작 대기) */
  disabled?: boolean;
};

/** 하단 액션은 완료 버튼 하나만 유지 */
export function ImmersionBottomControls({
  accentColor,
  borderColor,
  paddingBottom,
  onEndSession,
  completeLabel = '완료',
  disabled = false,
}: BottomProps) {
  return (
    <View style={[styles.bottomBar, { borderTopColor: borderColor, paddingBottom }]}>
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
        <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
        <ThemedText style={styles.completeBtnText}>{completeLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

/** 카드 톤 — 수분 메인/하프 카드와 동일 */
export function ImmersionCardShell({
  borderColor,
  padded = true,
  children,
}: {
  borderColor: string;
  padded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.cardShell,
        { borderColor },
        padded ? styles.cardShellPad : null,
      ]}>
      {children}
    </View>
  );
}

export function ImmersionSplitRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.splitRow}>{children}</View>;
}

export function ImmersionHalfCard({
  borderColor,
  children,
}: {
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.cardShell,
        styles.halfCardInner,
        { borderColor, flex: 1 },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  editorialHeader: {
    width: '100%',
    gap: 8,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  aboutKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  anchorOuter: {
    position: 'relative',
    width: 260,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  anchorGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  anchorWrap: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRow: {
    position: 'absolute',
    right: -8,
    top: '46%',
    gap: 8,
    opacity: 0.35,
  },
  ripple: {
    height: 4,
    borderRadius: 2,
  },
  timerBlock: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  timerKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerSlot: {
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  flowCaption: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  cardShell: {
    width: '100%',
    backgroundColor: '#ffffff',
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
    minHeight: 128,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  bottomBar: {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff',
  },
  completeBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
