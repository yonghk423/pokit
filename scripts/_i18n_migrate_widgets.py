#!/usr/bin/env python3
"""Migrate widget TSX files to useTranslation()."""
from pathlib import Path

ROOT = Path('/Users/yonghee/Documents/project/pokit')

def patch(path: str, replacements: list[tuple[str, str]], insert_after: str | None = None, insert: str = ''):
    p = ROOT / path
    text = p.read_text()
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f'MISSING in {path}: {old[:120]!r}')
        text = text.replace(old, new)
    if insert_after and insert and insert not in text:
        if insert_after not in text:
            raise SystemExit(f'insert anchor missing in {path}')
        text = text.replace(insert_after, insert_after + insert, 1)
    p.write_text(text)
    print('ok', path)

# --- DefaultPriorityOrderRow ---
patch('src/widgets/day-plan-priority-order/ui/DefaultPriorityOrderRow.tsx', [
    ("import { ThemedText } from '@shared/ui/themed-text';", "import { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
], insert_after='}: PriorityOrderRowProps) {\n', insert='  const { t } = useTranslation();\n  const priorityLabel = t(`todo.priority.${itemPriority}` as const);\n')

patch('src/widgets/day-plan-priority-order/ui/DefaultPriorityOrderRow.tsx', [
    ('accessibilityLabel={`중요도 ${priorityMeta.label}, 탭하면 변경`}', 'accessibilityLabel={t(\'dayPlan.priorityChangeA11y\', { label: priorityLabel })}'),
    ('accessibilityLabel={`${label} 오늘 일정에서 완전 종료`}', 'accessibilityLabel={t(\'dayPlan.endTodayA11y\', { label })}'),
    ('                종료\n', '                {t(\'dayPlan.endTodayConfirm\')}\n'),
    ('accessibilityLabel={`${label} 상세 설정`}', 'accessibilityLabel={t(\'dayPlan.detailSettingsA11y\', { label })}'),
    ('accessibilityLabel={`${label} 몰입 화면 자세히 보기`}', 'accessibilityLabel={t(\'dayPlan.focusDetailA11y\', { label })}'),
    ('accessibilityLabel={isCompleted ? `${label} 완료 취소` : `${label} 완료`}', 'accessibilityLabel={isCompleted ? t(\'dayPlan.completeCancelA11y\', { label }) : t(\'dayPlan.completeA11y\', { label })}'),
    ('accessibilityLabel={`${label}, 길게 눌러 순서를 바꿀 수 있어요`}', 'accessibilityLabel={t(\'dayPlan.reorderA11y\', { label })}'),
    ('            {priorityMeta.label}\n', '            {priorityLabel}\n'),
])

# --- SnappedTimePickerField ---
patch('src/widgets/daily-rhythm-time-field/ui/SnappedTimePickerField.tsx', [
    ("import { clampHhmmToPriorityWindow, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';", "import { clampHhmmToPriorityWindow, parseHHmmToMinutes } from '@entities/day-plan';\nimport { formatHhmmClock, useTranslation } from '@shared/lib/i18n';"),
], insert_after=': SnappedTimePickerFieldProps) {\n', insert='  const { t, locale } = useTranslation();\n')

patch('src/widgets/daily-rhythm-time-field/ui/SnappedTimePickerField.tsx', [
    ('{formatHhmmClockKo(valueHhmm)}', '{formatHhmmClock(valueHhmm, locale)}'),
    ('accessibilityLabel={`${label} 시간 선택 확인`}', 'accessibilityLabel={t(\'dayPlan.timeConfirmA11y\', { label })}'),
])

# --- ReminderTimePickerPill ---
patch('src/widgets/custom-flow-template-session/ui/ReminderTimePickerPill.tsx', [
    ("import { formatHhmmClockKo } from '@entities/day-plan';", "import { formatHhmmClock, useTranslation } from '@shared/lib/i18n';"),
    ("  placeholder = '시간 선택',\n  accessibilityLabel = '알림 시간',", "  placeholder,\n  accessibilityLabel,"),
], insert_after=': Props) {\n', insert='  const { t, locale } = useTranslation();\n  const resolvedPlaceholder = placeholder ?? t(\'timePicker.placeholder\');\n  const resolvedA11y = accessibilityLabel ?? t(\'timePicker.reminderA11y\');\n')

patch('src/widgets/custom-flow-template-session/ui/ReminderTimePickerPill.tsx', [
    ('const label = hasValue ? formatHhmmClockKo(valueHhmm) : placeholder;', 'const label = hasValue ? formatHhmmClock(valueHhmm, locale) : resolvedPlaceholder;'),
    ('accessibilityLabel={accessibilityLabel}', 'accessibilityLabel={resolvedA11y}'),
    ("{expanded ? '접기' : '변경'}", "{expanded ? t('common.collapse') : t('common.change')}"),
    ('accessibilityLabel="시간 선택 확인"', 'accessibilityLabel={t(\'timePicker.confirmA11y\')}'),
])

# --- SpineTimelineView ---
patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineView.tsx', [
    ("  formatMinuteOfDayKo,\n  isSpineBlockActiveAtMinute,", "  isSpineBlockActiveAtMinute,"),
    ("import { IconSymbol } from '@shared/ui/icon-symbol';", "import { formatMinuteOfDay, useTranslation } from '@shared/lib/i18n';\nimport { IconSymbol } from '@shared/ui/icon-symbol';"),
], insert_after='}: Props) {\n', insert='  const { t, locale } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineView.tsx', [
], insert_after='function AnchorRow({\n  row,\n  palette,\n  isDark,\n}: {\n  row: Extract<SpineTimelineRow, { kind: \'anchor\' }>;\n  palette: SpineTimelinePalette;\n  isDark: boolean;\n}) {\n', insert='  const { locale } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineView.tsx', [
    ('{formatMinuteOfDayKo(row.minutes)}', '{formatMinuteOfDay(row.minutes, locale)}'),
], insert_after='function GapRow({\n  row,\n  palette,\n  accent,\n  onAdd,\n}: {\n  row: Extract<SpineTimelineRow, { kind: \'gap\' }>;\n  palette: SpineTimelinePalette;\n  accent: string;\n  onAdd: () => void;\n}) {\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineView.tsx', [
    ('<ThemedText style={[styles.railTimeNowLabel, { color: accent }]}>지금</ThemedText>', '<ThemedText style={[styles.railTimeNowLabel, { color: accent }]}>{t(\'spineTimeline.now\')}</ThemedText>'),
    ('accessibilityLabel="일정 추가"', 'accessibilityLabel={t(\'dayPlan.addBlockA11y\')}'),
    ('          시작·마무리 시각을 설정하면 타임라인이 표시돼요.\n', '          {t(\'spineTimeline.emptyHint\')}\n'),
])

