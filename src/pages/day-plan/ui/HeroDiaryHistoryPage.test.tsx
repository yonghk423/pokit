import { HeroHistoryPackets } from './HeroHistoryPackets';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroDiaryHistoryPage } from './HeroDiaryHistoryPage';
import { loadComicDiaryLibrary, saveComicDiaryLibrary, type ComicDiaryLibrary as Library } from '../lib/heroDiaryStorage';
import { rememberComicDiaryHistorySelection } from '../lib/heroDiaryHome';
import { saveComicNavigation } from '../lib/heroNavigation';

jest.mock('./HeroHistoryPackets', () => ({ HeroHistoryPackets: 'HistoryPackets' }));
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => { jest.requireActual('react').useEffect(callback, [callback]); },
}));
jest.mock('@entities/day-plan', () => ({ getLocalDateKey: () => '2026-11-06' }));
jest.mock('@shared/lib/time/useTodayDate', () => ({ useTodayDate: () => new Date('2026-11-06T12:00:00') }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko', t: (key: string) => key }), t: (key: string) => key }));
jest.mock('./HeroDiaryLibrary', () => ({ ComicDiaryLibrary: jest.requireActual('react-native').View }));
jest.mock('../lib/heroDiaryStorage', () => ({ ...jest.requireActual('../lib/heroDiaryStorage'), loadComicDiaryLibrary: jest.fn(), saveComicDiaryLibrary: jest.fn() }));
jest.mock('../lib/heroDiaryHome', () => ({ rememberComicDiaryHistorySelection: jest.fn() }));
jest.mock('../lib/heroNavigation', () => ({ saveComicNavigation: jest.fn() }));
const makeLibrary = (): Library => ({ version: 1, migratedLegacyKeys: [], activeId: 'today', diaries: [
  { id: 'today', characterId: 'protagonist-1', title: '오늘', scenes: [], createdAt: 1, updatedAt: 1 },
  { id: 'past', characterId: 'protagonist-2', title: '지난 기록', scenes: [], createdAt: 1, updatedAt: 1 },
] });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(loadComicDiaryLibrary).mockReturnValue(makeLibrary()); });

it('renders history without exposing a main-tab activation callback', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroDiaryHistoryPage />); });
  try {
    const history = tree.root.findByType(HeroHistoryPackets);
    expect(history.props.onEdit).toBeUndefined();
    expect(rememberComicDiaryHistorySelection).not.toHaveBeenCalled();
    expect(saveComicNavigation).not.toHaveBeenCalled();
    expect(saveComicDiaryLibrary).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  } finally { act(() => tree.unmount()); }
});

it('deletes from packets against the latest saved library, preserving newly added diaries', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroDiaryHistoryPage />); });
  try {
    const latest = makeLibrary();
    latest.diaries.push({ ...latest.diaries[0], id: 'new' });
    jest.mocked(loadComicDiaryLibrary).mockReturnValue(latest);
    act(() => tree.root.findByType(HeroHistoryPackets).props.onDeleteMany(['past']));
    expect(jest.mocked(saveComicDiaryLibrary).mock.calls.at(-1)![0].diaries.map(item => item.id)).toEqual(['today', 'new']);
    act(() => tree.root.findByType(HeroHistoryPackets).props.onCreate());
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(tabs)', params: { historyCreate: expect.any(String) } }));
  } finally { act(() => tree.unmount()); }
});
