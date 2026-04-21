import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

export function OtherPriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
