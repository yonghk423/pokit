#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('/Users/yonghee/Documents/project/pokit')

def patch(path: str, replacements: list[tuple[str, str]], insert_after: str | None = None, insert: str = ''):
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

# DayMealSlotTargetChips
patch('src/pages/day-plan/ui/DayMealSlotTargetChips.tsx', [
("import { formatHhmmClockKo } from '@entities/day-plan';\nimport {\n  DAY_MEAL_SLOT_LABEL,\n  DAY_MEAL_SLOT_ORDER,",
 "import {\n  formatHhmmClock,\n  formatMealSlotLabel,\n  type LocaleDayMealSlot,\n} from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport {\n  DAY_MEAL_SLOT_ORDER,"),
], insert_after=': Props) {\n  return (', insert='\n  const { locale, t } = useTranslation();\n')
patch('src/pages/day-plan/ui/DayMealSlotTargetChips.tsx', [
('<ThemedText style={[styles.title, { color: muted }]}>담을 시간대</ThemedText>', "<ThemedText style={[styles.title, { color: muted }]}>{t('dayPlan.targetMealSlot')}</ThemedText>"),
('const hint = formatHhmmClockKo(getMealSlotStartHhmm(schedule, slot));', 'const hint = formatHhmmClock(getMealSlotStartHhmm(schedule, slot), locale);'),
("accessibilityLabel={`${DAY_MEAL_SLOT_LABEL[slot]} ${hint}, ${selected ? '선택됨' : '선택'}`}", "accessibilityLabel={`${formatMealSlotLabel(slot as LocaleDayMealSlot, locale)} ${hint}, ${selected ? t('common.selected') : t('common.select')}`}"),
('{DAY_MEAL_SLOT_LABEL[slot]}', '{formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}'),
])

# CatalogRowMealSlotChips
patch('src/pages/day-plan/ui/CatalogRowMealSlotChips.tsx', [
("import {\n  DAY_MEAL_SLOT_LABEL,\n  DAY_MEAL_SLOT_ORDER,\n  type DayMealSlot,\n} from '@shared/lib/storage';",
 "import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport {\n  DAY_MEAL_SLOT_ORDER,\n  type DayMealSlot,\n} from '@shared/lib/storage';"),
], insert_after=': Props) {\n  const selectedSet = new Set(selectedSlots);', insert='\n  const { locale, t } = useTranslation();\n')
patch('src/pages/day-plan/ui/CatalogRowMealSlotChips.tsx', [
("accessibilityLabel={`${DAY_MEAL_SLOT_LABEL[slot]} ${selected ? '선택됨' : '선택'}`}", "accessibilityLabel={`${formatMealSlotLabel(slot as LocaleDayMealSlot, locale)} ${selected ? t('common.selected') : t('common.select')}`}"),
('{DAY_MEAL_SLOT_LABEL[slot]}', '{formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}'),
])

