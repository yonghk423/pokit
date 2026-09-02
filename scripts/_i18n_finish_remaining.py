#!/usr/bin/env python3
"""Finish remaining i18n: GuideBookFigures + small leftovers + translate.ts fixes."""
from pathlib import Path

ROOT = Path('/Users/yonghee/Documents/project/pokit')

NEW_KO = {
    'notify.routineStart.title': '루틴 시작',
    'studyNote.shareEmptyBody': '먼저 메모 내용을 적어 주세요.',
    'guideBook.figure.bottomTabsHint': '앱과 같은 아이콘·순서예요. 번호는 아래 설명과 같아요.',
    'guideBook.figure.chromeModesHint': '상단은 데일리·메모·노트·독서 + 설정이에요.',
    'guideBook.figure.sampleDate': '월요일, 7월 30일',
    'guideBook.figure.sampleWindow': '오전 7:00 – 오후 11:00',
    'guideBook.figure.todayTabNote': '④ 하단 「오늘」탭(달력 아이콘)이 선택돼 있어요',
    'guideBook.figure.focusWindowTitle': '집중 구간 시간',
    'guideBook.figure.sampleStart': '오전 7:00',
    'guideBook.figure.endLabel': '마무리',
    'guideBook.figure.sampleEnd': '오후 11:00',
    'guideBook.figure.rangeNote': '④ 적용 기간은 달력에서 시작·끝일을 고를 수 있어요',
    'guideBook.figure.listTodoTitle': '목록 · 투두',
    'guideBook.figure.layoutsHint': '오늘 탭 헤더 오른쪽과 같은 아이콘이에요.',
    'guideBook.figure.longPressNote': '길게 누르기 → 순서 · 집중 중 「종료」',
    'guideBook.figure.addToBag': '담기에 루틴 추가',
    'guideBook.figure.autoFocus': '오늘 탭 집중 상태 자동',
    'guideBook.figure.autoFocusNote': '② 구간 종료 · ③ 설정→담기 유지 · ④ 적용 연동',
    'guideBook.figure.routineListNote': '④ 묶음 편집·이동 · 「+」→ 새 루틴 / 새 묶음',
    'guideBook.figure.fixedRoutine': '고정 루틴',
    'guideBook.figure.morningRoutine': '아침 루틴',
    'guideBook.figure.fixedRoutineNote': '고정 루틴 탭 · 데일리/주말 · 이름 고정',
    'guideBook.figure.applyNote': '맞춘 뒤 그룹의 「적용하기」로 오늘 담기에 반영해요',
    'guideBook.figure.weekly': '주간',
    'guideBook.figure.monthly': '월간',
    'guideBook.figure.weekSummary': '이번 주 요약',
    'guideBook.figure.weekStats': '3일 / 7일 중 활동 · 총 12회 완료',
    'guideBook.figure.topRoutine': '가장 많이 한 루틴: 독서',
    'guideBook.figure.perRoutineCard': '루틴별 완료 카드',
    'guideBook.figure.storyPost': '스토리 글',
    'guideBook.figure.storyBody': '웹 본문을 스크롤하며 읽어요',
    'guideBook.figure.storySaveTitle': '글 제목 · 저장할 카테고리',
    'guideBook.figure.saveToRoutine': '루틴에 저장',
}

