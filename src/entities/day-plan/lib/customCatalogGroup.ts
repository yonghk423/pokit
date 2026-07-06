/**
 * 담기 카탈로그의 상위 그룹(섹션) 도메인.
 *
 * - `health`         : 시스템 그룹 — 「건강 루틴」(수분·체중·복약 등)
 * - `productivity`   : 시스템 그룹 — 「생산성을 높이는 도구」
 * - `customGroup:..` : 사용자 정의 그룹(라벨은 별도 저장)
 */

export const SYSTEM_CATALOG_GROUP_KEYS = ['health', 'productivity'] as const;
export type SystemCatalogGroupKey = (typeof SYSTEM_CATALOG_GROUP_KEYS)[number];

export const SYSTEM_CATALOG_GROUP_LABEL_KO: Record<SystemCatalogGroupKey, string> = {
  health: '건강 루틴',
  productivity: '생산성을 높이는 도구',
};

export const SYSTEM_CATALOG_GROUP_SUBTITLE_KO: Record<SystemCatalogGroupKey, string> = {
  health:
    '수분·체중·복약 등 몸 관리 항목을 오늘에 맞게 골라 담아요.',
  productivity:
    '독서·공부·정리·글쓰기·딥워크·일기 등 집중에 쓸 항목을 골라 담아요. 직접 만든 루틴은 아래에서 계속 추가할 수 있어요.',
};

export function isSystemCatalogGroupKey(k: string): k is SystemCatalogGroupKey {
  return (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).includes(k);
}
