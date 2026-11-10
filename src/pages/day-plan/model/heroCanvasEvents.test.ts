import { canvasEventDates, saveCanvasEvents } from './heroCanvasEvents';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const values = new Map();
  return { localStorageClient: { getJson: (key: string) => values.get(key), setJson: (key: string, value: unknown) => values.set(key, value) } };
});
it('marks the selected event date without leaking events from another month or marking empty drafts', () => {
  saveCanvasEvents('2026-11-25', [{ id: 'test', title: 'Birthday', time: '10:00' }]);
  saveCanvasEvents('2026-12-25', [{ id: 'next', title: 'Christmas' }]);
  localStorageClient.setJson('pokit:canvas-events:2026-11-26', [{ id: 'empty', title: ' ' }]);
  expect(canvasEventDates(2026, 10)).toEqual(['2026-11-25']);
  saveCanvasEvents('2026-11-25', []);
  expect(canvasEventDates(2026, 10)).toEqual([]);
});