# EditCatalogGroupSheet
patch('src/pages/day-plan/ui/EditCatalogGroupSheet.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after='}: Props) {\n  const insets = useSafeAreaInsets();', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/EditCatalogGroupSheet.tsx', [
("const title = isCreate ? '새 묶음 만들기' : '묶음 편집';\n  const ctaLabel = isCreate ? '만들기' : '저장';", "const title = isCreate ? t('catalog.createGroupTitle') : t('catalog.editGroupTitle');\n  const ctaLabel = isCreate ? t('createFlow.create') : t('common.save');")
])
patch('src/pages/day-plan/ui/EditCatalogGroupSheet.tsx', [
('<Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />', "<Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />"),
('accessibilityLabel="닫기"', "accessibilityLabel={t('common.close')}"),
("루틴을 담을 묶음만 먼저 만들 수 있어요. 이름은 목록에 보여요.", "{t('catalog.createGroupLead')}"),
('<ThemedText style={[styles.fieldLabel, { color: ink }]}>이름</ThemedText>', "<ThemedText style={[styles.fieldLabel, { color: ink }]}>{t('common.name')}</ThemedText>"),
('placeholder="묶음 이름"', "placeholder={t('catalog.groupNamePlaceholder')}")
])
patch('src/pages/day-plan/ui/EditCatalogGroupSheet.tsx', [
("설명{' '}\n                <ThemedText style={[styles.fieldOptional, { color: muted }]}>(선택)</ThemedText>", "{t('catalog.groupDescOptional')}{' '}\n                <ThemedText style={[styles.fieldOptional, { color: muted }]}>{t('common.optional')}</ThemedText>"),
('비워 두어도 묶음을 만들 수 있어요', "{t('catalog.groupDescOptionalHint')}"),
('placeholder="묶음 설명 (선택)"', "placeholder={t('catalog.groupDescPlaceholder')}"),
("{deleteHint ?? '묶음을 삭제하면 안에 있던 항목은 다른 묶음으로 옮겨져요.'}", "{deleteHint ?? t('catalog.deleteGroupHint')}"),
('accessibilityLabel="묶음 삭제"', "accessibilityLabel={t('catalog.deleteGroupA11y')}"),
('<ThemedText style={styles.deleteBtnText}>묶음 삭제</ThemedText>', "<ThemedText style={styles.deleteBtnText}>{t('catalog.deleteGroupTitle')}</ThemedText>"),
])

# DayMealSlotScheduleSheet
patch('src/pages/day-plan/ui/DayMealSlotScheduleSheet.tsx', [
("import {\n  alignDayMealSlotScheduleToPriorityWindow,\n  DAY_MEAL_SLOT_LABEL,\n  DAY_MEAL_SLOT_ORDER,",
 "import {\n  alignDayMealSlotScheduleToPriorityWindow,\n  DAY_MEAL_SLOT_ORDER,"),
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
])
patch('src/pages/day-plan/ui/DayMealSlotScheduleSheet.tsx', [
("const SLOT_HINTS: Record<DayMealSlot, string> = {\n  dawn: '새벽 구간이 시작되는 시각',\n  morning: '아침 구간이 시작되는 시각',\n  lunch: '점심 구간이 시작되는 시각',\n  dinner: '저녁 구간이 시작되는 시각',\n  night: '밤 구간이 시작되는 시각',\n};", "const SLOT_HINT_KEYS = {\n  dawn: 'mealSlot.dawnStartHint',\n  morning: 'mealSlot.morningStartHint',\n  lunch: 'mealSlot.lunchStartHint',\n  dinner: 'mealSlot.dinnerStartHint',\n  night: 'mealSlot.nightStartHint',\n} as const satisfies Record<DayMealSlot, import('@shared/lib/i18n').I18nKey>;"),
], insert_after='}: Props) {\n  const insets = useSafeAreaInsets();', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/DayMealSlotScheduleSheet.tsx', [
("Alert.alert(\n        '시간 순서를 확인해 주세요',\n        '새벽 → 아침 → 점심 → 저녁 → 밤 순으로 시작 시각이 앞서야 해요.',\n      );", "Alert.alert(\n        t('alert.mealSlotOrder.title'),\n        t('alert.mealSlotOrder.message'),\n      );"),
('<ThemedText style={[styles.title, { color: palette.timeField.onSurface }]}>\n            시간대 설정\n          </ThemedText>', "<ThemedText style={[styles.title, { color: palette.timeField.onSurface }]}>\n            {t('dayPlan.mealSlotScheduleTitle')}\n          </ThemedText>"),
('accessibilityLabel="닫기"', "accessibilityLabel={t('common.close')}"),
('각 구간이 시작되는 시각을 정해요. 오늘 탭 구간 보기와 나만의 루틴에 함께 반영돼요.', "{t('dayPlan.mealSlotScheduleLead')}"),
('label={DAY_MEAL_SLOT_LABEL[slot]}', 'label={formatMealSlotLabel(slot as LocaleDayMealSlot)}'),
('hint={SLOT_HINTS[slot]}', 'hint={t(SLOT_HINT_KEYS[slot])}'),
('accessibilityLabel="시간대 설정 저장"', "accessibilityLabel={t('dayPlan.mealSlotScheduleSaveA11y')}"),
('<ThemedText style={[styles.primaryBtnLabel, { color: isDark ? \'#09090b\' : \'#ffffff\' }]}>\n              저장\n            </ThemedText>', "<ThemedText style={[styles.primaryBtnLabel, { color: isDark ? '#09090b' : '#ffffff' }]}>\n              {t('common.save')}\n            </ThemedText>"),
])

