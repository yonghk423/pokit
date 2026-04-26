import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryImmersionTheme } from '@shared/config/categoryImmersionTheme';
import { GoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { IconSymbol } from '@shared/ui/icon-symbol';

const E = CategoryImmersionTheme.editorial;

/** 다크 세션 카드 위 모노크롬 강조(밝은 전경) — 검정 배경에서 가독성 유지 */
export const ORANGE = '#FAFAFA';
export const ORANGE_SOFT = 'rgba(250, 250, 250, 0.14)';
export const GLASS_BG = 'rgba(255,255,255,0.06)';
export const GLASS_BORDER = 'rgba(255,255,255,0.12)';
export const META = 'rgba(255,255,255,0.45)';

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(s / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) {
    return `${m}분`;
  }
  return `${h}시간 ${m}분`;
}

/** 분 단위를 한글 표기 (단식·휴식 등) */
export function formatDurationMinKo(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m === 0) return '0분';
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (r === 0) return `${h}시간`;
    return `${h}시간 ${r}분`;
  }
  return `${m}분`;
}

export type SessionHeroProps = {
  remainingSec: number;
  progress01: number;
  isPaused: boolean;
  isWaitingToStart?: boolean;
  waitRemainingSec?: number;
  /** 플로우 제목 — 시안처럼 타이머 위에 강조 */
  flowTitle?: string;
};

type HeroProps = SessionHeroProps;

export type HeroTimerAccent = 'ember' | 'aqua';

const HERO_TIMER_ACCENT: Record<HeroTimerAccent, { kicker: string; fill: string }> = {
  ember: { kicker: 'rgba(255, 255, 255, 0.5)', fill: '#F5F5F5' },
  aqua: { kicker: 'rgba(34, 211, 238, 0.88)', fill: '#22d3ee' },
};

type HeroSurface = 'dark' | 'light';

type HeroTimerBlockProps = HeroProps & {
  accent?: HeroTimerAccent;
  /** 기본 dark — 목표 상세와 맞춘 라이트 에디토리얼 */
  surface?: HeroSurface;
  /** surface=light 일 때 진행 막대 채움색 (수분=시안 등) */
  progressFillColor?: string;
};

export function HeroTimerBlock({
  isPaused: _isPaused,
  isWaitingToStart: _isWaitingToStart = false,
  flowTitle,
  surface = 'dark',
}: HeroTimerBlockProps) {
  const head = typeof flowTitle === 'string' ? flowTitle.trim() : '';
  const light = surface === 'light';
  const kickerColor = light ? E.meta : HERO_TIMER_ACCENT.ember.kicker;

  return (
    <View style={heroStyles.hero}>
      <Text style={[heroStyles.heroKicker, { color: kickerColor }]}>
        {light ? '세션' : '활성 세션'}
      </Text>
      {head.length > 0 ? (
        <Text style={[heroStyles.heroFocus, light && heroStyles.heroFocusLight]} numberOfLines={2}>
          {head}
        </Text>
      ) : null}
    </View>
  );
}

/** 상단 글로우 — 시안의 그라데이션 헤더 느낌(추가 네이티브 의존성 없이) */
export type SessionShellAccent = 'ember' | 'amethyst' | 'forest' | 'aqua' | 'none';

const ACCENT_BLOB: Record<Exclude<SessionShellAccent, 'none'>, string> = {
  ember: 'rgba(255, 255, 255, 0.08)',
  amethyst: 'rgba(139, 92, 246, 0.22)',
  forest: 'rgba(34, 197, 94, 0.16)',
  aqua: 'rgba(56, 189, 248, 0.18)',
};

export function SessionDarkShell({
  children,
  accent = 'ember',
}: {
  children: React.ReactNode;
  accent?: SessionShellAccent;
}) {
  return (
    <View style={sharedStyles.shell}>
      {accent !== 'none' ? (
        <View
          pointerEvents="none"
          style={[sharedStyles.shellAccentBlob, { backgroundColor: ACCENT_BLOB[accent] }]}
        />
      ) : null}
      <View style={sharedStyles.shellContent}>{children}</View>
    </View>
  );
}