# --- SpineTimelineBlockRow ---
patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineBlockRow.tsx', [
    ("import { blockDurationSec, formatMinuteOfDayKo, getBlockTimelineIcon,", "import { blockDurationSec, getBlockTimelineIcon,"),
    ("import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';", "import { formatDurationMinutes, formatMinuteOfDay, useTranslation } from '@shared/lib/i18n';"),
], insert_after='}: Props) {\n', insert='  const { t, locale } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineBlockRow.tsx', [
], insert_after='}) {\n  const primary = isDark ? \'#FAFAFA\' : PrimaryColor.rgb;\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineTimelineBlockRow.tsx', [
    ('accessibilityLabel={`${label} 상세 설정`}', 'accessibilityLabel={t(\'dayPlan.detailSettingsA11y\', { label })}'),
    ('const startClockLabel = formatMinuteOfDayKo(row.startMinutes);', 'const startClockLabel = formatMinuteOfDay(row.startMinutes, locale);'),
    ('    ? `다음날 ${formatMinuteOfDayKo(row.block.endMinutes)}`\n    : formatMinuteOfDayKo(row.endMinutes).replace(/^[^\\s]+\\s/, \'\');', "    ? t('spineTimeline.nextDayClock', { clock: formatMinuteOfDay(row.block.endMinutes, locale).replace(/^[^\\s]+\\s/, '') })\n    : formatMinuteOfDay(row.endMinutes, locale).replace(/^[^\\s]+\\s/, '');"),
    ('<ThemedText style={styles.deleteLabel}>삭제</ThemedText>', '<ThemedText style={styles.deleteLabel}>{t(\'common.delete\')}</ThemedText>'),
    ('accessibilityLabel={`${displayTitle}, 탭하면 수정 · 오른쪽으로 밀면 삭제 · 길게 눌러 순서 변경`}', 'accessibilityLabel={t(\'dayPlan.blockEditA11y\', { title: displayTitle })}'),
    ('({formatDurationMinKo(durationMin)})', '({formatDurationMinutes(durationMin, locale)})'),
])

