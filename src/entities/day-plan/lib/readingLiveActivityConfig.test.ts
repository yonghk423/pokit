import {
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  readingDisplayTitle,
} from './readingLiveActivityConfig';

describe('readingLiveActivityConfig', () => {
  it('normalizes config with defaults', () => {
    const cfg = normalizeReadingLiveActivityConfig({});
    expect(cfg.startPage).toBe(1);
    expect(cfg.targetPage).toBe(100);
    expect(cfg.selectedMetrics).toEqual([]);
  });

  it('limits metric selection to valid keys', () => {
    expect(
      normalizeReadingMetricSelection(['pages_read', 'invalid', 'focus_level', 'pages_read']),
    ).toEqual(['pages_read', 'focus_level']);
  });

  it('prefers book title over flow title', () => {
    const cfg = getInitialReadingLiveActivityConfig();
    expect(readingDisplayTitle('플로우 제목', { ...cfg, bookTitle: '책' })).toBe('책');
    expect(readingDisplayTitle('플로우 제목', cfg)).toBe('플로우 제목');
    expect(readingDisplayTitle('', cfg)).toBe('제목 없음');
  });

  it('derives reading progress', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      startPage: 10,
      targetPage: 100,
    });
    const p = deriveReadingProgress(cfg);
    expect(p.pagesRead).toBe(90);
    expect(p.progressPct).toBeGreaterThan(0);
  });
});
