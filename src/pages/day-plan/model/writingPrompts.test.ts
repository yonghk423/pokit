import { initialWritingPrompt, nextWritingPrompt, writingPrompt, writingPromptCount, writingPromptLabels } from './writingPrompts';
import { SUPPORTED_APP_LOCALES } from '@shared/lib/i18n/model/locale';

it('provides every question and accessible dice label in all supported languages', () => {
  expect(writingPromptCount).toBe(50);
  for (const locale of SUPPORTED_APP_LOCALES) {
    const localized = Array.from({ length: writingPromptCount }, (_, index) => writingPrompt(locale, index));
    expect(new Set(localized).size).toBe(50);
    expect(writingPrompt(locale, writingPromptCount)).toBeUndefined();
    for (let index = 0; index < writingPromptCount; index++) {
      expect(writingPrompt(locale, index)?.length).toBeGreaterThan(0);
      if (locale !== 'ko') expect(writingPrompt(locale, index)).not.toMatch(/[가-힣]/);
    }
    expect(writingPromptLabels[locale].label.length).toBeGreaterThan(0);
    expect(writingPromptLabels[locale].hint.length).toBeGreaterThan(0);
  }
});
it('keeps a stable initial question and excludes the five recently shown questions', () => {
  expect(initialWritingPrompt('2026-11-24')).toBe(initialWritingPrompt('2026-11-24'));
  const recent = [0, 1, 2, 3, 4];
  for (let i = 0; i < 100; i++) {
    const next = nextWritingPrompt(recent);
    expect(recent.slice(-5)).not.toContain(next);
    expect(next).toBeLessThan(writingPromptCount);
    recent.push(next);
  }
});
