import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppModal } from '@shared/ui/app-modal';
import { AnnouncementHomeOverlay } from './AnnouncementHomeOverlay';
import { AnnouncementHomeNudge } from './AnnouncementHomeNudge';
import type { Announcement } from '@entities/announcement';

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@shared/lib/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: (props: { children?: unknown }) => require('react').createElement(jest.requireActual('react-native').View, props) }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('./AnnouncementHomeNudge', () => ({ AnnouncementHomeNudge: () => null }));

it('shows only a fetched announcement on the focused home screen and forwards read/update actions', () => {
  const notice = { id: 'update-2', title: '2.0.0' } as Announcement;
  const dismiss = jest.fn();
  const update = jest.fn();
  let tree!: ReactTestRenderer;
  const render = (announcement: Announcement | null) => <AnnouncementHomeOverlay announcement={announcement} onDismiss={dismiss} onUpdatePress={update} />;
  act(() => { tree = create(render(null)); });
  expect(tree.root.findByType(AppModal).props.visible).toBe(false);
  act(() => { tree.update(render(notice)); });
  expect(tree.root.findByType(AppModal).props.visible).toBe(true);
  act(() => { tree.root.findByType(AnnouncementHomeNudge).props.onUpdatePress(); });
  expect(update).toHaveBeenCalledTimes(1);
  act(() => { tree.root.findByType(AppModal).props.onRequestClose(); });
  expect(dismiss).toHaveBeenCalledTimes(1);
  mockFocused = false;
  act(() => { tree.update(render(notice)); });
  expect(tree.root.findByType(AppModal).props.visible).toBe(false);
  act(() => { tree.unmount(); });
  mockFocused = true;
});
