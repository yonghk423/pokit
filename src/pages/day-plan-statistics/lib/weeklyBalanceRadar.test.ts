import {
  buildRadarPolygonPoints,
  buildWeeklyAxisScores,
  buildWeeklyEditorialInsight,
  buildWeeklyGroupRows,
  computeBalanceScore,
} from './weeklyBalanceRadar';

jest.mock('@shared/lib/storage', () => ({
  listCustomCatalogGroups: () => [{ key: 'customGroup:hobby', label: '취미' }],
  listCustomFlowCatalogEntries: () => [
    { id: 'customFlow:guitar', groupKey: 'customGroup:hobby' },
    { id: 'customFlow:yoga', groupKey: 'health' },
  ],
}));

describe('weeklyBalanceRadar', () => {
  describe('buildWeeklyGroupRows', () => {
    it('groups standard categories into system groups', () => {
      const rows = buildWeeklyGroupRows({ water: 3, reading: 2, study: 1 });
      const health = rows.find((r) => r.key === 'health');
      const productivity = rows.find((r) => r.key === 'productivity');
      expect(health?.value).toBe(3);
      expect(productivity?.value).toBe(3);
    });

    it('assigns customFlow to its stored groupKey', () => {
      const rows = buildWeeklyGroupRows({ 'customFlow:guitar': 2, water: 1 });
      const hobby = rows.find((r) => r.key === 'customGroup:hobby');
      const health = rows.find((r) => r.key === 'health');
      expect(hobby?.value).toBe(2);
      expect(health?.value).toBe(1);
    });

    it('assigns customFlow to health when groupKey is health', () => {
      const rows = buildWeeklyGroupRows({ 'customFlow:yoga': 4 });
      const health = rows.find((r) => r.key === 'health');
      expect(health?.value).toBe(4);
    });

    it('always includes system groups even when 0', () => {
      const rows = buildWeeklyGroupRows({});
      expect(rows.find((r) => r.key === 'health')).toBeDefined();
      expect(rows.find((r) => r.key === 'productivity')).toBeDefined();
    });
  });

  describe('computeBalanceScore', () => {
    it('returns 0 when no activity', () => {
      expect(computeBalanceScore([{ key: 'a', label: 'A', value: 0 }])).toBe(0);
    });

    it('returns higher score when groups are balanced', () => {
      const balanced = computeBalanceScore([
        { key: 'a', label: 'A', value: 5 },
        { key: 'b', label: 'B', value: 5 },
        { key: 'c', label: 'C', value: 5 },
      ]);
      const skewed = computeBalanceScore([
        { key: 'a', label: 'A', value: 15 },
        { key: 'b', label: 'B', value: 0 },
        { key: 'c', label: 'C', value: 0 },
      ]);
      expect(balanced).toBeGreaterThan(skewed);
    });
  });

  describe('buildWeeklyAxisScores', () => {
    it('builds axis scores with minimum visible percent when value > 0', () => {
      const scores = buildWeeklyAxisScores([
        { key: 'health', label: '건강', value: 4 },
        { key: 'productivity', label: '생산성', value: 0 },
        { key: 'hobby', label: '취미', value: 2 },
      ]);
      expect(scores.find((s) => s.key === 'health')?.percent).toBeGreaterThanOrEqual(18);
      expect(scores.find((s) => s.key === 'productivity')?.percent).toBe(0);
    });
  });

  describe('buildRadarPolygonPoints (legacy)', () => {
    it('builds a polygon string', () => {
      const scores = buildWeeklyAxisScores([
        { key: 'a', label: 'A', value: 3 },
        { key: 'b', label: 'B', value: 1 },
        { key: 'c', label: 'C', value: 2 },
      ]);
      const polygon = buildRadarPolygonPoints(scores);
      expect(polygon.split(' ').length).toBe(3);
    });
  });

  describe('buildWeeklyEditorialInsight', () => {
    it('returns empty-state editorial when no activity', () => {
      const scores = buildWeeklyAxisScores([
        { key: 'a', label: 'A', value: 0 },
        { key: 'b', label: 'B', value: 0 },
      ]);
      const insight = buildWeeklyEditorialInsight(scores, 0);
      expect(insight.title).toContain('시작');
    });
  });
});
