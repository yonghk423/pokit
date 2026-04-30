type Resolver = (label: string) => string | null;

let resolver: Resolver | null = null;

/** 일정 블록 `category` 문자열(표시명) → 내부 카테고리 키 — 사용자 정의 플로우·`other` 등 */
export function registerCategoryKeyByDisplayNameResolver(next: Resolver | null): void {
  resolver = next;
}

export function resolveRegisteredCategoryKeyByDisplayName(label: string): string | null {
  const t = label.trim();
  if (!t) return null;
  return resolver?.(t) ?? null;
}