# PriorityCatalogPageTabs
patch('src/pages/day-plan/ui/PriorityCatalogPageTabs.tsx', [
("import { ThemedText } from '@shared/ui/themed-text';", "import { useTranslation, type I18nKey } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
("type TabDef = {\n  key: PriorityCatalogPageTab;\n  label: string;\n};\n\nconst TABS: TabDef[] = [\n  { key: 'catalog', label: '나만의 루틴' },\n  { key: 'fixed', label: '고정 루틴' },\n];", "type TabDef = {\n  key: PriorityCatalogPageTab;\n  labelKey: I18nKey;\n};\n\nconst TABS: TabDef[] = [\n  { key: 'catalog', labelKey: 'tabs.myRoutines' },\n  { key: 'fixed', labelKey: 'fixedRoutine.tabFixed' },\n];"),
], insert_after=': Props) {\n  const tone = isDark', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/PriorityCatalogPageTabs.tsx', [
('accessibilityLabel={item.label}', 'accessibilityLabel={t(item.labelKey)}'),
('{item.label}', '{t(item.labelKey)}'),
])

# FixedRoutineMealSlotScheduleCard
patch('src/pages/day-plan/ui/FixedRoutineMealSlotScheduleCard.tsx', [
("import {\n  DAY_MEAL_SLOT_LABEL,\n  DAY_MEAL_SLOT_ORDER,\n  type DayMealSlotSchedule,\n} from '@shared/lib/storage';\nimport { formatHhmmClockKo } from '@entities/day-plan';\nimport { ThemedText } from '@shared/ui/themed-text';", "import {\n  DAY_MEAL_SLOT_ORDER,\n  type DayMealSlotSchedule,\n} from '@shared/lib/storage';\nimport { formatHhmmClock, formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';\nimport { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
], insert_after=': Props) {\n  return (', insert='\n  const { locale, t } = useTranslation();\n')
patch('src/pages/day-plan/ui/FixedRoutineMealSlotScheduleCard.tsx', [
('<ThemedText style={[styles.title, { color: ink }]}>시간대 모드</ThemedText>', "<ThemedText style={[styles.title, { color: ink }]}>{t('fixedRoutine.sectionsModeTitle')}</ThemedText>"),
("(slot) => `${DAY_MEAL_SLOT_LABEL[slot]} ${formatHhmmClockKo(schedule[slot])}`,", "(slot) => `${formatMealSlotLabel(slot as LocaleDayMealSlot, locale)} ${formatHhmmClock(schedule[slot], locale)}`,"),
('accessibilityLabel="시간대 설정"', "accessibilityLabel={t('fixedRoutine.mealSlotSettingsA11y')}"),
])

# RoutineTemplateListPanel
patch('src/pages/day-plan/ui/RoutineTemplateListPanel.tsx', [
("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after=': Props) {\n  const entries = useMemo', insert='\n  const { t } = useTranslation();\n')
patch('src/pages/day-plan/ui/RoutineTemplateListPanel.tsx', [
('<ThemedText style={[styles.pageTitle, { color: ink }]}>루틴 템플릿</ThemedText>', "<ThemedText style={[styles.pageTitle, { color: ink }]}>{t('fixedRoutine.templatesTitle')}</ThemedText>"),
('방식별 화면 구성을 미리 보고 골라요.', "{t('fixedRoutine.templatesLead')}"),
('accessibilityLabel={`${entry.label} — ${entry.description}, 자세히 보기`}', "accessibilityLabel={t('fixedRoutine.templateDetailA11y', { label: entry.label, description: entry.description })}"),
])

print('batch 1 complete')
