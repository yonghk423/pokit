import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { loadNoteArchive } from '../lib/heroNoteArchive';
import { HeroCanvasNote } from './HeroCanvasNote';
import { HeroNoteArchive } from './HeroNoteArchive';
jest.mock('../lib/heroNoteArchive', () => ({ loadNoteArchive: jest.fn() }));
jest.mock('./HeroCanvasNote', () => ({ HeroCanvasNote: jest.fn(() => null) }));
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 54, bottom: 34 }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: ({ children }: any) => children }));
jest.mock('@shared/ui/app-wallpaper', () => ({ AppWallpaperBackground: () => null }));
it('opens original daily and monthly editors and refreshes notes after closing', () => {
  const entries = [{ key: 'pokit:monthly-album-note:2026-11', date: '2026-11-01', monthly: true }, { key: 'pokit:canvas-note:2026-11-18', date: '2026-11-18', monthly: false }];
  jest.mocked(loadNoteArchive).mockReturnValue([{ month: '2026-11', entries }, { month: '2025-12', entries: [] }]);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroNoteArchive year={2026} />); });
  try {
    expect(tree.root.findAllByProps({ testID: 'archive-notebook-2025-12' })).toHaveLength(0);
    act(() => tree.root.findAllByProps({ testID: 'archive-notebook-2026-11' })[0].props.onPress());
    expect(tree.root.findByType(HeroCanvasNote).props).toMatchObject({ date: '2026-11-01', monthlyHeight: 0, archiveView: true });
    act(() => tree.root.findAllByProps({ testID: 'archive-note-date-2026-11-18' })[0].props.onPress());
    expect(tree.root.findByType(HeroCanvasNote).props).toMatchObject({ date: '2026-11-18', monthlyHeight: undefined, archiveView: true });
    jest.mocked(loadNoteArchive).mockReturnValue([]);
    act(() => tree.root.findAllByProps({ testID: 'archive-note-close' })[0].props.onPress());
    expect(tree.root.findAllByType(HeroCanvasNote)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'archive-notebook-2026-11' })).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});
