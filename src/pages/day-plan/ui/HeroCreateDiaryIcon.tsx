import Svg, { Path } from 'react-native-svg';
import { penContour } from '@shared/ui/pen-frame';

type Line = readonly (readonly [number, number])[];
const drawings: Record<'page' | 'stack', readonly Line[]> = {
  page: [
    [[8, 5], [26, 4.6], [33, 11], [32.8, 31]],
    [[8, 5], [7.7, 38], [27, 38]],
    [[26, 5], [25.9, 11.7], [33, 11]],
    [[12, 15], [28, 15.2], [28, 24], [12.1, 24], [12, 15]],
    [[12, 27.8], [18.2, 27.5], [18, 33.5], [12.1, 33.6], [12, 27.8]],
    [[21.8, 28], [27.8, 28.1]],
    [[21.8, 32.1], [26.7, 32]],
    [[36, 30], [36.1, 42]],
    [[30, 36.2], [42, 36]],
  ],
  stack: [
    [[7, 8], [29, 5.8], [31.4, 13]],
    [[6.5, 8], [7.6, 33], [12, 33.4]],
    [[12, 14], [35.7, 13.4], [36.1, 29]],
    [[12, 14], [12.4, 40], [26.5, 40]],
    [[17.5, 20], [29.8, 19.8], [29.7, 28], [17.4, 28.3], [17.5, 20]],
    [[17.8, 32.8], [25, 33]],
    [[35.5, 31], [35.8, 43]],
    [[29.7, 37], [42.2, 36.8]],
  ],
};

/** Pressure-varying ink, shared by the compact add action and the empty page. */
export function HeroCreateDiaryIcon({ variant = 'stack', color = '#30362B', size = 32, testID }: {
  variant?: 'page' | 'stack'; color?: string; size?: number; testID?: string;
}) {
  const lines = drawings[variant];
  return <Svg testID={testID} width={size} height={size} viewBox="0 0 48 48" accessible={false}>
    {lines.map((points, index) => <Path key={index} d={penContour(points, index >= lines.length - 2 ? 2.3 : index === 0 ? 1.75 : 1.35, index * 1.3)} fill={color} />)}
  </Svg>;
}
