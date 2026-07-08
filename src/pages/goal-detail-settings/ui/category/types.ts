import type { GoalDetailCategoryKey } from '../../model/types';

export type GoalDetailCategoryModule = {
  key: GoalDetailCategoryKey;
  titleKo: string;
  getInitialDataConfig?: () => unknown;
  Settings: React.ComponentType<{
    rhythmTitle: string;
    /** 담기·일정과 동일한 표시명을 쓰기 위해(특히 `customFlow:` 빈 이름) */
    categoryKey?: GoalDetailCategoryKey;
    dataConfig: unknown;
    onChangeDataConfig: (next: unknown) => void;
    onDeleteCategory?: () => void;
    /** `customFlow:` 전용 — 카탈로그 상위 묶음 */
    customFlowGroupKey?: string;
    onChangeCustomFlowGroupKey?: (groupKey: string) => void;
    /** 루틴 이름 편집 허용 여부 */
    allowRename?: boolean;
    /** 이름 편집이 막힌 이유 — UI 안내용 */
    renameLockedReason?: 'running' | 'today' | null;
    /** 상단 헤더에서 이름을 편집할 때 본문 타이틀 필드 숨김 */
    hideTitleField?: boolean;
  }>;
};