NEW_EN = {
    'notify.routineStart.title': 'Routine start',
    'studyNote.shareEmptyBody': 'Write note content first.',
    'guideBook.figure.bottomTabsHint': 'Same icons and order as the app. Numbers match the notes below.',
    'guideBook.figure.chromeModesHint': 'Top bar: Daily, memo, notes, reading + settings.',
    'guideBook.figure.sampleDate': 'Monday, Jul 30',
    'guideBook.figure.sampleWindow': '7:00 AM – 11:00 PM',
    'guideBook.figure.todayTabNote': '④ Bottom Today tab (calendar) is selected',
    'guideBook.figure.focusWindowTitle': 'Focus window',
    'guideBook.figure.sampleStart': '7:00 AM',
    'guideBook.figure.endLabel': 'End',
    'guideBook.figure.sampleEnd': '11:00 PM',
    'guideBook.figure.rangeNote': '④ Pick start/end dates on the calendar for the effective range',
    'guideBook.figure.listTodoTitle': 'List · Todos',
    'guideBook.figure.layoutsHint': 'Same icons as the right side of the Today header.',
    'guideBook.figure.longPressNote': 'Long-press → reorder · Remove while focusing',
    'guideBook.figure.addToBag': 'Add routine to stack',
    'guideBook.figure.autoFocus': 'Today focus starts automatically',
    'guideBook.figure.autoFocusNote': '② Window ends · ③ Keep stack · ④ Apply sync',
    'guideBook.figure.routineListNote': '④ Edit/move bundles · “+” → new routine / bundle',
    'guideBook.figure.fixedRoutine': 'Fixed routines',
    'guideBook.figure.morningRoutine': 'Morning routine',
    'guideBook.figure.fixedRoutineNote': 'Fixed tab · daily/weekend · names locked',
    'guideBook.figure.applyNote': 'Then tap Apply on a group to sync to today’s stack',
    'guideBook.figure.weekly': 'Weekly',
    'guideBook.figure.monthly': 'Monthly',
    'guideBook.figure.weekSummary': 'This week',
    'guideBook.figure.weekStats': 'Active 3 / 7 days · 12 completions',
    'guideBook.figure.topRoutine': 'Most done: Reading',
    'guideBook.figure.perRoutineCard': 'Per-routine completion cards',
    'guideBook.figure.storyPost': 'Story post',
    'guideBook.figure.storyBody': 'Scroll the web article to read',
    'guideBook.figure.storySaveTitle': 'Title · category to save',
    'guideBook.figure.saveToRoutine': 'Save to routine',
}


def fmt_entries(d: dict[str, str]) -> str:
    lines = []
    for k, v in d.items():
        esc = v.replace('\\', '\\\\').replace("'", "\\'")
        lines.append(f"    '{k}': '{esc}',")
    return '\n'.join(lines)


def patch_translate():
    p = ROOT / 'src/shared/lib/i18n/model/translate.ts'
    text = p.read_text()

    # Remove duplicate session.paused in en (keep the first one near en start)
    # The duplicate appears as a lone line before dayPlan.timeModalHint batch
    dup = "\n\n    'session.paused': 'Paused',\n    'dayPlan.timeModalHint':"
    if dup in text:
        text = text.replace(dup, "\n\n    'dayPlan.timeModalHint':", 1)
        print('removed duplicate session.paused')
    else:
        print('WARN: duplicate session.paused pattern not found')

    # Add missing ko keys before closing of ko block (before guideBook.chapterProgress or layoutMode.a11y.cycleIcon area)
    # Insert before "'guideBook.chapterProgress'"
    ko_block = fmt_entries({k: v for k, v in NEW_KO.items() if f"'{k}':" not in text.split("en: {", 1)[0]})
    if ko_block:
        anchor = "    'guideBook.chapterProgress':"
        if anchor not in text:
            raise SystemExit('ko anchor missing')
        # only insert keys not already present in full file for ko section
        text = text.replace(anchor, ko_block + '\n\n' + anchor, 1)
        print('inserted ko keys')

    # Add missing en keys — notify.routineStart.title may already exist in en; skip existing
    en_part = text.split('en: {', 1)[1]
    en_new = {k: v for k, v in NEW_EN.items() if f"'{k}':" not in en_part}
    if en_new:
        en_block = fmt_entries(en_new)
        # insert before guideBook.chapterProgress in en if present, else before final closing of messages
        en_anchor = "    'guideBook.chapterProgress':"
        # find second occurrence (en)
        first = text.find(en_anchor)
        second = text.find(en_anchor, first + 1) if first >= 0 else -1
        if second < 0:
            # append before last `  },` of MESSAGES en
            en_anchor2 = "    'layoutMode.a11y.cycleIcon':"
            second = text.rfind(en_anchor2)
            if second < 0:
                raise SystemExit('en anchor missing')
            text = text[:second] + en_block + '\n\n' + text[second:]
        else:
            text = text[:second] + en_block + '\n\n' + text[second:]
        print('inserted en keys', len(en_new))
    else:
        print('en keys already present')

    # If notify.routineStart.title missing in ko specifically
    ko_only = text.split('en: {', 1)[0]
    if "'notify.routineStart.title':" not in ko_only:
        text = text.replace(
            "    'notify.routineStart.body':",
            "    'notify.routineStart.title': '루틴 시작',\n    'notify.routineStart.body':",
            1,
        )
        print('added notify.routineStart.title to ko')

    if "'studyNote.shareEmptyBody':" not in ko_only and "'studyNote.shareEmptyBody':" in text:
        # was only in en — add to ko near studyNote.deleteMemoMessage
        text = text.replace(
            "    'studyNote.noContent':",
            "    'studyNote.shareEmptyBody': '먼저 메모 내용을 적어 주세요.',\n    'studyNote.noContent':",
            1,
        )
        print('added studyNote.shareEmptyBody to ko')

    p.write_text(text)
    print('ok translate.ts')


