#!/usr/bin/env python3
from pathlib import Path
ROOT = Path('/Users/yonghee/Documents/project/pokit')

def patch(path, replacements, insert_after=None, insert=''):
    p = ROOT / path
    text = p.read_text()
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f'MISSING in {path}: {old[:120]!r}')
        text = text.replace(old, new, 1)
    if insert_after and insert.strip() and insert not in text:
        if insert_after not in text:
            raise SystemExit(f'anchor missing in {path}')
        text = text.replace(insert_after, insert_after + insert, 1)
    p.write_text(text)
    print('ok', path)

# FixedRoutinePriorityWindowCard
patch('src/pages/day-plan/ui/FixedRoutinePriorityWindowCard.tsx', [
("import { addDaysToLocalDateKey, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';",
 "import { addDaysToLocalDateKey, parseHHmmToMinutes } from '@entities/day-plan';"),
("import { ThemedText } from '@shared/ui/themed-text';",
 "import { formatDateKeyCompact, formatHhmmClock } from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
("import {\n  endsOnNextCalendarDay,\n  formatDateKeyCompactKo,\n  sortedPlanDateRange,\n} from '../lib/dayPlanEditorShared';",
 "import { endsOnNextCalendarDay, sortedPlanDateRange } from '../lib/dayPlanEditorShared';"),
])
patch('src/pages/day-plan/ui/FixedRoutinePriorityWindowCard.tsx', [
("function formatPriorityWindowLines(\n  start: string,\n  end: string,\n  planDateKey: string,\n  planDateKeyEnd: string,\n): { dateLine: string; timeLine: string } {",
 "function formatPriorityWindowLines(\n  start: string,\n  end: string,\n  planDateKey: string,\n  planDateKeyEnd: string,\n  locale: import('@shared/lib/i18n').AppLocale,\n): { dateLine: string; timeLine: string } {"),
("? formatDateKeyCompactKo(lo)", '? formatDateKeyCompact(lo, locale)'),
(": `${formatDateKeyCompactKo(lo)} ~ ${formatDateKeyCompactKo(endDateKey)}`;", ": `${formatDateKeyCompact(lo, locale)} ~ ${formatDateKeyCompact(endDateKey, locale)}`;"),
("const startLabel = formatHhmmClockKo(start);", 'const startLabel = formatHhmmClock(start, locale);'),
("const endLabel = formatHhmmClockKo(end);", 'const endLabel = formatHhmmClock(end, locale);'),
("? `${startLabel} — ${formatDateKeyCompactKo(endDateKey)} ${endLabel}`", '? `${startLabel} — ${formatDateKeyCompact(endDateKey, locale)} ${endLabel}`'),
], insert_after=': Props) {\n  const { dateLine, timeLine } = formatPriorityWindowLines(', insert='')
patch('src/pages/day-plan/ui/FixedRoutinePriorityWindowCard.tsx', [
('}: Props) {\n  const { dateLine, timeLine } = formatPriorityWindowLines(\n    priorityStart,\n    priorityEnd,\n    planDateKey,\n    planDateKeyEnd,\n  );',
 '}: Props) {\n  const { locale, t } = useTranslation();\n  const { dateLine, timeLine } = formatPriorityWindowLines(\n    priorityStart,\n    priorityEnd,\n    planDateKey,\n    planDateKeyEnd,\n    locale,\n  );'),
('<ThemedText style={[styles.title, { color: ink }]}>타임라인 집중 구간</ThemedText>', "<ThemedText style={[styles.title, { color: ink }]}>{t('fixedRoutine.spineFocusWindowTitle')}</ThemedText>"),
('accessibilityLabel="집중 구간 설정"', "accessibilityLabel={t('fixedRoutine.focusWindowSettingsA11y')}"),
])

# FixedRoutinePriorityWindowSheet
patch('src/pages/day-plan/ui/FixedRoutinePriorityWindowSheet.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after='}: Props) {\n  const insets = useSafeAreaInsets();', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/FixedRoutinePriorityWindowSheet.tsx', [
('집중 구간 설정', "{t('fixedRoutine.focusWindowSheetTitle')}"),
('accessibilityLabel="닫기"', "accessibilityLabel={t('common.close')}"),
('타임라인에 표시되는 하루 집중 구간이에요. 오늘 탭 타임라인과 함께 반영돼요.', "{t('fixedRoutine.focusWindowSheetLead')}"),
('label="시작"', "label={t('goalDetail.study.start')}"),
('hint="집중 구간이 시작되는 시각"', "hint={t('fixedRoutine.focusWindowStartHint')}"),
('label="종료"', "label={t('goalDetail.study.end')}"),
('hint="집중 구간이 끝나는 시각"', "hint={t('fixedRoutine.focusWindowEndHint')}"),
('accessibilityLabel="취소"', "accessibilityLabel={t('common.cancel')}"),
('              취소', "              {t('common.cancel')}"),
('accessibilityLabel="집중 구간 저장"', "accessibilityLabel={t('fixedRoutine.focusWindowSaveA11y')}"),
('              저장', "              {t('common.save')}"),
])

