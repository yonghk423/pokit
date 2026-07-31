import { describe, expect, it } from 'vitest';

import {
  resolveHour12,
  resolveMinute,
  sanitizeTimeDigitDraft,
} from './digitalHhmmDraft';

describe('digitalHhmmDraft', () => {
  it('sanitizeTimeDigitDraft keeps up to 2 digits', () => {
    expect(sanitizeTimeDigitDraft('a1b2c3')).toBe('12');
    expect(sanitizeTimeDigitDraft('9')).toBe('9');
    expect(sanitizeTimeDigitDraft('')).toBe('');
  });

  it('resolveHour12 tolerates incomplete drafts without forcing 12', () => {
    expect(resolveHour12('1', '06')).toBe(1);
    expect(resolveHour12('11', '06')).toBe(11);
    expect(resolveHour12('', '06')).toBe(6);
    expect(resolveHour12('0', '06')).toBe(6);
    expect(resolveHour12('15', '06')).toBe(12);
  });

  it('resolveMinute tolerates incomplete drafts', () => {
    expect(resolveMinute('1', '10')).toBe(1);
    expect(resolveMinute('15', '10')).toBe(15);
    expect(resolveMinute('', '10')).toBe(10);
    expect(resolveMinute('99', '10')).toBe(59);
  });
});
