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

/** `displayName` 비어 있을 때 담기·일정에 쓰는 구분용 기본 라벨(키마다 다름) */
export function defaultCustomFlowPickerLabel(categoryKey: string): string {
  if (!isCustomFlowCategoryKey(categoryKey)) return '플로우';
  const tail = categoryKey.slice(
    CUSTOM_FLOW_CATEGORY_PREFIX.length,
    CUSTOM_FLOW_CATEGORY_PREFIX.length + 8,
  );
  return tail.length > 0 ? `플로우 ${tail}` : '플로우';
}
