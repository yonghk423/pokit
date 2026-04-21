import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

export function FastingPriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
