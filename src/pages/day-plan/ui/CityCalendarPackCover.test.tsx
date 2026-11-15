import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';
import { Text } from 'react-native';
jest.mock('../lib/storeArtwork', () => ({ useStoreArtwork: () => ({ artwork: { cover: require('../../../../assets/store-previews/everyday-cinema-top-only.webp'), legacyCover: require('../../../../assets/store-previews/city-animation-couch.webp') } }) }));
import { CityCalendarPackCover } from './CityCalendarPackCover';

it('renders the bundled artwork with dates fitted to the artwork', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CityCalendarPackCover width={220} month={new Date(2026, 10, 1)} />); });
  try {
    expect(tree.root.findByType(Image).props.source).toBe(require('../../../../assets/store-previews/everyday-cinema-top-only.webp'));
    expect(new Set(tree.root.findAll(node => /^cover-day-\d+$/.test(node.props.testID ?? '')).map(node => node.props.testID)).size).toBe(30);
  } finally { act(() => tree.unmount()); }
});

it('uses the Everyday Cinema preview dimensions for both packs', () => {
  let city!: ReactTestRenderer, everyday!: ReactTestRenderer;
  act(() => {
    city = create(<CityCalendarPackCover pack="city" width={120} month={new Date(2026, 10, 1)} />);
    everyday = create(<CityCalendarPackCover pack="everyday" width={120} month={new Date(2026, 10, 1)} />);
  });
  try {
    const a = city.root.findByProps({ testID: 'city-calendar-bundled-cover' }).props.style;
    const b = everyday.root.findByProps({ testID: 'city-calendar-bundled-cover' }).props.style;
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  } finally { act(() => { city.unmount(); everyday.unmount(); }); }
});
