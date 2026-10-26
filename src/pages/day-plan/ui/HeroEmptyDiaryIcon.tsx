import Svg, { Path } from 'react-native-svg';
import { penContour } from '@shared/ui/pen-frame';

type Line = readonly (readonly [number, number])[];

// Blank pages, layered paper edges and a small ribbon, matching the approved sketch.
const notebook: Line[] = [
  [[12, 25], [39, 18], [63, 15], [78, 20], [91, 8], [116, 5], [137, 2]],
  [[12, 25], [19, 53], [27, 82], [35, 111], [59, 106], [84, 105], [108, 109], [131, 100], [156, 96], [176, 91], [163, 60], [150, 27], [137, 2]],
  [[78, 20], [85, 45], [94, 74], [108, 109]],
  [[11, 29], [9, 32], [17, 60], [26, 91], [33, 115], [58, 110], [85, 109], [108, 112], [133, 104], [157, 100], [179, 95], [166, 61], [151, 25], [140, 5]],
  [[9, 32], [6, 34], [13, 62], [22, 93], [31, 118], [58, 113], [85, 112], [108, 115], [133, 107], [159, 103], [181, 98]],
  [[6, 34], [4, 37], [11, 66], [21, 98], [29, 121], [54, 117], [82, 115], [107, 118], [132, 110], [158, 106], [183, 102]],
  [[108, 113], [110, 123], [117, 133], [116, 126], [123, 130], [117, 120], [112, 114]],
];

/** An invitation to add a diary, without empty-state copy. */
export function HeroEmptyDiaryIcon({ color = '#394032', size = 132 }: { color?: string; size?: number }) {
  return <Svg testID="comic-empty-diary-icon" width={size} height={size * 0.725} viewBox="0 0 200 145" accessible={false}>
    {notebook.map((line, index) => <Path key={index} d={penContour(line, index < 3 ? 0.9 : 0.65, index * 0.9)} fill={color} />)}
    <Path d={penContour([[166, 80], [166.4, 95], [166, 116]], 3.8, 0.4)} fill={color} />
    <Path d={penContour([[148, 98], [166, 98.4], [185, 98]], 3.8, 1.1)} fill={color} />
  </Svg>;
}
