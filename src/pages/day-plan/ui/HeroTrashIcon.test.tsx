import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DiaryItemImage } from './DiaryItemImage';
import { HeroTrashIcon } from './HeroTrashIcon';
import { TrashIcon } from '@shared/ui/icon-symbol/TrashIcon';
import { useDiaryTheme } from '../model/diaryTheme';
jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: jest.fn(() => ({ id: 'mini-bunny-trash', source: {uri:'empty'} })) }));
jest.mock('../model/heroTrashBinStyle', () => ({ useHeroTrashBinStyle: () => 'leather' }));
jest.mock('../lib/calendarStoreDownload', () => ({ diaryImages: () => ({image:'empty', filled:'full'}), diaryImage: (_id: string, _state: string, fallback: unknown) => fallback }));
it('shows paper only while at least one photo is selected', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroTrashIcon variant="mesh" />); });
  try {
    for (const selected of [0, 1, 2, 0]) {
      act(() => tree.update(<HeroTrashIcon variant="mesh" filled={selected > 0} />));
      expect(tree.root.findByType(DiaryItemImage).props.source.uri).toBe(selected ? 'full' : 'empty');
    }
  } finally { act(() => tree.unmount()); }
});
it('uses the selected diary item on tab buttons without a variant override', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroTrashIcon size={26} />); });
  try {
    expect(tree.root.findByType(DiaryItemImage).props.source.uri).toBe('empty');
    act(() => tree.update(<HeroTrashIcon size={26} filled />));
    expect(tree.root.findByType(DiaryItemImage).props.source.uri).toBe('full');
  } finally { act(() => tree.unmount()); }
});

it('uses the saved standard bin when a downloaded theme is not selected', () => {
  jest.mocked(useDiaryTheme).mockReturnValue(undefined);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroTrashIcon />); });
  try {
    expect(tree.root.findByType(TrashIcon).props.variant).toBe('leather');
  } finally { act(() => tree.unmount()); }
});
