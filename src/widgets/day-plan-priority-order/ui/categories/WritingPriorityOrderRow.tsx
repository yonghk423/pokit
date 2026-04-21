import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

export function WritingPriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
