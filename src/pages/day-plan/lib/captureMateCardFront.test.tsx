import { Image, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { captureMateCardFront } from './captureMateCardFront';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(), releaseCapture: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

it('waits for the measured card snapshot to decode before offering it to the flip', async () => {
  let decoded!: () => void;
  jest.mocked(captureRef).mockResolvedValue('file:///mate-front.png');
  jest.spyOn(Image, 'prefetch').mockImplementation(() => new Promise<boolean>(resolve => { decoded = () => resolve(true); }));
  const node = { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(24, 150, 300, 420) } as View;
  const ready = jest.fn();
  const pending = captureMateCardFront(node).then(ready);
  await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  decoded();
  await pending;
  expect(captureRef).toHaveBeenCalledWith(node, { format: 'png', result: 'tmpfile' });
  expect(ready.mock.calls[0][0]).toMatchObject({ uri: 'file:///mate-front.png', card: { frame: { left: 24, top: 150, width: 300, height: 420 } } });
});

it('returns control on capture failure instead of leaving the card opening locked', async () => {
  jest.mocked(captureRef).mockRejectedValue(new Error('capture unavailable'));
  const node = { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(24, 150, 300, 420) } as View;
  await expect(captureMateCardFront(node)).resolves.toBeNull();
});

it('returns control when the native capture call throws synchronously', async () => {
  jest.mocked(captureRef).mockImplementation(() => { throw new Error('native module missing'); });
  const node = { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(24, 150, 300, 420) } as View;
  await expect(captureMateCardFront(node)).resolves.toBeNull();
});

it('bounds an unresponsive native measurement instead of keeping opening locked', async () => {
  jest.useFakeTimers();
  try {
    const pending = captureMateCardFront({ measureInWindow: () => undefined } as unknown as View);
    jest.advanceTimersByTime(350);
    await expect(pending).resolves.toBeNull();
  } finally { jest.useRealTimers(); }
});

it('uses the same measured book frame when image capture fails', async () => {
  jest.mocked(captureRef).mockRejectedValue(new Error('capture unavailable'));
  const node = { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(42, 210, 28, 132) } as View;
  const fallback = jest.fn(() => 'same book');
  const result = await captureMateCardFront(node, fallback);
  expect(result).toEqual({ uri: null, card: { frame: { left: 42, top: 210, width: 28, height: 132 }, front: 'same book' } });
  expect(fallback).toHaveBeenCalledWith(28, 132);
});
