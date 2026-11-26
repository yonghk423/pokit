import Svg, { Path, Text } from 'react-native-svg';

export function SnsIcon({ color }: { color: string }) {
  return (
    <Svg accessible={false} width={32} height={26} viewBox="0 0 32 26">
      <Path
        d="M6 2.5h20q4 0 4 4v10q0 4-4 4H14l-6 4v-4H6q-4 0-4-4v-10q0-4 4-4Z"
        fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"
      />
      <Text x={16} y={15.5} textAnchor="middle" fontSize={11} fontWeight="600" fill={color}>SNS</Text>
    </Svg>
  );
}