# --- SpineScheduleEditSheet ---
patch('src/widgets/day-plan-spine-timeline/ui/SpineScheduleEditSheet.tsx', [
    ("import { PrimaryColor } from '@shared/config/theme';", "import { PrimaryColor } from '@shared/config/theme';\nimport { formatDurationMinutes, useTranslation } from '@shared/lib/i18n';"),
])

patch('src/widgets/day-plan-spine-timeline/ui/SpineScheduleEditSheet.tsx', [
    ("function formatDurationKo(minutes: number): string {\n  if (minutes < 60) return `${minutes}분`;\n  const hours = Math.floor(minutes / 60);\n  const rest = minutes % 60;\n  if (rest === 0) return `${hours}시간`;\n  return `${hours}시간 ${rest}분`;\n}\n\n", ''),
], insert_after=': Props) {\n', insert='  const { t, locale } = useTranslation();\n')

patch('src/widgets/day-plan-spine-timeline/ui/SpineScheduleEditSheet.tsx', [
    ("{draft?.mode === 'edit' ? '일정 수정' : '일정 추가'}", "{draft?.mode === 'edit' ? t('dayPlan.blockEditTitle') : t('dayPlan.blockAddTitle')}"),
    ('accessibilityLabel="닫기"', 'accessibilityLabel={t(\'common.close\')}'),
    ('<ThemedText style={[styles.label, { color: palette.muted }]}>할 일</ThemedText>', '<ThemedText style={[styles.label, { color: palette.muted }]}>{t(\'dayPlan.todoLabel\')}</ThemedText>'),
    ('placeholder="무엇을 할까요?"', 'placeholder={t(\'dayPlan.todoPlaceholder\')}'),
    ('                        연결된 루틴\n', '                        {t(\'dayPlan.linkedRoutine\')}\n'),
    ('accessibilityLabel="루틴 연결 해제"', 'accessibilityLabel={t(\'dayPlan.unlinkRoutine\')}'),
    ('                    직접 적거나, 아래에서 루틴을 고르면 아이콘이 연결돼요.\n', '                    {t(\'dayPlan.routineLinkHint\')}\n'),
    ('                    루틴 연결 (선택)\n', '                    {t(\'dayPlan.routineLinkOptional\')}\n'),
    ('accessibilityLabel="직접 입력"', 'accessibilityLabel={t(\'dayPlan.directInput\')}'),
    ('                          직접 입력\n', '                          {t(\'dayPlan.directInput\')}\n'),
    ('                          루틴 없이 할 일만 적어요\n', '                          {t(\'dayPlan.directInputHint\')}\n'),
    ('accessibilityLabel={`${option.label} 루틴`}', 'accessibilityLabel={t(\'dayPlan.routineA11y\', { label: option.label })}'),
    ('                    시간\n', '                    {t(\'common.time\')}\n'),
    ('{formatDurationKo(durationMinutes)}', '{formatDurationMinutes(durationMinutes, locale)}'),
    ('<ThemedText style={[styles.timeCaption, { color: palette.muted }]}>시작</ThemedText>', '<ThemedText style={[styles.timeCaption, { color: palette.muted }]}>{t(\'dayPlan.startTimeLabel\')}</ThemedText>'),
    ('<ThemedText style={[styles.timeCaption, { color: palette.muted }]}>종료</ThemedText>', '<ThemedText style={[styles.timeCaption, { color: palette.muted }]}>{t(\'dayPlan.endTimeLabel\')}</ThemedText>'),
    ('<ThemedText style={[styles.deleteBtnText, { color: destructive }]}>삭제</ThemedText>', '<ThemedText style={[styles.deleteBtnText, { color: destructive }]}>{t(\'common.delete\')}</ThemedText>'),
    ('<ThemedText style={[styles.btnText, { color: palette.ink }]}>취소</ThemedText>', '<ThemedText style={[styles.btnText, { color: palette.ink }]}>{t(\'common.cancel\')}</ThemedText>'),
    ('<ThemedText style={[styles.btnText, { color: primaryBtnFg }]}>저장</ThemedText>', '<ThemedText style={[styles.btnText, { color: primaryBtnFg }]}>{t(\'common.save\')}</ThemedText>'),
])

