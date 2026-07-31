import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { GuideBookFigureId } from '../lib/guideBookPages';

/** `DayPlanCustomTabBar` 와 동일 */
const APP_TABS = [
  { key: 'today', icon: 'calendar', label: '오늘', n: 1 },
  { key: 'routine', icon: 'list.bullet.rectangle', label: '루틴', n: 2 },
  { key: 'mine', icon: 'figure.walk', label: '나만의 루틴', n: 3 },
  { key: 'history', icon: 'clock.arrow.circlepath', label: '히스토리', n: 4 },
  { key: 'story', icon: 'book', label: '스토리', n: 5 },
] as const;

/** `PlanModeSwitch` 와 동일 */
const MODE_BUTTONS = [
  { icon: 'list.bullet.rectangle', label: '데일리', n: 1 },
  { icon: 'note.text', label: '잠금화면 메모', n: 2 },
  { icon: 'square.and.pencil', label: '노트', n: 3 },
  { icon: 'checklist', label: '투두', n: 4 },
  { icon: 'book.closed.fill', label: '독서', n: 5 },
] as const;

/** `DayPlanLayoutModeTabs` 와 동일 */
const LAYOUT_TABS = [
  { key: 'bag', icon: 'list.bullet.rectangle', label: '목록', n: 1 },
  { key: 'sections', icon: 'sun.horizon.fill', label: '시간대', n: 2 },
  { key: 'spine', icon: 'clock', label: '타임라인', n: 3 },
] as const;

type Tone = {
  border: string;
  text: string;
  muted: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  primaryContainer: string;
  isDark: boolean;
};

function Badge({ n, tone }: { n: number; tone: Tone }) {
  return (
    <View style={[styles.badge, { borderColor: tone.border, backgroundColor: tone.primaryContainer }]}>
      <ThemedText style={[styles.badgeText, { color: tone.text }, cityPopFont('800')]}>{n}</ThemedText>
    </View>
  );
}

function AppTabBar({
  tone,
  active,
  showBadges,
}: {
  tone: Tone;
  active: (typeof APP_TABS)[number]['key'];
  showBadges?: boolean;
}) {
  const colors = tone.isDark
    ? {
        containerBg: '#1C1C1E',
        containerBorder: 'rgba(255,255,255,0.10)',
        activeBg: '#3A3A3C',
        activeIcon: '#FAFAFA',
        inactiveIcon: '#8E8E93',
      }
    : {
        containerBg: '#FFFFFF',
        containerBorder: '#E5E5E5',
        activeBg: '#E8E5E0',
        activeIcon: '#1A1A1A',
        inactiveIcon: '#999999',
      };

  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: colors.containerBg, borderColor: colors.containerBorder },
      ]}>
      {APP_TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <View
            key={tab.key}
            style={[styles.tabItem, on && { backgroundColor: colors.activeBg }]}>
            {showBadges ? (
              <View style={styles.tabBadgeAbs}>
                <Badge n={tab.n} tone={tone} />
              </View>
            ) : null}
            <IconSymbol
              name={tab.icon as 'calendar'}
              size={22}
              color={on ? colors.activeIcon : colors.inactiveIcon}
            />
          </View>
        );
      })}
    </View>
  );
}

