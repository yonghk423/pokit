import type { PriorityOrderRowProps } from '../../lib/types';
import { DefaultPriorityOrderRow } from '../DefaultPriorityOrderRow';

/** 약 복용 — 집중 중 아이콘·펄스는 Default 내 medicine 분기 사용, 여기서만 레이아웃·카피를 바꿀 수 있음 */
export function MedicinePriorityOrderRow(props: PriorityOrderRowProps) {
  return <DefaultPriorityOrderRow {...props} />;
}
