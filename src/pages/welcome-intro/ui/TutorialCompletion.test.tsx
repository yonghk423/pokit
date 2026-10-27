import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Animated, Modal, Platform } from 'react-native';
import { TutorialCompletion } from './TutorialCompletion';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko' }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));

it('waits for the native iOS dismissal before moving to the weather tutorial', async () => {
  jest.useFakeTimers();
  const originalOS = Platform.OS;
  Platform.OS = 'ios';
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(Animated, 'sequence').mockImplementation(() => ({ start: callback => callback?.({ finished: true }), stop: jest.fn(), reset: jest.fn() }));
  const onComplete = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<TutorialCompletion mode="comic" completedCount={1} onComplete={onComplete} />); });
  await act(async () => { jest.advanceTimersByTime(200); });
  await act(async () => { tree.root.findByType(Modal).props.onShow(); });
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { tree.root.findByType(Modal).props.onDismiss(); });
  expect(onComplete).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  Platform.OS = originalOS;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