# FixedRoutineEditorModal
patch('src/pages/day-plan/ui/FixedRoutineEditorModal.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after=': Props) {\n  const insets = useSafeAreaInsets();', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/FixedRoutineEditorModal.tsx', [
('<ThemedText style={[styles.sheetTitle, { color: ink }]}>나만의 루틴</ThemedText>', "<ThemedText style={[styles.sheetTitle, { color: ink }]}>{t('tabs.myRoutines')}</ThemedText>"),
('담기 탭 위쪽에 모아 둘 항목을 고르세요.', "{t('fixedRoutine.editorLead')}"),
('<ThemedText style={[styles.blockTitle, { color: ink }]}>이 세트에 넣은 순서</ThemedText>', "<ThemedText style={[styles.blockTitle, { color: ink }]}>{t('fixedRoutine.editorOrderBlock')}</ThemedText>"),
('아직 없어요. 아래에서 항목을 추가해 주세요.', "{t('fixedRoutine.editorOrderEmpty')}"),
('<ThemedText style={[styles.blockTitle, { color: ink }]}>추가할 항목</ThemedText>', "<ThemedText style={[styles.blockTitle, { color: ink }]}>{t('fixedRoutine.editorAddBlock')}</ThemedText>"),
('추가할 수 있는 항목이 없어요.', "{t('fixedRoutine.editorAddEmpty')}"),
('accessibilityLabel={`${cat.label} 나만의 루틴 세트에 추가`}', "accessibilityLabel={t('fixedRoutine.editorAddItemA11y', { label: cat.label })}"),
('accessibilityLabel="취소"', "accessibilityLabel={t('common.cancel')}"),
('              취소', "              {t('common.cancel')}"),
('accessibilityLabel="저장"', "accessibilityLabel={t('common.save')}"),
('              저장', "              {t('common.save')}"),
])

# PriorityMealSlotSectionHeader
patch('src/pages/day-plan/ui/PriorityMealSlotSectionHeader.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after=': Props) {\n  const timeNode = (', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/PriorityMealSlotSectionHeader.tsx', [
('accessibilityLabel={`${title} 시작 시각 변경`}', "accessibilityLabel={t('dayPlan.mealSlotStartChangeA11y', { title })}"),
])

# RenameCustomGroupSheet
patch('src/pages/day-plan/ui/RenameCustomGroupSheet.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
("  title = '묶음 이름 바꾸기',\n  placeholder = '묶음 이름',", "  title,\n  placeholder,"),
], insert_after='}: Props) {\n  const insets = useSafeAreaInsets();', insert='\n  const { t } = useTranslation();\n  const resolvedTitle = title ?? t(\'catalog.renameGroupTitle\');\n  const resolvedPlaceholder = placeholder ?? t(\'catalog.groupNamePlaceholder\');\n')
patch('src/pages/day-plan/ui/RenameCustomGroupSheet.tsx', [
('<ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>', '<ThemedText style={[styles.title, { color: ink }]}>{resolvedTitle}</ThemedText>'),
('accessibilityLabel="닫기"', "accessibilityLabel={t('common.close')}"),
('<ThemedText style={[styles.fieldLabel, { color: ink }]}>이름</ThemedText>', "<ThemedText style={[styles.fieldLabel, { color: ink }]}>{t('common.name')}</ThemedText>"),
('최대 {LABEL_MAX}자까지 입력할 수 있어요', "{t('catalog.renameGroupMaxHint', { count: LABEL_MAX })}"),
('placeholder={placeholder}', 'placeholder={resolvedPlaceholder}'),
('accessibilityLabel="저장"', "accessibilityLabel={t('common.save')}"),
('                저장', "                {t('common.save')}"),
])

