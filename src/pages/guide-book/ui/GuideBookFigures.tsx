import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { GuideBookFigureId } from '../lib/guideBookPages';

/** `DayPlanCustomTabBar` 와 동일 */
const APP_TABS = [
  { key: 'today', icon: 'calendar', labelKey: 'guideBook.figure.tabToday', n: 1 },
  { key: 'routine', icon: 'list.bullet.rectangle', labelKey: 'guideBook.figure.tabRoutine', n: 2 },
  { key: 'mine', icon: 'figure.walk', labelKey: 'guideBook.figure.tabMyRoutine', n: 3 },
  { key: 'history', icon: 'clock.arrow.circlepath', labelKey: 'guideBook.figure.tabHistory', n: 4 },
  { key: 'story', icon: 'book', labelKey: 'guideBook.figure.tabStory', n: 5 },
] as const;

/** `PlanModeSwitch` 와 동일 */
const MODE_BUTTONS = [
  { icon: 'list.bullet.rectangle', labelKey: 'planMode.daily', n: 1 },
  { icon: 'note.text', labelKey: 'planMode.quickMemo', n: 2 },
  { icon: 'square.and.pencil', labelKey: 'planMode.dayNote', n: 3 },
  { icon: 'book.closed.fill', labelKey: 'guideBook.figure.reading', n: 4 },
] as const;

