/** 목업 seed 모듈이 runDevMockSeed 결과에 기록하는 요약 필드 */
export type DevMockSeedResult = Record<string, number>;

export type DevMockSeedModule = {
  /** LocalStorage seed 단위 식별자 */
  id: string;
  /** seed 내용·스키마가 바뀌면 올린다 */
  version: number;
  seed: () => Promise<DevMockSeedResult>;
  /** Dev Menu [Clear] — 이 모듈이 넣은 storage 제거 */
  clear: () => Promise<void>;
};
