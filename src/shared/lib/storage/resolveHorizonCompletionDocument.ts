import {
  EMPTY_HORIZON_DOCUMENT,
  horizonDocumentHasContent,
  loadMonthlyGoalDocument,
  loadWeeklyGoalDocument,
  parseHorizonGoalDocument,
  type HorizonGoalDocument,
} from './horizonGoalsStorage';

import type { HorizonCompletionEntry } from './horizonCompletionsStorage';

function normalizeDocument(raw: unknown): HorizonGoalDocument | null {
  const doc = parseHorizonGoalDocument(raw);
  return horizonDocumentHasContent(doc) ? doc : null;
}

export function resolveWeeklyCompletionDocument(entry: HorizonCompletionEntry): HorizonGoalDocument {
  const fromEntry = entry.document ? normalizeDocument(entry.document) : null;
  if (fromEntry) return fromEntry;

  const fromGoals = normalizeDocument(loadWeeklyGoalDocument(entry.periodKey));
  if (fromGoals) return fromGoals;

  if (entry.summaryText?.trim()) {
    const fromSummary = normalizeDocument(entry.summaryText);
    if (fromSummary) return fromSummary;
  }

  return { ...EMPTY_HORIZON_DOCUMENT };
}

export function resolveMonthlyCompletionDocument(entry: HorizonCompletionEntry): HorizonGoalDocument {
  const fromEntry = entry.document ? normalizeDocument(entry.document) : null;
  if (fromEntry) return fromEntry;

  const fromGoals = normalizeDocument(loadMonthlyGoalDocument(entry.periodKey));
  if (fromGoals) return fromGoals;

  if (entry.summaryText?.trim()) {
    const fromSummary = normalizeDocument(entry.summaryText);
    if (fromSummary) return fromSummary;
  }

  return { ...EMPTY_HORIZON_DOCUMENT };
}
