import type { WorkDetailDataConfig } from './goalCategorySessionConfig';
import { workStudyDocumentIsEmpty, workStudyDocumentToPlainText } from './workStudyDocument';
import {
  formatDateKeyDisplayKo,
  formatStudyDdayLabel,
  formatTimetableSlotLine,
  sortDdayEvents,
  sortTimetableSlots,
} from './workStudySchedule';

export const WORK_STUDY_TASK_PRESETS = ['문제 풀이', '복습', '예습', '정리 노트'] as const;

export function workStudyModeLabelKo(mode: WorkDetailDataConfig['studyMode']): string {
  return mode === 'pomodoro' ? '뽀모도로' : '자유 스터디';
}

export function buildWorkStudyShareText(
  config: WorkDetailDataConfig,
  options?: { routineTitle?: string },
): string {
  const title = config.displayName.trim() || options?.routineTitle?.trim() || '노트';
  const lines: string[] = [`POKIT · ${title}`, ''];

  if (config.subject.trim()) {
    lines.push(`과목: ${config.subject.trim()}`);
  }

  lines.push(`모드: ${workStudyModeLabelKo(config.studyMode)}`);
  if (config.studyMode === 'pomodoro') {
    lines.push(`집중 ${config.planMin}분 · 휴식 ${config.breakMin}분`);
  } else {
    lines.push(`목표 ${config.planMin}분${config.doneMin > 0 ? ` · 기록 ${config.doneMin}분` : ''}`);
  }

  if (!workStudyDocumentIsEmpty(config.document)) {
    const body = workStudyDocumentToPlainText(config.document);
    if (body) {
      lines.push('', '노트', body);
    }
  } else if (config.focusMemo.trim()) {
    lines.push('', '할 일', config.focusMemo.trim());
  } else if (config.tasks.length > 0) {
    lines.push('', '할 일');
    config.tasks.forEach((task, index) => {
      const mark = task.done ? '[완료]' : '[ ]';
      lines.push(`${index + 1}. ${mark} ${task.text}`);
    });
  }

  if (config.ddayEvents.length > 0) {
    lines.push('', 'D-Day');
    sortDdayEvents(config.ddayEvents).forEach((event) => {
      lines.push(
        `· ${event.title} (${formatDateKeyDisplayKo(event.dateKey)} · ${formatStudyDdayLabel(event.dateKey)})`,
      );
    });
  }

  if (config.timetableSlots.length > 0) {
    lines.push('', '시간표');
    sortTimetableSlots(config.timetableSlots).forEach((slot) => {
      lines.push(`· ${formatTimetableSlotLine(slot)}`);
    });
  }

  if (config.summary.trim()) {
    lines.push('', '요약', config.summary.trim());
  }

  return lines.join('\n').trim();
}
