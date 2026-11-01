import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ServiceStep } from '../model/serviceTutorial';

/** Preserve control geometry without measuring or highlighting tutorial targets. */
export function ServiceTutorialTarget({ children, style }: { steps: ServiceStep[]; children: ReactNode; style?: StyleProp<ViewStyle>; spotlight?: boolean }) {
  return <View collapsable={false} style={style}>{children}</View>;
}
