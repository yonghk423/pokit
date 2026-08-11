const PRIORITY_ROUTINE_INSTANCE_SEPARATOR = '::instance:';

function createInstanceId(): string {
  const cryptoLike = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  return (
    cryptoLike.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  );
}

/** 오늘 일정 안에서만 쓰는 루틴 추가 건의 고유 키를 만든다. */
export function createPriorityRoutineInstanceKey(categoryKey: string): string {
  const base = resolvePriorityRoutineCategoryKey(categoryKey);
  return `${base}${PRIORITY_ROUTINE_INSTANCE_SEPARATOR}${createInstanceId()}`;
}

/** 인스턴스 키에서 카탈로그·설정 조회용 원본 categoryKey를 복원한다. */
export function resolvePriorityRoutineCategoryKey(key: string): string {
  const trimmed = key.trim();
  const separatorIndex = trimmed.indexOf(PRIORITY_ROUTINE_INSTANCE_SEPARATOR);
  return separatorIndex >= 0 ? trimmed.slice(0, separatorIndex) : trimmed;
}

export function isPriorityRoutineInstanceKey(key: string): boolean {
  return key.includes(PRIORITY_ROUTINE_INSTANCE_SEPARATOR);
}

/**
 * 카탈로그 키를 오늘 일정 순서에 추가할 고유 키로 변환한다.
 * 해당 카테고리의 첫 추가는 기존 키를 유지하고, 이후 추가부터 인스턴스 키를 쓴다.
 */
export function materializePriorityRoutineOccurrenceKeys(
  categoryKeys: readonly string[],
  existingOrder: readonly string[],
): string[] {
  const occupiedCategories = new Set(
    existingOrder.map(resolvePriorityRoutineCategoryKey).filter(Boolean),
  );

  return categoryKeys.map((rawKey) => {
    const categoryKey = resolvePriorityRoutineCategoryKey(rawKey);
    if (!occupiedCategories.has(categoryKey)) {
      occupiedCategories.add(categoryKey);
      return categoryKey;
    }
    return createPriorityRoutineInstanceKey(categoryKey);
  });
}
