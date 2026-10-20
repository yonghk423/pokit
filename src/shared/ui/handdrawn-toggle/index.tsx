import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function HanddrawnToggle({ checked, onChange, label, isDark = false, disabled = false }: {
  checked: boolean; onChange: (next: boolean) => void; label: string; isDark?: boolean; disabled?: boolean;
}) {
  const ink = isDark ? '#ECEDE6' : '#414A42';
  const x = checked ? 36 : 16;
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked, ...(disabled ? { disabled: true } : {}) }} disabled={disabled} onPress={() => { if (!disabled) onChange(!checked); }} style={{ opacity: disabled ? 0.45 : 1, width: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={54} height={32} viewBox="0 0 54 32" accessible={false} pointerEvents="none">
      <Path d="M15.8 4.5q-12-.3-12 11.6.1 11.9 12.1 11.4l22.4-.2Q50 27 49.8 15.8 49.6 4 38 4.5Z" fill={checked ? '#C9DCCD' : isDark ? '#444842' : '#F1F0E9'} stroke={ink} strokeWidth={1.2} />
      <Path d={`M${x} 7.3c-11-.5-11.8 17.2-.2 17.4 11.8.2 11.6-17.6.2-17.4Z`} fill="#FFFDF6" stroke={ink} strokeWidth={1.35} />
      <Path d={`M${x - 6.4} 14c.8-2.9 2.3-4.4 5.6-4.6M${x + 5.8} 18q-1 3.7-5.1 4.6`} stroke={ink} strokeWidth={0.45} fill="none" />
    </Svg>
  </Pressable>;
}
