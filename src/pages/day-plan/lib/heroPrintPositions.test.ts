import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadPrintPositions, savePrintPosition } from './heroPrintPositions';
afterEach(() => localStorageClient.removeItem('pokit:print-positions:v1'));
it('restores dropped positions without discarding other photos and brings the last moved photo to the front', () => {
  savePrintPosition('one', 0.2, 0.4);
  savePrintPosition('two', 0.5, 1.2);
  savePrintPosition('one', 0.3, 0.7);
  const positions = loadPrintPositions();
  expect(positions.one).toMatchObject({ x: 0.3, y: 0.7 });
  expect(positions.two).toMatchObject({ x: 0.5, y: 1.2 });
  expect(positions.one.order).toBeGreaterThan(positions.two.order);
});
it('ignores invalid saved positions', () => {
  localStorageClient.setJson('pokit:print-positions:v1', { one: { x: 'bad', y: 0, order: 1 } });
  expect(loadPrintPositions()).toEqual({});
});

it('persists a rotation and retains it when moving the photo later', () => {
  savePrintPosition('rotated', 0.2, 0.3, 55);
  expect(loadPrintPositions().rotated.rotation).toBe(55);
  savePrintPosition('rotated', 0.6, 0.8);
  expect(loadPrintPositions().rotated).toMatchObject({ x: 0.6, y: 0.8, rotation: 55 });
});