function ModeRow({
  tone,
  showBadges,
}: {
  tone: Tone;
  /** true일 때만 번호 배지(상단 모드 설명 페이지 전용) */
  showBadges?: boolean;
}) {
  const pill = tabPillColors(tone.isDark);
  return (
    <View style={[styles.modeRow, { borderBottomColor: tone.border, backgroundColor: tone.bg }]}>
      <View style={styles.modeLeft}>
        {MODE_BUTTONS.map((btn, i) => {
          const active = i === 0;
          return (
            <View key={btn.label} style={styles.modeHitWrap}>
              {showBadges ? <Badge n={btn.n} tone={tone} /> : null}
              <View
                style={[
                  styles.modeHit,
                  {
                    backgroundColor: active ? pill.activeBg : tone.surface,
                    borderColor: active ? pill.activeBorder : tone.border,
                  },
                ]}>
                <IconSymbol
                  name={btn.icon as 'list.bullet.rectangle'}
                  size={18}
                  color={active ? pill.activeIcon : tone.muted}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.modeHitWrap}>
        {showBadges ? <Badge n={6} tone={tone} /> : null}
        <View
          style={[
            styles.modeHit,
            { backgroundColor: tone.surface, borderColor: tone.border },
          ]}>
          <IconSymbol name="gearshape" size={18} color={pill.inactiveIcon} />
        </View>
      </View>
    </View>
  );
}

function LayoutIcons({
  tone,
  active = 'bag',
  showBadges,
}: {
  tone: Tone;
  active?: 'bag' | 'sections' | 'spine';
  showBadges?: boolean;
}) {
  const pill = tabPillColors(tone.isDark);
  return (
    <View style={styles.layoutRow}>
      {LAYOUT_TABS.map((item) => {
        const on = item.key === active;
        return (
          <View key={item.key} style={styles.layoutHitWrap}>
            {showBadges ? <Badge n={item.n} tone={tone} /> : null}
            <View
              style={[
                styles.layoutHit,
                {
                  backgroundColor: on ? pill.activeBg : pill.inactiveBg,
                  borderColor: on ? pill.activeBorder : pill.inactiveBorder,
                  borderWidth: on ? 2 : 1,
                },
              ]}>
              <IconSymbol
                name={item.icon as 'list.bullet.rectangle'}
                size={16}
                color={on ? pill.activeIcon : pill.inactiveIcon}
              />
            </View>
            <ThemedText style={[styles.layoutLabel, { color: tone.muted }, cityPopFont('600')]}>
              {item.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function PhoneShell({
  tone,
  children,
  tabActive,
  showTabBadges,
  showModeRow,
}: {
  tone: Tone;
  children: ReactNode;
  tabActive: (typeof APP_TABS)[number]['key'];
  showTabBadges?: boolean;
  showModeRow?: boolean;
}) {
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      {showModeRow ? <ModeRow tone={tone} /> : null}
      <View style={styles.phoneBody}>{children}</View>
      <View style={styles.tabBarPad}>
        <AppTabBar tone={tone} active={tabActive} showBadges={showTabBadges} />
      </View>
    </View>
  );
}

function FigureTabsMap({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="today" showTabBadges>
      <View style={styles.centerHint}>
        <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
          하단 탭
        </ThemedText>
        <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
          앱과 같은 아이콘·순서예요. 번호는 아래 설명과 같아요.
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureChromeModes({ tone }: { tone: Tone }) {
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <ModeRow tone={tone} showBadges />
      <View style={styles.centerHint}>
        <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
          상단은 데일리·메모·노트·투두·독서 + 설정이에요.
        </ThemedText>
      </View>
      <View style={styles.tabBarPad}>
        <AppTabBar tone={tone} active="today" />
      </View>
    </View>
  );
}

function FigureTodayOverview({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.headerBlock, { borderBottomColor: tone.border }]}>
        <View style={styles.headerTop}>
          <Badge n={1} tone={tone} />
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText style={[styles.dateLine, { color: tone.text }, cityPopFont('800')]}>
              월요일, 7월 30일
            </ThemedText>
            <View
              style={[
                styles.windowChip,
                { borderColor: tone.border, backgroundColor: tone.primaryContainer },
              ]}>
              <ThemedText style={[styles.windowChipText, { color: tone.text }, cityPopFont('700')]}>
                오전 7:00 – 오후 11:00
              </ThemedText>
            </View>
          </View>
          <View>
            <Badge n={2} tone={tone} />
            <LayoutIcons tone={tone} />
          </View>
        </View>
      </View>
      <View style={[styles.emptyBag, { borderColor: tone.border }]}>
        <Badge n={3} tone={tone} />
        <ThemedText style={[styles.emptyTitle, { color: tone.text }, cityPopFont('800')]}>
          담기 목록이 비어 있어요
        </ThemedText>
        <ThemedText style={[styles.emptyBody, { color: tone.muted }, cityPopFont('500')]}>
          오늘 할 루틴을 추가해 주세요.
        </ThemedText>
        <View
          style={[
            styles.addRow,
            {
              borderColor: tone.border,
              backgroundColor: tone.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
            },
          ]}>
          <IconSymbol name="plus.circle.fill" size={16} color={tone.text} />
          <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
            루틴 추가
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        ④ 하단 「오늘」탭(달력 아이콘)이 선택돼 있어요
      </ThemedText>
    </PhoneShell>
  );
}

function FigureTodayWindow({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.sheet, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <ThemedText style={[styles.sheetTitle, { color: tone.text }, cityPopFont('800')]}>
          집중 구간 시간
        </ThemedText>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="clock" size={16} color={tone.muted} />
          <ThemedText style={[styles.sheetLabel, { color: tone.muted }, cityPopFont('600')]}>시작</ThemedText>
          <View style={[styles.timeBox, { borderColor: tone.border }]}>
            <ThemedText style={[styles.timeBoxText, { color: tone.text }, cityPopFont('800')]}>
              오전 7:00
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <View style={{ width: 18 }} />
          <IconSymbol name="moon.stars" size={16} color={tone.muted} />
          <ThemedText style={[styles.sheetLabel, { color: tone.muted }, cityPopFont('600')]}>
            마무리
          </ThemedText>
          <View style={[styles.timeBox, { borderColor: tone.border }]}>
            <ThemedText style={[styles.timeBoxText, { color: tone.text }, cityPopFont('800')]}>
              오후 11:00
            </ThemedText>
          </View>
        </View>
        <View style={styles.dayChoiceRow}>
          <Badge n={3} tone={tone} />
          <View
            style={[
              styles.dayChoiceOn,
              { borderColor: tone.border, backgroundColor: tone.primaryContainer },
            ]}>
            <ThemedText style={[styles.dayChoiceText, { color: tone.text }, cityPopFont('700')]}>
              당일
            </ThemedText>
          </View>
          <View style={[styles.dayChoiceOff, { borderColor: tone.border }]}>
            <ThemedText style={[styles.dayChoiceText, { color: tone.muted }, cityPopFont('600')]}>
              다음 날
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.sheetCta,
            { borderColor: tone.border, backgroundColor: tone.primaryContainer },
          ]}>
          <Badge n={2} tone={tone} />
          <ThemedText style={[styles.sheetCtaText, { color: tone.text }, cityPopFont('800')]}>
            설정 완료
          </ThemedText>
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          ④ 적용 기간은 달력에서 시작·끝일을 고를 수 있어요
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureTodayLayouts({ tone }: { tone: Tone }) {
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg, padding: 12 }]}>
      <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
        보기 전환 아이콘
      </ThemedText>
      <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
        오늘 탭 헤더 오른쪽과 같은 아이콘이에요.
      </ThemedText>
      <View style={{ height: 10 }} />
      <LayoutIcons tone={tone} showBadges />
    </View>
  );
}

function FigureTodayAddRow({ tone }: { tone: Tone }) {
  const pill = tabPillColors(tone.isDark);
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.rowCard, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.rowHead}>
          <IconSymbol name="book.closed.fill" size={18} color={pill.activeIcon} />
          <ThemedText style={[styles.rowTitle, { color: tone.text }, cityPopFont('800')]}>독서</ThemedText>
        </View>
        <View style={styles.rowActions}>
          {[
            { n: 2, icon: 'flag.fill' as const, t: '높음' },
            { n: 3, icon: 'checkmark.circle' as const, t: '완료' },
            { n: 4, icon: 'slider.horizontal.3' as const, t: '설정' },
          ].map((a) => (
            <View key={a.t} style={styles.rowAction}>
              <Badge n={a.n} tone={tone} />
              <View
                style={[
                  styles.miniBtn,
                  { borderColor: tone.border, backgroundColor: tone.surfaceAlt },
                ]}>
                <IconSymbol name={a.icon} size={14} color={tone.text} />
                <ThemedText style={[styles.miniBtnText, { color: tone.text }, cityPopFont('700')]}>
                  {a.t}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <View
            style={[
              styles.addRow,
              {
                flex: 1,
                borderColor: tone.border,
                backgroundColor: tone.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
              },
            ]}>
            <IconSymbol name="plus.circle.fill" size={16} color={tone.text} />
            <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
              루틴 추가
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Badge n={5} tone={tone} />
          <ThemedText style={[styles.tinyNote, { color: tone.muted, flex: 1 }, cityPopFont('500')]}>
            길게 누르기 → 순서 · 집중 중 「종료」
          </ThemedText>
        </View>
      </View>
    </PhoneShell>
  );
}

function FigureTodayAutofocus({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.flowBox, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.flowStep}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="plus.circle.fill" size={18} color={tone.text} />
          <ThemedText style={[styles.flowText, { color: tone.text }, cityPopFont('700')]}>
            담기에 루틴 추가
          </ThemedText>
        </View>
        <IconSymbol name="arrow.down" size={16} color={tone.muted} />
        <View
          style={[
            styles.flowHighlight,
            { borderColor: tone.border, backgroundColor: tone.primaryContainer },
          ]}>
          <IconSymbol name="flag.fill" size={18} color={tone.text} />
          <ThemedText style={[styles.flowText, { color: tone.text }, cityPopFont('800')]}>
            오늘 탭 집중 상태 자동
          </ThemedText>
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          ② 구간 종료 · ③ 설정→담기 유지 · ④ 적용 연동
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureRoutineList({ tone }: { tone: Tone }) {
  const pill = tabPillColors(tone.isDark);
  return (
    <PhoneShell tone={tone} tabActive="routine">
      <View style={styles.subTabs}>
        <Badge n={1} tone={tone} />
        <View
          style={[
            styles.subTabOn,
            { borderColor: tone.border, backgroundColor: tone.primaryContainer },
          ]}>
          <ThemedText style={[styles.subTabText, { color: tone.text }, cityPopFont('800')]}>
            루틴 목록
          </ThemedText>
        </View>
        <View style={[styles.subTabOff, { borderColor: tone.border }]}>
          <ThemedText style={[styles.subTabText, { color: tone.muted }, cityPopFont('600')]}>
            루틴 템플릿
          </ThemedText>
        </View>
        <View style={{ marginLeft: 'auto', alignItems: 'center', gap: 2 }}>
          <Badge n={2} tone={tone} />
          <View
            style={[
              styles.plusBtn,
              { borderColor: tone.border, backgroundColor: pill.activeBg },
            ]}>
            <IconSymbol name="plus" size={16} color={tone.text} />
          </View>
        </View>
      </View>
      <View style={[styles.groupCard, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <ThemedText style={[styles.groupTitle, { color: tone.muted }, cityPopFont('700')]}>
          건강 루틴
        </ThemedText>
        <View style={[styles.itemRow, { borderColor: tone.border }]}>
          <Badge n={3} tone={tone} />
          <IconSymbol name="book.closed.fill" size={16} color={pill.activeIcon} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
            독서
          </ThemedText>
          <IconSymbol name="chevron.right" size={14} color={tone.muted} />
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          ④ 묶음 편집·이동 · 「+」→ 새 루틴 / 새 묶음
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureRoutineTemplates({ tone }: { tone: Tone }) {
  const items = [
    { n: 1, icon: 'checklist' as const, t: '할 일 체크' },
    { n: 2, icon: 'note.text' as const, t: '간단한 메모' },
    { n: 3, icon: 'chart.bar.fill' as const, t: '값 기록' },
    { n: 4, icon: 'plus.circle' as const, t: '횟수 채우기' },
    { n: 5, icon: 'bell' as const, t: '시간 알림' },
  ];
  return (
    <PhoneShell tone={tone} tabActive="routine">
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        항목을 눌러 방식별 화면 구성을 확인할 수 있어요
      </ThemedText>
      <View style={styles.templateList}>
        {items.map((it) => (
          <View key={it.t} style={[styles.templateRow, { borderColor: tone.border }]}>
            <Badge n={it.n} tone={tone} />
            <IconSymbol name={it.icon} size={16} color={tone.text} />
            <ThemedText style={[styles.templateText, { color: tone.text }, cityPopFont('700')]}>
              {it.t}
            </ThemedText>
            <IconSymbol name="chevron.right" size={12} color={tone.muted} />
          </View>
        ))}
      </View>
    </PhoneShell>
  );
}

function FigureMyRoutine({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="mine">
      <View style={styles.layoutMiniRow}>
        <Badge n={1} tone={tone} />
        <LayoutIcons tone={tone} />
      </View>
      <View style={styles.subTabs}>
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', top: -10, left: -4, zIndex: 2 }}>
            <Badge n={2} tone={tone} />
          </View>
          <View
            style={[
              styles.subTabOn,
              { borderColor: tone.border, backgroundColor: tone.primaryContainer },
            ]}>
            <IconSymbol name="figure.walk" size={14} color={tone.text} />
            <ThemedText style={[styles.subTabText, { color: tone.text }, cityPopFont('800')]}>
              나만의 루틴
            </ThemedText>
          </View>
        </View>
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', top: -10, left: -4, zIndex: 2 }}>
            <Badge n={3} tone={tone} />
          </View>
          <View style={[styles.subTabOff, { borderColor: tone.border }]}>
            <IconSymbol name="list.bullet.rectangle" size={14} color={tone.muted} />
            <ThemedText style={[styles.subTabText, { color: tone.muted }, cityPopFont('600')]}>
              고정 루틴
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={[styles.groupCard, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.sheetRow}>
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            아침 루틴
          </ThemedText>
          <Badge n={4} tone={tone} />
          <View
            style={[
              styles.applyChip,
              { borderColor: tone.border, backgroundColor: tone.primaryContainer },
            ]}>
            <ThemedText style={[styles.applyChipText, { color: tone.text }, cityPopFont('800')]}>
              적용하기
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          고정 루틴 탭 · 데일리/주말 · 이름 고정
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureMyRoutineApply({ tone }: { tone: Tone }) {
  const rows = [
    { n: 1, icon: 'list.bullet.rectangle' as const, t: '목록 — 그룹·항목 정리' },
    { n: 2, icon: 'sun.horizon.fill' as const, t: '시간대 — 새벽~밤 · 시작 알림' },
    { n: 3, icon: 'clock' as const, t: '타임라인 — 집중 구간 · 시작·종료 · 시작 알림' },
    { n: 4, icon: 'plus' as const, t: '항목 켜기 · 새 항목 추가' },
  ];
  return (
    <PhoneShell tone={tone} tabActive="mine">
      <View style={styles.templateList}>
        {rows.map((r) => (
          <View key={r.t} style={[styles.templateRow, { borderColor: tone.border }]}>
            <Badge n={r.n} tone={tone} />
            <IconSymbol name={r.icon} size={16} color={tone.text} />
            <ThemedText
              style={[styles.templateText, { color: tone.text, flex: 1 }, cityPopFont('600')]}
              numberOfLines={2}>
              {r.t}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        맞춘 뒤 그룹의 「적용하기」로 오늘 담기에 반영해요
      </ThemedText>
    </PhoneShell>
  );
}

function FigureHistory({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="history">
      <View style={styles.subTabs}>
        <Badge n={1} tone={tone} />
        <View
          style={[
            styles.subTabOn,
            { borderColor: tone.border, backgroundColor: tone.primaryContainer },
          ]}>
          <ThemedText style={[styles.subTabText, { color: tone.text }, cityPopFont('800')]}>
            주간
          </ThemedText>
        </View>
        <View style={[styles.subTabOff, { borderColor: tone.border }]}>
          <ThemedText style={[styles.subTabText, { color: tone.muted }, cityPopFont('600')]}>
            월간
          </ThemedText>
        </View>
        <View style={styles.navMini}>
          <Badge n={2} tone={tone} />
          <IconSymbol name="chevron.left" size={14} color={tone.text} />
          <IconSymbol name="chevron.right" size={14} color={tone.text} />
        </View>
      </View>
      <View
        style={[
          styles.summaryCard,
          { borderColor: tone.border, backgroundColor: tone.surface },
        ]}>
        <View style={styles.sheetRow}>
          <Badge n={3} tone={tone} />
          <IconSymbol name="clock.arrow.circlepath" size={16} color={tone.text} />
          <ThemedText style={[styles.summaryTitle, { color: tone.text }, cityPopFont('800')]}>
            이번 주 요약
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryBody, { color: tone.muted }, cityPopFont('500')]}>
          3일 / 7일 중 활동 · 총 12회 완료
        </ThemedText>
        <ThemedText style={[styles.summaryBody, { color: tone.text }, cityPopFont('700')]}>
          가장 많이 한 루틴: 독서
        </ThemedText>
      </View>
      <View style={[styles.itemRow, { borderColor: tone.border }]}>
        <Badge n={4} tone={tone} />
        <IconSymbol name="book.closed.fill" size={16} color={tone.text} />
        <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
          루틴별 완료 카드
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureStory({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="story">
      <View
        style={[
          styles.webPane,
          { borderColor: tone.border, backgroundColor: tone.surface },
        ]}>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="book" size={16} color={tone.text} />
          <ThemedText style={[styles.webTitle, { color: tone.text }, cityPopFont('800')]}>
            스토리 글
          </ThemedText>
        </View>
        <ThemedText style={[styles.webBody, { color: tone.muted }, cityPopFont('500')]}>
          웹 본문을 스크롤하며 읽어요
        </ThemedText>
      </View>
      <View style={[styles.sheet, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.sheetRow}>
          <Badge n={2} tone={tone} />
          <ThemedText style={[styles.sheetTitle, { color: tone.text }, cityPopFont('800')]}>
            글 제목 · 저장할 카테고리
          </ThemedText>
        </View>
        <View
          style={[
            styles.sheetCta,
            { borderColor: tone.border, backgroundColor: tone.primaryContainer },
          ]}>
          <Badge n={3} tone={tone} />
          <IconSymbol name="square.and.arrow.down" size={16} color={tone.text} />
          <ThemedText style={[styles.sheetCtaText, { color: tone.text }, cityPopFont('800')]}>
            루틴에 저장
          </ThemedText>
        </View>
      </View>
    </PhoneShell>
  );
}

function FigureSettings({ tone }: { tone: Tone }) {
  const rows = [
    { n: 1, icon: 'clock' as const, t: '시작·마무리', section: '데이플랜' },
    { n: 2, icon: 'book' as const, t: 'POKIT 소개 · 사용 설명서', section: '데이플랜' },
    { n: 3, icon: 'bell.fill' as const, t: '알림', section: '알림' },
    { n: 4, icon: 'square.grid.2x2' as const, t: '오늘 탭 보기 · 화면 테마', section: '화면' },
    { n: 5, icon: 'envelope.fill' as const, t: '문의 · 버전 · 초기화', section: '고객센터·데이터' },
  ];
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <View style={styles.settingsHeaderRow}>
        <IconSymbol name="gearshape" size={18} color={tone.text} />
        <ThemedText style={[styles.settingsHeader, { color: tone.text }, cityPopFont('800')]}>
          설정
        </ThemedText>
      </View>
      {rows.map((r) => (
        <View key={r.t} style={[styles.settingsRow, { borderColor: tone.border }]}>
          <Badge n={r.n} tone={tone} />
          <IconSymbol name={r.icon} size={18} color={tone.muted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText style={[styles.settingsRowText, { color: tone.text }, cityPopFont('700')]}>
              {r.t}
            </ThemedText>
            <ThemedText style={[styles.tinyNote, { color: tone.muted, marginTop: 0 }, cityPopFont('500')]}>
              {r.section}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={14} color={tone.muted} />
        </View>
      ))}
    </View>
  );
}

const FIGURES: Record<GuideBookFigureId, (tone: Tone) => ReactElement> = {
  'tabs-map': (tone) => <FigureTabsMap tone={tone} />,
  'chrome-modes': (tone) => <FigureChromeModes tone={tone} />,
  'today-overview': (tone) => <FigureTodayOverview tone={tone} />,
  'today-window': (tone) => <FigureTodayWindow tone={tone} />,
  'today-layouts': (tone) => <FigureTodayLayouts tone={tone} />,
  'today-add-row': (tone) => <FigureTodayAddRow tone={tone} />,
  'today-autofocus': (tone) => <FigureTodayAutofocus tone={tone} />,
  'routine-list': (tone) => <FigureRoutineList tone={tone} />,
  'routine-templates': (tone) => <FigureRoutineTemplates tone={tone} />,
  'my-routine': (tone) => <FigureMyRoutine tone={tone} />,
  'my-routine-apply': (tone) => <FigureMyRoutineApply tone={tone} />,
  history: (tone) => <FigureHistory tone={tone} />,
  story: (tone) => <FigureStory tone={tone} />,
  settings: (tone) => <FigureSettings tone={tone} />,
};

type Props = {
  figureId: GuideBookFigureId;
  isDark: boolean;
};

export function GuideBookFigure({ figureId, isDark }: Props) {
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const tone: Tone = {
    border: rf.border,
    text: rf.text,
    muted: rf.textMuted,
    bg: rf.bg,
    surface: isDark ? rf.surfaceAlt : '#FFFFFF',
    surfaceAlt: isDark ? rf.bg : '#F6F3EB',
    primaryContainer: rf.primaryContainer,
    isDark,
  };
  return FIGURES[figureId](tone);
}

const styles = StyleSheet.create({
  phone: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    minHeight: 220,
  },
  phoneBody: { padding: 10, gap: 8 },
  tabBarPad: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 2,
    paddingHorizontal: 6,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  tabBadgeAbs: { position: 'absolute', top: 2, right: 6, zIndex: 2 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeHitWrap: { alignItems: 'center', gap: 2 },
  modeHit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
  },
  layoutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  layoutHitWrap: { alignItems: 'center', gap: 3 },
  layoutHit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutLabel: { fontSize: 10 },
  centerHint: { paddingVertical: 24, alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  hintTitle: { fontSize: 16 },
  hintBody: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  headerBlock: { paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  headerTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dateLine: { fontSize: 14 },
  windowChip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  windowChipText: { fontSize: 11 },
  emptyBag: { borderWidth: RETRO_BORDER_WIDTH, padding: 12, gap: 6 },
  emptyTitle: { fontSize: 13 },
  emptyBody: { fontSize: 11, lineHeight: 16 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addRowText: { fontSize: 12 },
  sheet: { borderWidth: RETRO_BORDER_WIDTH, padding: 12, gap: 8 },
  sheetTitle: { fontSize: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetLabel: { width: 40, fontSize: 12 },
  timeBox: { flex: 1, borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 10 },
  timeBoxText: { fontSize: 13 },
  dayChoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayChoiceOn: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  dayChoiceOff: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  dayChoiceText: { fontSize: 11 },
  sheetCta: {
    marginTop: 4,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sheetCtaText: { fontSize: 13 },
  tinyNote: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  rowCard: { borderWidth: RETRO_BORDER_WIDTH, padding: 12, gap: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 15 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniBtnText: { fontSize: 11 },
  flowBox: {
    borderWidth: RETRO_BORDER_WIDTH,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowText: { fontSize: 13 },
  flowHighlight: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subTabs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  subTabOn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subTabOff: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subTabText: { fontSize: 11 },
  plusBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  groupCard: { borderWidth: RETRO_BORDER_WIDTH, padding: 10, gap: 8 },
  groupTitle: { fontSize: 11 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    padding: 8,
  },
  itemText: { fontSize: 13, flex: 1 },
  templateList: { gap: 6 },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    padding: 8,
  },
  templateText: { fontSize: 12, flex: 1 },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    padding: 8,
    marginBottom: 4,
  },
  modeBannerText: { fontSize: 12 },
  applyBtn: {
    marginTop: 8,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  applyBtnText: { fontSize: 13 },
  layoutMiniRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  applyChip: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  applyChipText: { fontSize: 11 },
  navMini: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  summaryCard: { borderWidth: RETRO_BORDER_WIDTH, padding: 10, gap: 4, marginBottom: 6 },
  summaryTitle: { fontSize: 13 },
  summaryBody: { fontSize: 11 },
  webPane: { borderWidth: RETRO_BORDER_WIDTH, padding: 12, gap: 4, minHeight: 70 },
  webTitle: { fontSize: 13 },
  webBody: { fontSize: 11 },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingBottom: 4,
  },
  settingsHeader: { fontSize: 18 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  settingsRowText: { flex: 1, fontSize: 13 },
});