# --- MealSlotScheduleEditButton ---
patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotScheduleEditButton.tsx', [
    ("import { ThemedText } from '@shared/ui/themed-text';", "import { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
    ("  accessibilityLabel = '시간대 변경',", "  accessibilityLabel,"),
], insert_after=': Props) {\n', insert='  const { t } = useTranslation();\n  const resolvedA11y = accessibilityLabel ?? t(\'dayPlan.mealSlotScheduleA11y\');\n')

patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotScheduleEditButton.tsx', [
    ('accessibilityLabel={accessibilityLabel}', 'accessibilityLabel={resolvedA11y}'),
    ('accessibilityHint="새벽·아침·점심·저녁·밤 구간 시작 시각을 변경할 수 있어요"', 'accessibilityHint={t(\'dayPlan.mealSlotScheduleHint\')}'),
    ('            시간대 변경\n', '            {t(\'dayPlan.mealSlotScheduleA11y\')}\n'),
])

# --- MealSlotTimelineView ---
patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotTimelineView.tsx', [
    ("import { formatHhmmClockKo, dayPlanAnchorIconColor, dayPlanAnchorNodeBackground } from '@entities/day-plan';", "import { dayPlanAnchorIconColor, dayPlanAnchorNodeBackground } from '@entities/day-plan';\nimport { useTranslation } from '@shared/lib/i18n';"),
], insert_after='}) {\n  const colors = cardColors(isDark);\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotTimelineView.tsx', [
], insert_after='}) {\n  const { items } = section;\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotTimelineView.tsx', [
], insert_after='  onToggleComplete,\n}: {\n  item: MealSlotTimelineItem;\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotTimelineView.tsx', [
    ('accessibilityLabel={`${label} 상세 설정`}', 'accessibilityLabel={t(\'dayPlan.detailSettingsA11y\', { label })}'),
    ('accessibilityLabel={completed ? `${item.label} 완료 취소` : `${item.label} 완료`}', 'accessibilityLabel={completed ? t(\'dayPlan.completeCancelA11y\', { label: item.label }) : t(\'dayPlan.completeA11y\', { label: item.label })}'),
    ('accessibilityLabel={`${item.label}, 길게 눌러 순서를 바꿀 수 있어요`}', 'accessibilityLabel={t(\'dayPlan.reorderA11y\', { label: item.label })}'),
    ('accessibilityLabel="루틴 연결"', 'accessibilityLabel={t(\'dayPlan.linkRoutineA11y\')}'),
    ('            루틴 연결\n', '            {t(\'dayPlan.linkRoutine\', { slot: \'\' }).replace(\' \', \'\') || t(\'dayPlan.linkRoutineA11y\')}\n'),
    ('accessibilityLabel="루틴 더 연결"', 'accessibilityLabel={t(\'dayPlan.linkMoreRoutineA11y\')}'),
    ('              루틴 더 연결\n', '              {t(\'dayPlan.linkMoreRoutine\')}\n'),
])

# Fix meal slot link label - use linkRoutineA11y text directly
patch('src/widgets/day-plan-meal-slot-timeline/ui/MealSlotTimelineView.tsx', [
    ("            {t('dayPlan.linkRoutine', { slot: '' }).replace(' ', '') || t('dayPlan.linkRoutineA11y')}\n", "            {t('dayPlan.linkRoutineA11y')}\n"),
])

