import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

export function ReadingPriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