def patch_tab_bridge():
    p = ROOT / 'src/pages/day-plan/model/dayPlanTabBridge.tsx'
    text = p.read_text()
    if "from '@shared/lib/i18n'" not in text:
        text = text.replace(
            "from 'react';\n",
            "from 'react';\n\nimport { t } from '@shared/lib/i18n';\n",
            1,
        )
    text = text.replace(
        "label: '시작하기'",
        "label: t('dayPlan.primary.start')",
    )
    text = text.replace(
        "throw new Error('useDayPlanTabBridge: Provider가 (tabs) 레이아웃에 필요합니다.');",
        "throw new Error('useDayPlanTabBridge: Provider is required in the (tabs) layout.');",
    )
    p.write_text(text)
    print('ok dayPlanTabBridge')


def patch_layout_tabs():
    p = ROOT / 'src/pages/day-plan/ui/DayPlanLayoutModeTabs.tsx'
    text = p.read_text()
    old = """/** @deprecated use t('layoutMode.*') via useTranslation */
export const DAY_PLAN_LAYOUT_MODE_LABELS_KO: Record<DayPlanLayoutMode, string> = {
  bag: '목록',
  sections: '시간대',
  spine: '타임라인',
};

"""
    if old in text:
        text = text.replace(old, '')
        p.write_text(text)
        print('ok DayPlanLayoutModeTabs removed KO labels')
    else:
        print('WARN layout labels block not found')


