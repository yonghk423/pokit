export const CUSTOM_FLOW_CATEGORY_PREFIX = 'customFlow:' as const;

export type CustomFlowCategoryKey = `customFlow:${string}`;

export function isCustomFlowCategoryKey(k: string): k is CustomFlowCategoryKey {
  return k.startsWith(CUSTOM_FLOW_CATEGORY_PREFIX) && k.length > CUSTOM_FLOW_CATEGORY_PREFIX.length + 4;
}

export function createCustomFlowCategoryId(): CustomFlowCategoryKey {
  const cryptoAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const u =
    cryptoAny.crypto?.randomUUID?.() ??
    `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
  return `${CUSTOM_FLOW_CATEGORY_PREFIX}${u}`;
}

/** `displayName` 비어 있을 때 담기·일정에 쓰는 기본 라벨 — 내부 ID는 노출하지 않음 */
export function defaultCustomFlowPickerLabel(_categoryKey: string): string {
  return '루틴';
}
