import { act, create } from 'react-test-renderer';
import { localStorageClient } from './storage/localStorageClient';
import { setWritingPromptsEnabled, useWritingPromptsEnabled } from './writingPromptPreferences';

jest.mock('./storage/localStorageClient', () => {
  const values = new Map();
  return { localStorageClient: { getJson: (key: string) => values.get(key), setJson: jest.fn((key: string, value: unknown) => values.set(key, value)) } };
});
it('defaults on, updates mounted subscribers, and reads the saved choice after remount', () => {
  let enabled: boolean | undefined;
  function Reader() { enabled = useWritingPromptsEnabled(); return null; }
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<Reader />); });
  expect(enabled).toBe(true);
  act(() => setWritingPromptsEnabled(false));
  expect(enabled).toBe(false);
  expect(localStorageClient.setJson).toHaveBeenCalledWith('yourday:writing-prompts-enabled', false);
  act(() => tree.unmount());
  act(() => { tree = create(<Reader />); });
  expect(enabled).toBe(false);
  act(() => setWritingPromptsEnabled(true));
  expect(enabled).toBe(true);
  act(() => tree.unmount());
});
