import {
  clearMonthlyCompletion,
  clearWeeklyCompletion,
  listMonthlyCompletions,
  listWeeklyCompletions,
  loadMonthlyCompletion,
  loadWeeklyCompletion,
  saveMonthlyCompletion,
  saveWeeklyCompletion,
} from '@shared/lib/storage/horizonCompletionsStorage';

import { useHorizonCompletionStore } from './horizonCompletionStore';

jest.mock('@shared/lib/storage/horizonCompletionsStorage', () => ({
  listWeeklyCompletions: jest.fn(() => []),
  listMonthlyCompletions: jest.fn(() => []),
  loadWeeklyCompletion: jest.fn(() => null),
  loadMonthlyCompletion: jest.fn(() => null),
  saveWeeklyCompletion: jest.fn(),
  saveMonthlyCompletion: jest.fn(),
  clearWeeklyCompletion: jest.fn(),
  clearMonthlyCompletion: jest.fn(),
}));

const mockSaveWeeklyCompletion = saveWeeklyCompletion as jest.MockedFunction<
  typeof saveWeeklyCompletion
>;
const mockClearWeeklyCompletion = clearWeeklyCompletion as jest.MockedFunction<
  typeof clearWeeklyCompletion
>;
const mockListWeeklyCompletions = listWeeklyCompletions as jest.MockedFunction<
  typeof listWeeklyCompletions
>;
const mockSaveMonthlyCompletion = saveMonthlyCompletion as jest.MockedFunction<
  typeof saveMonthlyCompletion
>;
const mockClearMonthlyCompletion = clearMonthlyCompletion as jest.MockedFunction<
  typeof clearMonthlyCompletion
>;
const mockListMonthlyCompletions = listMonthlyCompletions as jest.MockedFunction<
  typeof listMonthlyCompletions
>;
const mockLoadWeeklyCompletion = loadWeeklyCompletion as jest.MockedFunction<
  typeof loadWeeklyCompletion
>;
const mockLoadMonthlyCompletion = loadMonthlyCompletion as jest.MockedFunction<
  typeof loadMonthlyCompletion
>;

describe('horizonCompletionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHorizonCompletionStore.setState({
      isHydrated: false,
      weeklyByKey: {},
      monthlyByKey: {},
    });
  });

  it('marks weekly complete in memory and storage', () => {
    const entry = {
      periodKey: '2025-05-19',
      label: '5월 3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
      summaryText: '요약',
    };
    useHorizonCompletionStore.getState().markWeeklyComplete(entry);
    expect(mockSaveWeeklyCompletion).toHaveBeenCalledWith(entry);
    expect(useHorizonCompletionStore.getState().weeklyByKey['2025-05-19']).toEqual(entry);
  });

  it('cancels weekly complete', () => {
    useHorizonCompletionStore.setState({
      weeklyByKey: {
        '2025-05-19': {
          periodKey: '2025-05-19',
          label: '5월 3주차',
          completedAt: '2025-05-25T10:00:00.000Z',
        },
      },
    });
    useHorizonCompletionStore.getState().cancelWeeklyComplete('2025-05-19');
    expect(mockClearWeeklyCompletion).toHaveBeenCalledWith('2025-05-19');
    expect(useHorizonCompletionStore.getState().weeklyByKey['2025-05-19']).toBeUndefined();
  });

  it('marks monthly complete', () => {
    const entry = {
      periodKey: '2025-05',
      label: '5월',
      completedAt: '2025-05-31T10:00:00.000Z',
    };
    useHorizonCompletionStore.getState().markMonthlyComplete(entry);
    expect(mockSaveMonthlyCompletion).toHaveBeenCalledWith(entry);
    expect(useHorizonCompletionStore.getState().monthlyByKey['2025-05']).toEqual(entry);
  });

  it('cancels monthly complete', () => {
    useHorizonCompletionStore.setState({
      monthlyByKey: {
        '2025-05': {
          periodKey: '2025-05',
          label: '5월',
          completedAt: '2025-05-31T10:00:00.000Z',
        },
      },
    });
    useHorizonCompletionStore.getState().cancelMonthlyComplete('2025-05');
    expect(mockClearMonthlyCompletion).toHaveBeenCalledWith('2025-05');
    expect(useHorizonCompletionStore.getState().monthlyByKey['2025-05']).toBeUndefined();
  });

  it('hydrates weekly and monthly maps', () => {
    mockListWeeklyCompletions.mockReturnValueOnce([
      {
        periodKey: 'w1',
        label: 'W',
        completedAt: '2025-05-20T00:00:00.000Z',
      },
    ]);
    mockListMonthlyCompletions.mockReturnValueOnce([
      {
        periodKey: '2025-05',
        label: '5월',
        completedAt: '2025-05-31T00:00:00.000Z',
      },
    ]);
    useHorizonCompletionStore.getState().hydrate();
    expect(useHorizonCompletionStore.getState().isHydrated).toBe(true);
    expect(useHorizonCompletionStore.getState().weeklyByKey.w1?.label).toBe('W');
    expect(useHorizonCompletionStore.getState().monthlyByKey['2025-05']?.label).toBe('5월');
  });

  it('selects completion from memory or storage fallback', () => {
    const entry = {
      periodKey: '2025-05-19',
      label: '3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
    };
    useHorizonCompletionStore.setState({
      weeklyByKey: { '2025-05-19': entry },
      monthlyByKey: {},
    });
    expect(useHorizonCompletionStore.getState().selectWeeklyComplete('2025-05-19')).toEqual(entry);
    mockLoadWeeklyCompletion.mockReturnValueOnce({
      periodKey: '2025-05-12',
      label: '2주차',
      completedAt: '2025-05-18T10:00:00.000Z',
    });
    expect(useHorizonCompletionStore.getState().selectWeeklyComplete('2025-05-12')?.label).toBe(
      '2주차',
    );
    mockLoadMonthlyCompletion.mockReturnValueOnce({
      periodKey: '2025-04',
      label: '4월',
      completedAt: '2025-04-30T10:00:00.000Z',
    });
    expect(useHorizonCompletionStore.getState().selectMonthlyComplete('2025-04')?.label).toBe('4월');
  });

  it('lists completions sorted by completedAt desc', () => {
    useHorizonCompletionStore.setState({
      weeklyByKey: {
        a: {
          periodKey: 'a',
          label: 'A',
          completedAt: '2025-05-10T00:00:00.000Z',
        },
        b: {
          periodKey: 'b',
          label: 'B',
          completedAt: '2025-05-20T00:00:00.000Z',
        },
      },
      monthlyByKey: {
        m1: {
          periodKey: 'm1',
          label: 'M1',
          completedAt: '2025-04-01T00:00:00.000Z',
        },
      },
    });
    expect(useHorizonCompletionStore.getState().selectWeeklyList()[0]?.periodKey).toBe('b');
    expect(useHorizonCompletionStore.getState().selectMonthlyList()[0]?.periodKey).toBe('m1');
  });
});