/** 오늘 탭 헤더 — 목록 + 투두 바로가기 */
const HEADER_SHORTCUTS = [
  { key: 'bag', icon: 'list.bullet.rectangle', labelKey: 'guideBook.figure.headerList', n: 1 },
  { key: 'todo', icon: 'checklist', labelKey: 'guideBook.figure.headerTodo', n: 2 },
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
            <View key={btn.labelKey} style={styles.modeHitWrap}>
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
        {showBadges ? <Badge n={5} tone={tone} /> : null}
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

function HeaderShortcuts({
  tone,
  showBadges,
}: {
  tone: Tone;
  showBadges?: boolean;
}) {
  const { t } = useTranslation();
  const pill = tabPillColors(tone.isDark);
  return (
    <View style={styles.layoutRow}>
      {HEADER_SHORTCUTS.map((item) => {
        const on = item.key === 'bag';
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
            {showBadges ? (
              <ThemedText style={[styles.layoutLabel, { color: tone.muted }, cityPopFont('600')]}>
                {t(item.labelKey)}
              </ThemedText>
            ) : null}
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
  const { t } = useTranslation();
  return (
    <PhoneShell tone={tone} tabActive="today" showTabBadges>
      <View style={styles.centerHint}>
        <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
          {t('guideBook.figure.bottomTabs')}
        </ThemedText>
        <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.bottomTabsHint')}
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureChromeModes({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <ModeRow tone={tone} showBadges />
      <View style={styles.centerHint}>
        <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.chromeModesHint')}
        </ThemedText>
      </View>
      <View style={styles.tabBarPad}>
        <AppTabBar tone={tone} active="today" />
      </View>
    </View>
  );
}

function FigureTodayOverview({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.headerBlock, { borderBottomColor: tone.border }]}>
        <View style={styles.headerTop}>
          <Badge n={1} tone={tone} />
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText style={[styles.dateLine, { color: tone.text }, cityPopFont('800')]}>
              {t('guideBook.figure.sampleDate')}
            </ThemedText>
            <View
              style={[
                styles.windowChip,
                { borderColor: tone.border, backgroundColor: tone.primaryContainer },
              ]}>
              <ThemedText style={[styles.windowChipText, { color: tone.text }, cityPopFont('700')]}>
                {t('guideBook.figure.sampleWindow')}
              </ThemedText>
            </View>
          </View>
          <View>
            <Badge n={3} tone={tone} />
            <HeaderShortcuts tone={tone} />
          </View>
        </View>
      </View>
      <View style={styles.quoteRow}>
        <Badge n={2} tone={tone} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText style={[styles.quoteKicker, { color: tone.muted }, cityPopFont('700')]}>
            {t('dayPlan.dailyQuote.kicker')}
          </ThemedText>
          <ThemedText style={[styles.quoteBody, { color: tone.text }, cityPopFont('600')]} numberOfLines={2}>
            {t('guideBook.figure.sampleDailyQuote')}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.emptyBag, { borderColor: tone.border }]}>
        <Badge n={4} tone={tone} />
        <ThemedText style={[styles.emptyTitle, { color: tone.text }, cityPopFont('800')]}>
          {t('dayPlan.emptyBagTitle')}
        </ThemedText>
        <ThemedText style={[styles.emptyBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('dayPlan.emptyBagBody')}
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
            {t('dayPlan.addRoutine')}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        {t('guideBook.figure.todayTabNote')}
      </ThemedText>
    </PhoneShell>
  );
}

function FigureTodayWindow({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.sheet, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <ThemedText style={[styles.sheetTitle, { color: tone.text }, cityPopFont('800')]}>
          {t('guideBook.figure.focusWindowTitle')}
        </ThemedText>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="clock" size={16} color={tone.muted} />
          <ThemedText style={[styles.sheetLabel, { color: tone.muted }, cityPopFont('600')]}>{t('guideBook.figure.startLabel')}</ThemedText>
          <View style={[styles.timeBox, { borderColor: tone.border }]}>
            <ThemedText style={[styles.timeBoxText, { color: tone.text }, cityPopFont('800')]}>
              {t('guideBook.figure.sampleStart')}
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <View style={{ width: 18 }} />
          <IconSymbol name="moon.stars" size={16} color={tone.muted} />
          <ThemedText style={[styles.sheetLabel, { color: tone.muted }, cityPopFont('600')]}>
            {t('guideBook.figure.endLabel')}
          </ThemedText>
          <View style={[styles.timeBox, { borderColor: tone.border }]}>
            <ThemedText style={[styles.timeBoxText, { color: tone.text }, cityPopFont('800')]}>
              {t('guideBook.figure.sampleEnd')}
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
              {t('dayRhythm.today')}
            </ThemedText>
          </View>
          <View style={[styles.dayChoiceOff, { borderColor: tone.border }]}>
            <ThemedText style={[styles.dayChoiceText, { color: tone.muted }, cityPopFont('600')]}>
              {t('dayRhythm.nextDay')}
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
            {t('dayPlan.rangeDone')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.rangeNote')}
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureTodayLayouts({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg, padding: 12 }]}>
      <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
        {t('guideBook.figure.listTodoTitle')}
      </ThemedText>
      <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
        {t('guideBook.figure.layoutsHint')}
      </ThemedText>
      <View style={{ height: 10 }} />
      <HeaderShortcuts tone={tone} showBadges />
    </View>
  );
}

function FigureTodayAddRow({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const pill = tabPillColors(tone.isDark);
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.rowCard, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.rowHead}>
          <IconSymbol name="book.closed.fill" size={18} color={pill.activeIcon} />
          <ThemedText style={[styles.rowTitle, { color: tone.text }, cityPopFont('800')]}>{t('guideBook.figure.reading')}</ThemedText>
        </View>
        <View style={styles.rowActions}>
          {[
            { n: 2, icon: 'flag.fill' as const, tKey: 'guideBook.figure.priorityHigh' as const },
            {
              n: 3,
              icon: 'checkmark' as const,
              tKey: 'guideBook.figure.complete' as const,
              fill: '#09090b',
              iconColor: RetroFlatColors.light.bgMint,
            },
            { n: 4, icon: 'chevron.down' as const, tKey: 'guideBook.figure.expandRow' as const },
          ].map((a) => (
            <View key={a.tKey} style={styles.rowAction}>
              <Badge n={a.n} tone={tone} />
              <View
                style={[
                  styles.miniBtn,
                  {
                    borderColor: tone.border,
                    backgroundColor: a.fill ?? tone.surfaceAlt,
                  },
                ]}>
                <IconSymbol name={a.icon} size={14} color={a.iconColor ?? tone.text} />
                <ThemedText
                  style={[
                    styles.miniBtnText,
                    { color: a.iconColor ?? tone.text },
                    cityPopFont('700'),
                  ]}>
                  {t(a.tKey)}
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
              {t('dayPlan.addRoutine')}
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Badge n={5} tone={tone} />
          <ThemedText style={[styles.tinyNote, { color: tone.muted, flex: 1 }, cityPopFont('500')]}>
            {t('guideBook.figure.longPressNote')}
          </ThemedText>
        </View>
      </View>
    </PhoneShell>
  );
}

function FigureTodayAutofocus({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.flowBox, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.flowStep}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="plus.circle.fill" size={18} color={tone.text} />
          <ThemedText style={[styles.flowText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.addToBag')}
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
            {t('guideBook.figure.autoFocus')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.autoFocusNote')}
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureColorChips({ tone }: { tone: Tone }) {
  const chips = ['#F6E7A1', '#B8E0D2', '#F2C6D8', '#F5C9A8'];
  return (
    <View style={styles.colorChipRow}>
      {chips.map((c, i) => (
        <View
          key={c}
          style={[
            styles.colorChip,
            {
              backgroundColor: c,
              borderColor: tone.border,
              borderWidth: i === 0 ? 2 : 1.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

function FigureRoutineList({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
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
            {t('catalog.routineListTab')}
          </ThemedText>
        </View>
        <View style={[styles.subTabOff, { borderColor: tone.border }]}>
          <ThemedText style={[styles.subTabText, { color: tone.muted }, cityPopFont('600')]}>
            {t('catalog.routineTemplatesTab')}
          </ThemedText>
        </View>
        <View style={{ marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Badge n={2} tone={tone} />
          <View
            style={[
              styles.plusBtn,
              { borderColor: tone.border, backgroundColor: pill.activeBg },
            ]}>
            <IconSymbol name="plus" size={16} color={tone.text} style={styles.plusBtnIcon} />
          </View>
        </View>
      </View>
      <View
        style={[
          styles.groupCard,
          { borderColor: tone.border, backgroundColor: '#F6E7A1' },
        ]}>
        <View style={styles.sheetRow}>
          <Badge n={3} tone={tone} />
          <IconSymbol name="chevron.down" size={12} color={tone.text} />
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            {t('catalog.groupHealth')}
          </ThemedText>
        </View>
        <FigureColorChips tone={tone} />
        <View style={[styles.itemRow, { borderColor: tone.border, backgroundColor: tone.surface }]}>
          <Badge n={4} tone={tone} />
          <IconSymbol name="book.closed.fill" size={16} color={pill.activeIcon} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.reading')}
          </ThemedText>
          <IconSymbol name="chevron.right" size={14} color={tone.muted} />
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.routineListNote')}
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureRoutineTemplates({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const items = [
    { n: 1, icon: 'checklist' as const, tKey: 'guideBook.figure.templateChecklist' as const },
    { n: 2, icon: 'note.text' as const, tKey: 'guideBook.figure.templateMemo' as const },
    { n: 3, icon: 'chart.bar.fill' as const, tKey: 'guideBook.figure.templateMetric' as const },
    { n: 4, icon: 'plus.circle' as const, tKey: 'guideBook.figure.templateCounter' as const },
    { n: 5, icon: 'bell' as const, tKey: 'guideBook.figure.templateReminder' as const },
  ];
  return (
    <PhoneShell tone={tone} tabActive="routine">
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        {t('fixedRoutine.templatesHint')}
      </ThemedText>
      <View style={styles.templateList}>
        {items.map((it) => (
          <View key={it.tKey} style={[styles.templateRow, { borderColor: tone.border }]}>
            <Badge n={it.n} tone={tone} />
            <IconSymbol name={it.icon} size={16} color={tone.text} />
            <ThemedText style={[styles.templateText, { color: tone.text }, cityPopFont('700')]}>
              {t(it.tKey)}
            </ThemedText>
            <IconSymbol name="chevron.right" size={12} color={tone.muted} />
          </View>
        ))}
      </View>
    </PhoneShell>
  );
}

function FigureMyRoutine({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const pill = tabPillColors(tone.isDark);
  return (
    <PhoneShell tone={tone} tabActive="mine">
      <View style={[styles.subTabs, { marginBottom: 8 }]}>
        <ThemedText style={[styles.tinyNote, { color: tone.muted, flex: 1 }, cityPopFont('500')]}>
          {t('fixedRoutine.addGroup')}
        </ThemedText>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Badge n={3} tone={tone} />
          <View
            style={[
              styles.plusBtn,
              { borderColor: tone.border, backgroundColor: pill.activeBg },
            ]}>
            <IconSymbol name="plus" size={16} color={tone.text} style={styles.plusBtnIcon} />
          </View>
        </View>
      </View>
      <View
        style={[
          styles.groupCard,
          { borderColor: tone.border, backgroundColor: '#F6E7A1', marginBottom: 6 },
        ]}>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="chevron.down" size={12} color={tone.text} />
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            {t('fixedRoutine.presetDaily')}
          </ThemedText>
          <Badge n={4} tone={tone} />
          <View
            style={[
              styles.applyChip,
              { borderColor: tone.border, backgroundColor: tone.primaryContainer },
            ]}>
            <ThemedText style={[styles.applyChipText, { color: tone.text }, cityPopFont('800')]}>
              {t('fixedRoutine.apply')}
            </ThemedText>
          </View>
        </View>
        <FigureColorChips tone={tone} />
        <View style={[styles.itemRow, { borderColor: tone.border, backgroundColor: tone.surface }]}>
          <IconSymbol name="book.closed.fill" size={14} color={pill.activeIcon} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.reading')}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.groupCard, { borderColor: tone.border, backgroundColor: '#B8E0D2' }]}>
        <View style={styles.sheetRow}>
          <Badge n={2} tone={tone} />
          <IconSymbol name="chevron.right" size={12} color={tone.text} />
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            {t('fixedRoutine.presetWeekend')}
          </ThemedText>
          <View style={[styles.applyChip, { borderColor: tone.border, backgroundColor: tone.surface }]}>
            <ThemedText style={[styles.applyChipText, { color: tone.muted }, cityPopFont('700')]}>
              {t('fixedRoutine.apply')}
            </ThemedText>
          </View>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted, marginTop: 4 }, cityPopFont('500')]}>
        {t('guideBook.figure.fixedRoutineNote')}
      </ThemedText>
    </PhoneShell>
  );
}

function FigureMyRoutineApply({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const pill = tabPillColors(tone.isDark);
  return (
    <PhoneShell tone={tone} tabActive="mine">
      <View
        style={[
          styles.groupCard,
          { borderColor: tone.border, backgroundColor: '#F6E7A1' },
        ]}>
        <View style={styles.sheetRow}>
          <IconSymbol name="chevron.down" size={12} color={tone.text} />
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            {t('guideBook.figure.morningRoutine')}
          </ThemedText>
          <Badge n={3} tone={tone} />
          <View
            style={[
              styles.applyChip,
              { borderColor: tone.border, backgroundColor: tone.primaryContainer },
            ]}>
            <ThemedText style={[styles.applyChipText, { color: tone.text }, cityPopFont('800')]}>
              {t('fixedRoutine.apply')}
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <FigureColorChips tone={tone} />
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.postItColorHint')}
        </ThemedText>
        <View style={[styles.itemRow, { borderColor: tone.border, backgroundColor: tone.surface }]}>
          <Badge n={2} tone={tone} />
          <IconSymbol name="book.closed.fill" size={14} color={pill.activeIcon} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.reading')}
          </ThemedText>
          <ThemedText style={[styles.applyChipText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.itemOn')}
          </ThemedText>
        </View>
        <View style={[styles.itemRow, { borderColor: tone.border, backgroundColor: tone.surface }]}>
          <IconSymbol name="plus" size={14} color={tone.text} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('600')]}>
            {t('fixedRoutine.addItem')}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted, marginTop: 4 }, cityPopFont('500')]}>
        {t('guideBook.figure.applyNote')}
      </ThemedText>
    </PhoneShell>
  );
}

function FigureHistory({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
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
            {t('guideBook.figure.weekly')}
          </ThemedText>
        </View>
        <View style={[styles.subTabOff, { borderColor: tone.border }]}>
          <ThemedText style={[styles.subTabText, { color: tone.muted }, cityPopFont('600')]}>
            {t('guideBook.figure.monthly')}
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
            {t('guideBook.figure.weekSummary')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.weekStats')}
        </ThemedText>
        <ThemedText style={[styles.summaryBody, { color: tone.text }, cityPopFont('700')]}>
          {t('guideBook.figure.topRoutine')}
        </ThemedText>
      </View>
      <View style={[styles.itemRow, { borderColor: tone.border }]}>
        <Badge n={4} tone={tone} />
        <IconSymbol name="book.closed.fill" size={16} color={tone.text} />
        <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
          {t('guideBook.figure.perRoutineCard')}
        </ThemedText>
      </View>
    </PhoneShell>
  );
}

function FigureStory({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
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
            {t('guideBook.figure.storyPost')}
          </ThemedText>
        </View>
        <ThemedText style={[styles.webBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.storyBody')}
        </ThemedText>
      </View>
      <View style={[styles.sheet, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.sheetRow}>
          <Badge n={2} tone={tone} />
          <ThemedText style={[styles.sheetTitle, { color: tone.text }, cityPopFont('800')]}>
            {t('guideBook.figure.storySaveTitle')}
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
            {t('guideBook.figure.saveToRoutine')}
          </ThemedText>
        </View>
      </View>
    </PhoneShell>
  );
}

function FigureSettings({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const rows = [
    { n: 1, icon: 'clock' as const, tKey: 'settings.dayPlanWindow' as const, sectionKey: 'guideBook.figure.settingsDayPlan' as const },
    { n: 2, icon: 'book' as const, tKey: 'guideBook.figure.settingsIntroGuide' as const, sectionKey: 'guideBook.figure.settingsDayPlan' as const },
    { n: 3, icon: 'textformat' as const, tKey: 'guideBook.figure.settingsFont' as const, sectionKey: 'guideBook.figure.settingsFontSection' as const },
    { n: 4, icon: 'envelope.fill' as const, tKey: 'guideBook.figure.settingsSupport' as const, sectionKey: 'guideBook.figure.settingsSupportData' as const },
    { n: 5, icon: 'arrow.counterclockwise' as const, tKey: 'settings.resetData' as const, sectionKey: 'guideBook.figure.settingsSupportData' as const },
  ];
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <View style={styles.settingsHeaderRow}>
        <IconSymbol name="gearshape" size={18} color={tone.text} />
        <ThemedText style={[styles.settingsHeader, { color: tone.text }, cityPopFont('800')]}>
          {t('settings.title')}
        </ThemedText>
      </View>
      {rows.map((r) => (
        <View key={`${r.n}-${r.tKey}`} style={[styles.settingsRow, { borderColor: tone.border }]}>
          <Badge n={r.n} tone={tone} />
          <IconSymbol name={r.icon} size={18} color={tone.muted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText style={[styles.settingsRowText, { color: tone.text }, cityPopFont('700')]}>
              {t(r.tKey)}
            </ThemedText>
            <ThemedText style={[styles.tinyNote, { color: tone.muted, marginTop: 0 }, cityPopFont('500')]}>
              {t(r.sectionKey)}
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
  useTranslation(); // locale subscription — child figures call t() themselves
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
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  quoteKicker: { fontSize: 10, lineHeight: 12, letterSpacing: 0.3 },
  quoteBody: { fontSize: 12, lineHeight: 17 },
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
  /** SF Symbol plus 광학 보정 — 박스크기 대비 위로 떠 보이는 문제 */
  plusBtnIcon: {
    marginTop: 1,
  },
  groupCard: { borderWidth: RETRO_BORDER_WIDTH, padding: 10, gap: 8 },
  groupTitle: { fontSize: 11 },
  colorChipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorChip: { width: 14, height: 14, borderRadius: 7 },
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
