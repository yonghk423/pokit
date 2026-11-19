import React from 'react';
import { act, create } from 'react-test-renderer';
import { useAppliedDiaryImage } from './useAppliedDiaryImage';
import { diaryImages, installDiaryItem } from './calendarStoreDownload';
jest.mock('./calendarStoreDownload', () => ({ diaryImages: jest.fn(), installDiaryItem: jest.fn() }));

let observed: ReturnType<typeof useAppliedDiaryImage>;
function Probe({ id = 'clip-pink' }: { id?: string }) {
  observed = useAppliedDiaryImage(id, 'image', 123);
  return null;
}

it('withholds the store preview until the paid original has been verified or recovered', async () => {
  let finish!: () => void;
  jest.mocked(installDiaryItem).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  jest.mocked(diaryImages).mockReturnValue({ image: 'file:///original.webp' });
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<Probe />); });
  expect(observed).toBeUndefined();
  await act(async () => { finish(); });
  expect(observed).toEqual({ uri: 'file:///original.webp' });
  act(() => { tree.unmount(); });
});

it('never falls back to the paid thumbnail when recovery fails offline', async () => {
  jest.useFakeTimers();
  const cleared = jest.spyOn(global, 'clearTimeout');
  jest.mocked(installDiaryItem).mockRejectedValue(new Error('offline'));
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<Probe />); });
  expect(observed).toBeUndefined();
  act(() => { tree.unmount(); });
  expect(cleared).toHaveBeenCalled();
  cleared.mockRestore();
  jest.useRealTimers();
});

it('keeps bundled full-resolution free artwork available without a download', () => {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<Probe id="clip-blue" />); });
  expect(observed).toBe(123);
  act(() => { tree.unmount(); });
});
