import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { ForecastMark, WeatherCalendarHeader } from './WeatherCalendarHeader';

it.each([.24, .3, .4])('fits the forecast inside a miniature card at scale %s', scale => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<WeatherCalendarHeader preview scale={scale} />); });
  const forecasts = tree.root.findAllByType(ForecastMark);
  // Current condition icon plus the three daily forecasts.
  expect(forecasts).toHaveLength(4);
  expect(forecasts.every(mark => mark.props.size <= 48 * scale)).toBe(true);
  const captions = tree.root.findAllByType(Text).filter(text => !text.props.testID);
  expect(captions.every(text => text.props.style.fontSize <= 13 * scale)).toBe(true);
  expect(captions.every(text => text.props.allowFontScaling === false)).toBe(true);
  for (let i = 0; i < 3; i++) expect(tree.root.findByProps({ testID: `weather-forecast-column-${i}` }).props.style.width).toBe('33.3333%');
  act(() => tree.unmount());
});

it('shows one status message without fake temperatures or forecasts when data is unavailable', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<WeatherCalendarHeader statusMessage="날씨 불러오는 중…" />); });
  expect(tree.root.findAllByProps({ testID: 'weather-calendar-temperature' })).toHaveLength(0);
  expect(tree.root.findAllByType(ForecastMark)).toHaveLength(0);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['날씨 불러오는 중…']);
  act(() => tree.unmount());
});