def patch_guidebook():
    p = ROOT / 'src/pages/guide-book/ui/GuideBookFigures.tsx'
    text = p.read_text()

    # Fix ModeRow key
    text = text.replace('key={btn.label}', 'key={btn.labelKey}')

    # HeaderShortcuts — add useTranslation + t(labelKey)
    text = text.replace(
        """function HeaderShortcuts({
  tone,
  showBadges,
}: {
  tone: Tone;
  showBadges?: boolean;
}) {
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
                {item.label}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}""",
        """function HeaderShortcuts({
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
}""",
    )

    replacements = [
        (
            """function FigureTabsMap({ tone }: { tone: Tone }) {
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
}""",
            """function FigureTabsMap({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """function FigureChromeModes({ tone }: { tone: Tone }) {
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <ModeRow tone={tone} showBadges />
      <View style={styles.centerHint}>
        <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
          상단은 데일리·메모·노트·독서 + 설정이에요.
        </ThemedText>
      </View>
      <View style={styles.tabBarPad}>
        <AppTabBar tone={tone} active="today" />
      </View>
    </View>
  );
}""",
            """function FigureChromeModes({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """            <ThemedText style={[styles.dateLine, { color: tone.text }, cityPopFont('800')]}>
              월요일, 7월 30일
            </ThemedText>""",
            """            <ThemedText style={[styles.dateLine, { color: tone.text }, cityPopFont('800')]}>
              {t('guideBook.figure.sampleDate')}
            </ThemedText>""",
        ),
        (
            """              <ThemedText style={[styles.windowChipText, { color: tone.text }, cityPopFont('700')]}>
                오전 7:00 – 오후 11:00
              </ThemedText>""",
            """              <ThemedText style={[styles.windowChipText, { color: tone.text }, cityPopFont('700')]}>
                {t('guideBook.figure.sampleWindow')}
              </ThemedText>""",
        ),
        (
            """        <ThemedText style={[styles.emptyTitle, { color: tone.text }, cityPopFont('800')]}>
          담기 목록이 비어 있어요
        </ThemedText>
        <ThemedText style={[styles.emptyBody, { color: tone.muted }, cityPopFont('500')]}>
          오늘 할 루틴을 추가해 주세요.
        </ThemedText>""",
            """        <ThemedText style={[styles.emptyTitle, { color: tone.text }, cityPopFont('800')]}>
          {t('dayPlan.emptyBagTitle')}
        </ThemedText>
        <ThemedText style={[styles.emptyBody, { color: tone.muted }, cityPopFont('500')]}>
          {t('dayPlan.emptyBagBody')}
        </ThemedText>""",
        ),
        (
            """          <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
            루틴 추가
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        ④ 하단 「오늘」탭(달력 아이콘)이 선택돼 있어요
      </ThemedText>""",
            """          <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
            {t('dayPlan.addRoutine')}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        {t('guideBook.figure.todayTabNote')}
      </ThemedText>""",
        ),
        (
            """function FigureTodayOverview({ tone }: { tone: Tone }) {
  return (""",
            """function FigureTodayOverview({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (""",
        ),
        (
            """function FigureTodayWindow({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="today">
      <View style={[styles.sheet, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <ThemedText style={[styles.sheetTitle, { color: tone.text }, cityPopFont('800')]}>
          집중 구간 시간
        </ThemedText>
        <View style={styles.sheetRow}>
          <Badge n={1} tone={tone} />
          <IconSymbol name="clock" size={16} color={tone.muted} />
          <ThemedText style={[styles.sheetLabel, { color: tone.muted }, cityPopFont('600')]}>{t('guideBook.figure.startLabel')}</ThemedText>
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
}""",
            """function FigureTodayWindow({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """function FigureTodayLayouts({ tone }: { tone: Tone }) {
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg, padding: 12 }]}>
      <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
        목록 · 투두
      </ThemedText>
      <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
        오늘 탭 헤더 오른쪽과 같은 아이콘이에요.
      </ThemedText>""",
            """function FigureTodayLayouts({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.phone, { borderColor: tone.border, backgroundColor: tone.bg, padding: 12 }]}>
      <ThemedText style={[styles.hintTitle, { color: tone.text }, cityPopFont('800')]}>
        {t('guideBook.figure.listTodoTitle')}
      </ThemedText>
      <ThemedText style={[styles.hintBody, { color: tone.muted }, cityPopFont('500')]}>
        {t('guideBook.figure.layoutsHint')}
      </ThemedText>""",
        ),
        (
            """function FigureTodayAddRow({ tone }: { tone: Tone }) {
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
            { n: 2, icon: 'flag.fill' as const, tKey: 'guideBook.figure.priorityHigh' },
            { n: 3, icon: 'checkmark.circle' as const, tKey: 'guideBook.figure.complete' },
            { n: 4, icon: 'slider.horizontal.3' as const, tKey: 'guideBook.figure.settings' },
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
        </View>""",
            """function FigureTodayAddRow({ tone }: { tone: Tone }) {
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
            { n: 3, icon: 'checkmark.circle' as const, tKey: 'guideBook.figure.complete' as const },
            { n: 4, icon: 'slider.horizontal.3' as const, tKey: 'guideBook.figure.settings' as const },
          ].map((a) => (
            <View key={a.tKey} style={styles.rowAction}>
              <Badge n={a.n} tone={tone} />
              <View
                style={[
                  styles.miniBtn,
                  { borderColor: tone.border, backgroundColor: tone.surfaceAlt },
                ]}>
                <IconSymbol name={a.icon} size={14} color={tone.text} />
                <ThemedText style={[styles.miniBtnText, { color: tone.text }, cityPopFont('700')]}>
                  {t(a.tKey)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>""",
        ),
        (
            """            <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
              루틴 추가
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Badge n={5} tone={tone} />
          <ThemedText style={[styles.tinyNote, { color: tone.muted, flex: 1 }, cityPopFont('500')]}>
            길게 누르기 → 순서 · 집중 중 「종료」
          </ThemedText>
        </View>""",
            """            <ThemedText style={[styles.addRowText, { color: tone.text }, cityPopFont('700')]}>
              {t('dayPlan.addRoutine')}
            </ThemedText>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Badge n={5} tone={tone} />
          <ThemedText style={[styles.tinyNote, { color: tone.muted, flex: 1 }, cityPopFont('500')]}>
            {t('guideBook.figure.longPressNote')}
          </ThemedText>
        </View>""",
        ),
        (
            """function FigureTodayAutofocus({ tone }: { tone: Tone }) {
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
}""",
            """function FigureTodayAutofocus({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """function FigureRoutineList({ tone }: { tone: Tone }) {
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
        </View>""",
            """function FigureRoutineList({ tone }: { tone: Tone }) {
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
        </View>""",
        ),
        (
            """        <ThemedText style={[styles.groupTitle, { color: tone.muted }, cityPopFont('700')]}>
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
        </ThemedText>""",
            """        <ThemedText style={[styles.groupTitle, { color: tone.muted }, cityPopFont('700')]}>
          {t('catalog.groupHealth')}
        </ThemedText>
        <View style={[styles.itemRow, { borderColor: tone.border }]}>
          <Badge n={3} tone={tone} />
          <IconSymbol name="book.closed.fill" size={16} color={pill.activeIcon} />
          <ThemedText style={[styles.itemText, { color: tone.text }, cityPopFont('700')]}>
            {t('guideBook.figure.reading')}
          </ThemedText>
          <IconSymbol name="chevron.right" size={14} color={tone.muted} />
        </View>
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.routineListNote')}
        </ThemedText>""",
        ),
        (
            """function FigureRoutineTemplates({ tone }: { tone: Tone }) {
  const items = [
    { n: 1, icon: 'checklist' as const, tKey: 'guideBook.figure.templateChecklist' },
    { n: 2, icon: 'note.text' as const, tKey: 'guideBook.figure.templateMemo' },
    { n: 3, icon: 'chart.bar.fill' as const, tKey: 'guideBook.figure.templateMetric' },
    { n: 4, icon: 'plus.circle' as const, tKey: 'guideBook.figure.templateCounter' },
    { n: 5, icon: 'bell' as const, tKey: 'guideBook.figure.templateReminder' },
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
}""",
            """function FigureRoutineTemplates({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """function FigureMyRoutine({ tone }: { tone: Tone }) {
  return (
    <PhoneShell tone={tone} tabActive="mine">""",
            """function FigureMyRoutine({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  return (
    <PhoneShell tone={tone} tabActive="mine">""",
        ),
        (
            """            <ThemedText style={[styles.subTabText, { color: tone.text }, cityPopFont('800')]}>
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
        </ThemedText>""",
            """            <ThemedText style={[styles.subTabText, { color: tone.text }, cityPopFont('800')]}>
              {t('tabs.myRoutines')}
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
              {t('guideBook.figure.fixedRoutine')}
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={[styles.groupCard, { borderColor: tone.border, backgroundColor: tone.surface }]}>
        <View style={styles.sheetRow}>
          <ThemedText style={[styles.groupTitle, { color: tone.text, flex: 1 }, cityPopFont('800')]}>
            {t('guideBook.figure.morningRoutine')}
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
        <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
          {t('guideBook.figure.fixedRoutineNote')}
        </ThemedText>""",
        ),
        (
            """function FigureMyRoutineApply({ tone }: { tone: Tone }) {
  const rows = [
    { n: 1, icon: 'list.bullet.rectangle' as const, tKey: 'guideBook.figure.myRoutineList' },
    { n: 2, icon: 'plus' as const, tKey: 'guideBook.figure.myRoutineAdd' },
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
}""",
            """function FigureMyRoutineApply({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const rows = [
    { n: 1, icon: 'list.bullet.rectangle' as const, tKey: 'guideBook.figure.myRoutineList' as const },
    { n: 2, icon: 'plus' as const, tKey: 'guideBook.figure.myRoutineAdd' as const },
  ];
  return (
    <PhoneShell tone={tone} tabActive="mine">
      <View style={styles.templateList}>
        {rows.map((r) => (
          <View key={r.tKey} style={[styles.templateRow, { borderColor: tone.border }]}>
            <Badge n={r.n} tone={tone} />
            <IconSymbol name={r.icon} size={16} color={tone.text} />
            <ThemedText
              style={[styles.templateText, { color: tone.text, flex: 1 }, cityPopFont('600')]}
              numberOfLines={2}>
              {t(r.tKey)}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={[styles.tinyNote, { color: tone.muted }, cityPopFont('500')]}>
        {t('guideBook.figure.applyNote')}
      </ThemedText>
    </PhoneShell>
  );
}""",
        ),
        (
            """function FigureHistory({ tone }: { tone: Tone }) {
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
        </View>""",
            """function FigureHistory({ tone }: { tone: Tone }) {
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
        </View>""",
        ),
        (
            """          <ThemedText style={[styles.summaryTitle, { color: tone.text }, cityPopFont('800')]}>
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
      </View>""",
            """          <ThemedText style={[styles.summaryTitle, { color: tone.text }, cityPopFont('800')]}>
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
      </View>""",
        ),
        (
            """function FigureStory({ tone }: { tone: Tone }) {
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
}""",
            """function FigureStory({ tone }: { tone: Tone }) {
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
}""",
        ),
        (
            """function FigureSettings({ tone }: { tone: Tone }) {
  const rows = [
    { n: 1, icon: 'clock' as const, tKey: 'settings.dayPlanWindow', sectionKey: 'guideBook.figure.settingsDayPlan' },
    { n: 2, icon: 'book' as const, tKey: 'guideBook.figure.settingsIntroGuide', sectionKey: 'guideBook.figure.settingsDayPlan' },
    { n: 3, icon: 'bell.fill' as const, tKey: 'guideBook.figure.settingsNotification', sectionKey: 'guideBook.figure.settingsNotification' },
    { n: 4, icon: 'square.grid.2x2' as const, tKey: 'guideBook.figure.settingsDayPlanViewTheme', sectionKey: 'guideBook.figure.settingsDisplay' },
    { n: 5, icon: 'envelope.fill' as const, tKey: 'guideBook.figure.settingsSupportReset', sectionKey: 'guideBook.figure.settingsSupportData' },
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
}""",
            """function FigureSettings({ tone }: { tone: Tone }) {
  const { t } = useTranslation();
  const rows = [
    { n: 1, icon: 'clock' as const, tKey: 'settings.dayPlanWindow' as const, sectionKey: 'guideBook.figure.settingsDayPlan' as const },
    { n: 2, icon: 'book' as const, tKey: 'guideBook.figure.settingsIntroGuide' as const, sectionKey: 'guideBook.figure.settingsDayPlan' as const },
    { n: 3, icon: 'bell.fill' as const, tKey: 'guideBook.figure.settingsNotification' as const, sectionKey: 'guideBook.figure.settingsNotification' as const },
    { n: 4, icon: 'square.grid.2x2' as const, tKey: 'guideBook.figure.settingsDayPlanViewTheme' as const, sectionKey: 'guideBook.figure.settingsDisplay' as const },
    { n: 5, icon: 'envelope.fill' as const, tKey: 'guideBook.figure.settingsSupportReset' as const, sectionKey: 'guideBook.figure.settingsSupportData' as const },
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
        <View key={r.tKey} style={[styles.settingsRow, { borderColor: tone.border }]}>
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
}""",
        ),
    ]

    for i, (old, new) in enumerate(replacements):
        if old not in text:
            raise SystemExit(f'GuideBook replacement {i} missing:\n{old[:120]!r}')
        text = text.replace(old, new, 1)

    # Remove unused t in GuideBookFigure if still there (kept for locale subscription — keep it)
    p.write_text(text)
    print('ok GuideBookFigures')


def main():
    patch_translate()
    patch_tab_bridge()
    patch_layout_tabs()
    patch_guidebook()


if __name__ == '__main__':
    main()
