import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';
import { CityCalendarPackCover } from './CityCalendarPackCover';

it('renders a bundled image and all dates without a downloaded calendar pack', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CityCalendarPackCover width={220} month={new Date(2026, 10, 1)} />); });
  try {
    expect(tree.root.findByType(Image).props.source).toBe(require('../../../../assets/store-previews/city-animation-couch.webp'));
    expect(tree.root.findAll(node => /^cover-day-\d+$/.test(node.props.testID ?? '') && typeof node.type !== 'string')).toHaveLength(30);
    expect(tree.root.findAllByProps({ testID: 'cover-day-30' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'cover-day-31' })).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});
