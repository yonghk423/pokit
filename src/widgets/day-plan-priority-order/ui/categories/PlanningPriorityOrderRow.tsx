import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

export function PlanningPriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