# --- StudyNotePageList ---
patch('src/widgets/study-note-document/ui/StudyNotePageList.tsx', [
    ("import { ThemedText } from '@shared/ui/themed-text';", "import { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
], insert_after=': Props) {\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/study-note-document/ui/StudyNotePageList.tsx', [
    ('accessibilityLabel="메모 목록 닫기"', 'accessibilityLabel={t(\'studyNote.closeListA11y\')}'),
    ('>메모</ThemedText>', '>{t(\'studyNote.listTitle\')}</ThemedText>'),
    ('accessibilityLabel="새 메모 작성"', 'accessibilityLabel={t(\'studyNote.newMemoA11y\')}'),
    ('>메모가 없어요</ThemedText>', '>{t(\'studyNote.emptyListTitle\')}</ThemedText>'),
    ('              오른쪽 위 버튼으로 첫 메모를 작성해 보세요\n', '              {t(\'studyNote.emptyListBody\')}\n'),
    ("Alert.alert('삭제할 수 없어요', '메모는 최소 1개는 남겨 두어야 해요.');", "Alert.alert(t('studyNote.cannotDeleteTitle'), t('studyNote.cannotDeleteMessage'));"),
    ("Alert.alert('메모 삭제', `「${title}」 메모를 삭제할까요?`, [\n                { text: '취소', style: 'cancel' },\n                {\n                  text: '삭제',", "Alert.alert(t('studyNote.deleteMemoTitle'), t('studyNote.deleteMemoMessage', { title }), [\n                { text: t('common.cancel'), style: 'cancel' },\n                {\n                  text: t('common.delete'),"),
    ('                      내용 없음\n', '                      {t(\'studyNote.noContent\')}\n'),
    ('accessibilityLabel={`${title} 메모 삭제`}', 'accessibilityLabel={t(\'studyNote.deleteMemoA11y\', { title })}'),
])

# --- StudyNotePageTitleField ---
patch('src/widgets/study-note-document/ui/StudyNotePageTitleField.tsx', [
    ("import { ImeSafeTextInput } from './ImeSafeTextInput';", "import { useTranslation } from '@shared/lib/i18n';\nimport { ImeSafeTextInput } from './ImeSafeTextInput';"),
], insert_after='}) {\n  const fallbackTrimmed = autoFallback.trim();\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/study-note-document/ui/StudyNotePageTitleField.tsx', [
    ('accessibilityLabel="메모 제목"', 'accessibilityLabel={t(\'studyNote.titleA11y\')}'),
])

# --- StudyDocumentToolbar ---
patch('src/widgets/study-note-document/ui/StudyDocumentToolbar.tsx', [
    ("import { ThemedText } from '@shared/ui/themed-text';", "import { useTranslation } from '@shared/lib/i18n';\nimport { ThemedText } from '@shared/ui/themed-text';"),
], insert_after='}: Props) {\n', insert='  const { t } = useTranslation();\n')

patch('src/widgets/study-note-document/ui/StudyDocumentToolbar.tsx', [
    ('label="실행 취소"', 'label={t(\'studyNote.undo\')}'),
    ('label="다시 실행"', 'label={t(\'studyNote.redo\')}'),
    ('label="맨 위에 줄 추가"', 'label={t(\'studyNote.insertLineTop\')}'),
    ('label="맨 아래에 줄 추가"', 'label={t(\'studyNote.insertLineBottom\')}'),
    ('label="체크리스트"', 'label={t(\'studyNote.toolbarChecklist\')}'),
    ('label="글머리 목록"', 'label={t(\'studyNote.toolbarBullet\')}'),
    ('label="번호 목록"', 'label={t(\'studyNote.toolbarNumbered\')}'),
    ('label="굵게"', 'label={t(\'studyNote.toolbarBold\')}'),
    ('label="밑줄"', 'label={t(\'studyNote.toolbarUnderline\')}'),
    ('label="글자 색"', 'label={t(\'studyNote.toolbarTextColor\')}'),
    ('label="링크"', 'label={t(\'studyNote.toolbarLink\')}'),
    ('label="표"', 'label={t(\'studyNote.toolbarTable\')}'),
    ('label="이미지"', 'label={t(\'studyNote.toolbarImage\')}'),
    ('label="노트 전체 지우기"', 'label={t(\'studyNote.toolbarClearAll\')}'),
    ('label="키보드 내리기"', 'label={t(\'studyNote.toolbarDismissKeyboard\')}'),
])

print('done base widgets')
