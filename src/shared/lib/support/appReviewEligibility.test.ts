import {
  APP_REVIEW_MIN_USE_MS,
  decideAppReviewPrompt,
  hasPriorCalendarDayUse,
  localCalendarDateKey,
} from './appReviewEligibility';

const NOW = Date.parse('2026-10-12T03:00:00.000Z');
const TODAY = localCalendarDateKey(NOW);

describe('decideAppReviewPrompt', () => {
  it('treats a calendar date before today as prior use', () => {
    expect(hasPriorCalendarDayUse(['2026-10-11', 'not-a-date'], TODAY)).toBe(true);
    expect(hasPriorCalendarDayUse([TODAY], TODAY)).toBe(false);
  });

  it('records the first open and waits when there is no earlier use', () => {
    const decision = decideAppReviewPrompt({
      record: null,
      nowMs: NOW,
      todayKey: TODAY,
      priorDayUse: false,
      setupComplete: true,
    });
    expect(decision.request).toBe(false);
    expect(decision.record.firstOpenedAt).toBe(new Date(NOW).toISOString());
    expect(decision.record.requestedAt).toBeUndefined();
  });

  it('asks once after a full day of use', () => {
    const first = new Date(NOW - APP_REVIEW_MIN_USE_MS).toISOString();
    const decision = decideAppReviewPrompt({
      record: { firstOpenedAt: first },
      nowMs: NOW,
      todayKey: TODAY,
      priorDayUse: false,
      setupComplete: true,
    });
    expect(decision.request).toBe(true);
    expect(decision.record.requestedAt).toBe(new Date(NOW).toISOString());
  });

  it('asks existing users who already have a previous day on record', () => {
    const decision = decideAppReviewPrompt({
      record: null,
      nowMs: NOW,
      todayKey: TODAY,
      priorDayUse: true,
      setupComplete: true,
    });
    expect(decision.request).toBe(true);
  });

  it('waits while first-run setup is still open', () => {
    const decision = decideAppReviewPrompt({
      record: null,
      nowMs: NOW,
      todayKey: TODAY,
      priorDayUse: true,
      setupComplete: false,
    });
    expect(decision.request).toBe(false);
    expect(decision.record.requestedAt).toBeUndefined();
  });

  it('does not ask again after a request was stored', () => {
    const decision = decideAppReviewPrompt({
      record: { firstOpenedAt: new Date(NOW - APP_REVIEW_MIN_USE_MS).toISOString(), requestedAt: '2026-10-11T00:00:00.000Z' },
      nowMs: NOW,
      todayKey: TODAY,
      priorDayUse: true,
      setupComplete: true,
    });
    expect(decision.request).toBe(false);
    expect(decision.record.requestedAt).toBe('2026-10-11T00:00:00.000Z');
  });
});
