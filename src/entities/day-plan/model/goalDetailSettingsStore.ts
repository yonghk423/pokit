import { create } from 'zustand';

import {
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
  subscribeGoalDetailCategoryConfig,
} from '@shared/lib/storage/goalDetailSettingsStorage';

type GoalDetailSettingsState = {
  byCategory: Record<string, unknown>;
  revision: number;
  getCategoryConfig: (categoryKey: string) => unknown | null;
  saveCategoryConfig: (categoryKey: string, config: unknown) => void;
  removeCategoryConfig: (categoryKey: string) => void;
  reloadCategoryConfig: (categoryKey: string) => void;
};

function loadAllCategoryConfigs(): Record<string, unknown> {
  const byCategory: Record<string, unknown> = {};
  for (const categoryKey of listGoalDetailCategoryConfigKeys()) {
    const config = loadGoalDetailCategoryConfig(categoryKey);
    if (config != null) byCategory[categoryKey] = config;
  }
  return byCategory;
}

/**
 * 루틴 상세 설정의 앱 내 단일 상태.
 * LocalStorage는 영속화만 담당하고 이름·아이콘·색상 등 UI 조회는 이 store를 기준으로 한다.
 */
export const useGoalDetailSettingsStore = create<GoalDetailSettingsState>((set, get) => ({
  byCategory: loadAllCategoryConfigs(),
  revision: 0,
  getCategoryConfig: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return null;
    return Object.prototype.hasOwnProperty.call(get().byCategory, key)
      ? get().byCategory[key]
      : null;
  },
  saveCategoryConfig: (categoryKey, config) => {
    const key = categoryKey.trim();
    if (!key) return;
    saveGoalDetailCategoryConfig(key, config);
  },
  removeCategoryConfig: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    removeGoalDetailCategoryConfig(key);
  },
  reloadCategoryConfig: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const config = loadGoalDetailCategoryConfig(key);
    set((state) => {
      const byCategory = { ...state.byCategory };
      if (config == null) delete byCategory[key];
      else byCategory[key] = config;
      return { byCategory, revision: state.revision + 1 };
    });
  },
}));

// 마이그레이션·알림·웹뷰 import 등 기존 저장 API 호출도 동일한 전역 상태로 즉시 합류한다.
subscribeGoalDetailCategoryConfig((categoryKey) => {
  useGoalDetailSettingsStore.getState().reloadCategoryConfig(categoryKey);
});