# ReadingPlanSection
patch('src/pages/day-plan/ui/ReadingPlanSection.tsx', [
("import {\n  loadGoalDetailCategoryConfig,\n  saveGoalDetailCategoryConfig,\n} from '@shared/lib/storage/goalDetailSettingsStorage';", "import { useTranslation } from '@shared/lib/i18n';\nimport {\n  loadGoalDetailCategoryConfig,\n  saveGoalDetailCategoryConfig,\n} from '@shared/lib/storage/goalDetailSettingsStorage';"),
], insert_after=': Props) {\n  const [dataConfig, setDataConfig]', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/ReadingPlanSection.tsx', [
('rhythmTitle="독서"', "rhythmTitle={t('planMode.reading')}"),
])

# PriorityMealSlotSetupBanner
patch('src/pages/day-plan/ui/PriorityMealSlotSetupBanner.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after=': Props) {\n  return (', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/PriorityMealSlotSetupBanner.tsx', [
('accessibilityLabel="나만의 루틴에서 구간 설정하기"', "accessibilityLabel={t('dayPlan.sectionsSetupBannerA11y')}"),
('구간별로 보려면 설정이 필요해요', "{t('dayPlan.sectionsSetupBannerTitle')}"),
('나만의 루틴에서 구간을 설정한 뒤 적용을 켜면, 여기서 구간별로 볼 수 있어요.', "{t('dayPlan.sectionsSetupBannerBody')}"),
])

# FixedRoutineDraftOrderList
patch('src/pages/day-plan/ui/FixedRoutineDraftOrderList.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after='}: RowProps) {\n  const translateY = useSharedValue(0);', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/FixedRoutineDraftOrderList.tsx', [
('accessibilityLabel={`${cat.label}, 길게 눌러 순서를 바꿀 수 있어요`}', "accessibilityLabel={t('fixedRoutine.reorderA11y', { label: cat.label })}"),
('accessibilityLabel={`${cat.label} 세트에서 빼기`}', "accessibilityLabel={t('fixedRoutine.removeFromSetA11y', { label: cat.label })}"),
])

# PriorityMealSlotAddRoutineRow
patch('src/pages/day-plan/ui/PriorityMealSlotAddRoutineRow.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
("  label = '루틴 연결',", '  label,')
], insert_after=': Props) {\n  return (', insert='\n  const { t } = useTranslation();\n  const resolvedLabel = label ?? t(\'dayPlan.confirmLink\');\n')
patch('src/pages/day-plan/ui/PriorityMealSlotAddRoutineRow.tsx', [
('accessibilityLabel={label}', 'accessibilityLabel={resolvedLabel}'),
('<ThemedText style={[styles.label, { color: ink }]}>{label}</ThemedText>', '<ThemedText style={[styles.label, { color: ink }]}>{resolvedLabel}</ThemedText>'),
])

# FixedRoutineSlotAddChips
patch('src/pages/day-plan/ui/FixedRoutineSlotAddChips.tsx', [
("import {\n  DAY_MEAL_SLOT_LABEL,\n  DAY_MEAL_SLOT_ORDER,\n  type DayMealSlot,\n} from '@shared/lib/storage';",
 "import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport { DAY_MEAL_SLOT_ORDER, type DayMealSlot } from '@shared/lib/storage';"),
], insert_after=': Props) {\n  const slots =', insert='\n  const { locale, t } = useTranslation();\n')
patch('src/pages/day-plan/ui/FixedRoutineSlotAddChips.tsx', [
('accessibilityLabel={`${DAY_MEAL_SLOT_LABEL[slot]} 구간에 항목 추가`}', "accessibilityLabel={t('dayPlan.addToSlotA11y', { slot: formatMealSlotLabel(slot as LocaleDayMealSlot, locale) })}"),
('{DAY_MEAL_SLOT_LABEL[slot]}', '{formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}'),
])

# QuickMemoPlanSection
patch('src/pages/day-plan/ui/QuickMemoPlanSection.tsx', [
("import type { DayPlanPalette } from '../lib/dayPlanPalette';", "import { useTranslation } from '@shared/lib/i18n';\nimport type { DayPlanPalette } from '../lib/dayPlanPalette';"),
], insert_after='  ref: ForwardedRef<TextInput>,\n) {\n  const { width } = useWindowDimensions();', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/QuickMemoPlanSection.tsx', [
('placeholder="잠금화면에 표시할 메모를 입력하세요"', "placeholder={t('dayPlan.quickMemoPlaceholder')}"),
('accessibilityLabel="잠금화면 메모 저장"', "accessibilityLabel={t('dayPlan.quickMemoSaveA11y')}"),
])

print('batch 2 complete')
