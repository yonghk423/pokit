import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';

export const ORANGE = 'rgb(249, 115, 22)';
export const ORANGE_SOFT = 'rgba(249, 115, 22, 0.22)';
export const GLASS_BG = 'rgba(255,255,255,0.06)';
export const GLASS_BORDER = 'rgba(255,255,255,0.12)';
export const META = 'rgba(255,255,255,0.45)';

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
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

export function HeroTimerBlock({
  remainingSec,
  progress01,
  isPaused,
  isWaitingToStart = false,
  waitRemainingSec = 0,
  flowTitle,
}: HeroProps) {
  const heroSec = isWaitingToStart ? waitRemainingSec : remainingSec;
  const p = isWaitingToStart ? 0 : Math.min(1, Math.max(0, progress01));
  const head = typeof flowTitle === 'string' ? flowTitle.trim() : '';

  return (
    <View style={heroStyles.hero}>
      <Text style={heroStyles.heroKicker}>
        {isPaused ? '일시정지' : isWaitingToStart ? '시작 대기' : '활성 세션'}
      </Text>
      {head.length > 0 ? (
        <Text style={heroStyles.heroFocus} numberOfLines={2}>
          {head}
        </Text>
      ) : null}
      <Text style={heroStyles.heroTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35}>
        {formatClock(heroSec)}
      </Text>
      <View style={heroStyles.heroTrack}>
        <View style={[heroStyles.heroFill, { width: `${Math.round(p * 100)}%` }]} />
      </View>
    </View>
  );
}

/** 상단 글로우 — 시안의 그라데이션 헤더 느낌(추가 네이티브 의존성 없이) */
export type SessionShellAccent = 'ember' | 'amethyst' | 'forest' | 'aqua' | 'none';

const ACCENT_BLOB: Record<Exclude<SessionShellAccent, 'none'>, string> = {
  ember: 'rgba(249, 115, 22, 0.2)',
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
};

export function BentoWideMetric({
  icon,
  label,
  badge,
  value,
  unit,
  trackProgress01,
  featured = false,
}: WideProps) {
  const tp = trackProgress01 != null ? Math.min(1, Math.max(0, trackProgress01)) : null;
  return (
    <View style={[sharedStyles.cardWide, sharedStyles.glass, featured && sharedStyles.cardFeatured]}>
      <View style={sharedStyles.cardTopRow}>
        <View style={sharedStyles.cardTopLeft}>
          <IconSymbol name={icon} size={22} color={ORANGE} />
          <Text style={sharedStyles.labelUpper}>{label}</Text>
        </View>
        {badge ? (
          <View style={sharedStyles.badge}>
            <Text style={sharedStyles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>
      <View style={sharedStyles.metricBigRow}>
        <Text style={sharedStyles.metricHuge}>{value}</Text>
        {unit ? <Text style={sharedStyles.metricUnit}>{unit}</Text> : null}
      </View>
      {tp != null ? (
        <View style={sharedStyles.subTrack}>
          <View style={[sharedStyles.subFill, { width: `${Math.round(tp * 100)}%` }]} />
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
}: {
  icon: SymbolViewProps['name'];
  label: string;
  body: string;
  badge?: string;
}) {
  return (
    <View style={[sharedStyles.cardWide, sharedStyles.glass, { minHeight: 100 }]}>
      <View style={sharedStyles.cardTopRow}>
        <View style={sharedStyles.cardTopLeft}>
          <IconSymbol name={icon} size={22} color={ORANGE} />
          <Text style={sharedStyles.labelUpper}>{label}</Text>
        </View>
        {badge ? (
          <View style={sharedStyles.badge}>
            <Text style={sharedStyles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={textBodyStyle} numberOfLines={6}>
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

type HalfProps = {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  unit?: string;
};

export function BentoHalfMetric({ icon, label, value, unit }: HalfProps) {
  return (
    <View style={[sharedStyles.cardHalf, sharedStyles.glass]}>
      <IconSymbol name={icon} size={20} color={ORANGE} />
      <Text style={[sharedStyles.labelUpper, { marginTop: 8 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 }}>
        <Text style={halfValueStyle}>{value}</Text>
        {unit ? <Text style={halfUnitStyle}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const halfValueStyle = {
  color: '#fff',
  fontSize: 26,
  fontWeight: '800' as const,
};

const halfUnitStyle = {
  color: META,
  fontSize: 12,
  fontWeight: '700' as const,
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
    color: 'rgba(249, 115, 22, 0.75)',
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
  heroTime: {
    color: '#fff',
    fontSize: 86,
    lineHeight: 90,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
  },
  heroTrack: {
    marginTop: 22,
    width: 192,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
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
