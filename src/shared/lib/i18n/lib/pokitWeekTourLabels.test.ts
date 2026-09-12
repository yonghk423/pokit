import { useAppLocaleStore } from '../model/localeStore';
import { resolvePokitWeekTourTaskLabel } from './pokitWeekTourLabels';

describe('resolvePokitWeekTourTaskLabel', () => {
  it('maps stored Korean checklist text to English step titles', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(
      resolvePokitWeekTourTaskLabel('customFlow:preset_pokit_week_tour_item_0', '루틴 탭 둘러보기'),
    ).toBe('Browse the Routines tab');
    expect(
      resolvePokitWeekTourTaskLabel('customFlow:preset_pokit_week_tour_item_3', '투두 리스트 써보기'),
    ).toBe('Try the todo list');
  });

  it('maps stored Korean checklist text to Japanese step titles', () => {
    useAppLocaleStore.setState({ locale: 'ja' });
    expect(
      resolvePokitWeekTourTaskLabel('customFlow:preset_pokit_week_tour_item_1', '나만의 루틴 만들기'),
    ).toBe('自分のルーチンを作る');
  });
});