/** 목표 상세 설정과 동일한 라이트 카드 셸 (배경 블롭 없음) */
export function SessionEditorialShell({
  children,
  leftAccentColor,
}: {
  children: React.ReactNode;
  /** 카테고리 액센트 왼쪽 강조선 */
  leftAccentColor?: string;
}) {
  return (
    <View
      style={[
        editorialShellStyles.shell,
        leftAccentColor != null ? { borderLeftWidth: 3, borderLeftColor: leftAccentColor } : null,
      ]}>
      {children}
    </View>
  );
}

export function EditorialCategoryHeader({
  brand,
  aboutKicker,
}: {
  brand: string;
  aboutKicker?: string;
}) {
  return (
    <View style={editorialShellStyles.brandBlock}>
      <Text style={editorialShellStyles.brand}>{brand}</Text>
      {aboutKicker ? <Text style={editorialShellStyles.aboutKicker}>{aboutKicker}</Text> : null}
    </View>
  );
}

export function EditorialSimpleHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={editorialShellStyles.simpleHeader}>
      <Text style={editorialShellStyles.simpleTitle}>{title}</Text>
      <Text style={editorialShellStyles.simpleSub}>{subtitle}</Text>
    </View>
  );
}

type BentoSurface = 'dark' | 'light';

type WideProps = {
  icon: SymbolViewProps['name'];
  label: string;
  badge?: string;
  value: string;
  unit?: string;
  /** 0~1 보조 진행 막대 */
  trackProgress01?: number;
  /** 시안처럼 주요 카드 왼쪽 강조선 */
  featured?: boolean;
  surface?: BentoSurface;
  accentColor?: string;
};

