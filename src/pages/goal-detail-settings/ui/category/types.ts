import type { GoalDetailCategoryKey } from '../../model/types';

export type GoalDetailCategoryModule = {
  key: GoalDetailCategoryKey;
  titleKo: string;
  getInitialDataConfig?: () => unknown;
  Preview: React.ComponentType<{ rhythmTitle: string; dataConfig: unknown }>;
  Settings: React.ComponentType<{
    rhythmTitle: string;
    dataConfig: unknown;
    onChangeDataConfig: (next: unknown) => void;
  }>;
};

