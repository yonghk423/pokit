/**
 * 고정 루틴에 해당하는 키가 `order`에 없으면, 고정 순서대로 **앞쪽에만** 붙인다.
 * 이미 들어 있는 항목의 상대 순서는 건드리지 않는다.
 */
export function ensureFixedRoutinesInPriorityOrder(order: string[], fixedOrder: string[]): string[] {
  const missing = fixedOrder.filter((k) => !order.includes(k));
  if (missing.length === 0) return order;
  return [...missing, ...order];
}