export function BentoWideMetric({
  icon,
  label,
  badge,
  value,
  unit,
  trackProgress01,
  featured = false,
  surface = 'dark',
  accentColor,
}: WideProps) {
  const tp = trackProgress01 != null ? Math.min(1, Math.max(0, trackProgress01)) : null;
  const light = surface === 'light';
  const iconColor = light ? accentColor ?? CategoryImmersionTheme.work.accent : ORANGE;
  const glass = light ? editorialShellStyles.glassLight : sharedStyles.glass;
  const feat = featured && (light ? editorialShellStyles.cardFeaturedLight : sharedStyles.cardFeatured);
  const featTint = featured && light && accentColor ? { borderLeftColor: accentColor } : null;

  return (
    <View style={[sharedStyles.cardWide, glass, feat, featTint]}>
      <View style={sharedStyles.cardTopRow}>
        <View style={sharedStyles.cardTopLeft}>
          <IconSymbol name={icon} size={22} color={iconColor} />
          <Text style={[sharedStyles.labelUpper, light && editorialShellStyles.labelUpperLight]}>{label}</Text>
        </View>
        {badge ? (
          <View style={[sharedStyles.badge, light && editorialShellStyles.badgeLight]}>
            <Text style={[sharedStyles.badgeText, light && editorialShellStyles.badgeTextLight]}>{badge}</Text>
          </View>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>
      <View style={sharedStyles.metricBigRow}>
        <Text style={[sharedStyles.metricHuge, light && editorialShellStyles.metricHugeLight]}>{value}</Text>
        {unit ? (
          <Text style={[sharedStyles.metricUnit, light && editorialShellStyles.metricUnitLight]}>{unit}</Text>
        ) : null}
      </View>
      {tp != null ? (
        <View style={[sharedStyles.subTrack, light && editorialShellStyles.subTrackLight]}>
          <View
            style={[
              sharedStyles.subFill,
              light && editorialShellStyles.subFillLight,
              { width: `${Math.round(tp * 100)}%` },
              light && accentColor ? { backgroundColor: accentColor, opacity: 0.35 } : null,
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export function BentoWideText({
  icon,
  label,
  body,
  badge,
  surface = 'dark',
  accentColor,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  body: string;
  badge?: string;
  surface?: BentoSurface;
  accentColor?: string;
}) {
  const light = surface === 'light';
  const glass = light ? editorialShellStyles.glassLight : sharedStyles.glass;
  const iconColor = light ? accentColor ?? CategoryImmersionTheme.work.accent : ORANGE;
  return (
    <View style={[sharedStyles.cardWide, glass, { minHeight: 100 }]}>
      <View style={sharedStyles.cardTopRow}>
        <View style={sharedStyles.cardTopLeft}>
          <IconSymbol name={icon} size={22} color={iconColor} />
          <Text style={[sharedStyles.labelUpper, light && editorialShellStyles.labelUpperLight]}>{label}</Text>
        </View>
        {badge ? (
          <View style={[sharedStyles.badge, light && editorialShellStyles.badgeLight]}>
            <Text style={[sharedStyles.badgeText, light && editorialShellStyles.badgeTextLight]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[textBodyStyle, light && textBodyLight]} numberOfLines={6}>
        {body || '—'}
      </Text>
    </View>
  );
}

const textBodyStyle = {
  marginTop: 14,
  color: '#fff',
  fontSize: 15,
  fontWeight: '600' as const,
  lineHeight: 22,
};

const textBodyLight = {
  color: E.onDark,
};

type HalfProps = {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  unit?: string;
  surface?: BentoSurface;
  accentColor?: string;
};

export function BentoHalfMetric({ icon, label, value, unit, surface = 'dark', accentColor }: HalfProps) {
  const light = surface === 'light';
  const glass = light ? editorialShellStyles.glassLight : sharedStyles.glass;
  const iconColor = light ? accentColor ?? CategoryImmersionTheme.work.accent : ORANGE;
  return (
    <View style={[sharedStyles.cardHalf, glass]}>
      <IconSymbol name={icon} size={20} color={iconColor} />
      <Text style={[sharedStyles.labelUpper, light && editorialShellStyles.labelUpperLight, { marginTop: 8 }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 }}>
        <Text style={[halfValueStyle, light && halfValueLight]}>{value}</Text>
        {unit ? <Text style={[halfUnitStyle, light && halfUnitLight]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const halfValueStyle = {
  color: '#fff',
  fontSize: 26,
  fontWeight: '800' as const,
};

const halfValueLight = {
  color: E.onDark,
};

const halfUnitStyle = {
  color: META,
  fontSize: 12,
  fontWeight: '700' as const,
};

const halfUnitLight = {
  color: E.meta,
};

export function BentoRow({ children }: { children: React.ReactNode }) {
  return <View style={sharedStyles.rowHalf}>{children}</View>;
}

export function BentoGap({ children }: { children: React.ReactNode }) {
  return <View style={sharedStyles.bentoGap}>{children}</View>;
}

const heroStyles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroFocus: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 6,
    lineHeight: 28,
  },
  heroFocusLight: {
    color: E.onDark,
  },
});

const editorialShellStyles = StyleSheet.create({
  shell: {
    borderRadius: 14,
    backgroundColor: E.glassBg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: E.glassBorder,
    overflow: 'hidden',
  },
  brandBlock: {
    gap: 6,
    marginBottom: 8,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: E.onDark,
  },
  aboutKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: E.meta,
  },
  simpleHeader: {
    gap: 6,
    marginBottom: 10,
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: E.onDark,
  },
  simpleSub: {
    fontSize: 12,
    lineHeight: 18,
    color: E.meta,
  },
  glassLight: {
    backgroundColor: E.glassBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: E.glassBorder,
    borderRadius: 14,
  },
  cardFeaturedLight: {
    borderLeftWidth: 3,
    borderLeftColor: CategoryImmersionTheme.work.accent,
  },
  labelUpperLight: {
    color: E.meta,
  },
  metricHugeLight: {
    color: E.onDark,
  },
  metricUnitLight: {
    color: E.meta,
  },
  subTrackLight: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  subFillLight: {
    backgroundColor: CategoryImmersionTheme.work.accent,
    opacity: 0.25,
  },
  badgeLight: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  badgeTextLight: {
    color: E.onDark,
  },
});

const sharedStyles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    backgroundColor: '#08090d',
    paddingVertical: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  shellAccentBlob: {
    position: 'absolute',
    top: -88,
    left: '-18%',
    width: '136%',
    height: 240,
    borderRadius: 999,
  },
  shellContent: {
    zIndex: 1,
  },
  bentoGap: { marginTop: 20, gap: 12 },
  glass: {
    backgroundColor: GLASS_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
  },
  cardFeatured: {
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  cardWide: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: { gap: 6, flex: 1, minWidth: 0 },
  badge: {
    backgroundColor: ORANGE_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: ORANGE,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelUpper: {
    color: META,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 18,
  },
  metricHuge: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricUnit: {
    color: META,
    fontSize: 20,
    fontWeight: '600',
  },
  subTrack: {
    marginTop: 14,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  subFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
    opacity: 0.45,
  },
  rowHalf: { flexDirection: 'row', gap: 12 },
  cardHalf: {
    flex: 1,
    padding: 16,
    minHeight: 112,
  },
});
