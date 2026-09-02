import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { t } from '@shared/lib/i18n';

export type DayPlanPrimaryMeta = {
  disabled: boolean;
  label: string;
  /** true면 하단 탭 가운데 액션 칸을 렌더하지 않음(화면 안의 버튼으로 대체) */
  hidden?: boolean;
};

type Ctx = {
  primaryDisabled: boolean;
  primaryLabel: string;
  primaryHidden: boolean;
  tabBarHeight: number;
  isDayPlanFocused: boolean;
  invokePrimary: () => void;
  registerTabBarHeight: (height: number) => void;
  registerIsDayPlanFocused: (focused: boolean) => void;
  registerPrimaryAction: (run: (() => void) | null, meta: DayPlanPrimaryMeta) => void;
};

const DayPlanTabBridgeContext = createContext<Ctx | null>(null);

export function DayPlanTabBridgeProvider({ children }: { children: ReactNode }) {
  const runRef = useRef<(() => void) | null>(null);
  const [meta, setMeta] = useState<DayPlanPrimaryMeta>({ disabled: true, label: t('dayPlan.primary.start'), hidden: false });
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [isDayPlanFocused, setIsDayPlanFocused] = useState(false);

  const registerPrimaryAction = useCallback((run: (() => void) | null, m: DayPlanPrimaryMeta) => {
    runRef.current = run;
    setMeta((prev) => {
      if (
        prev.disabled === m.disabled &&
        prev.label === m.label &&
        Boolean(prev.hidden) === Boolean(m.hidden)
      ) {
        return prev;
      }
      return m;
    });
  }, []);

  const registerTabBarHeight = useCallback((height: number) => {
    const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
    setTabBarHeight((prev) => (Math.abs(prev - safeHeight) < 0.5 ? prev : safeHeight));
  }, []);

  const registerIsDayPlanFocused = useCallback((focused: boolean) => {
    setIsDayPlanFocused((prev) => (prev === focused ? prev : focused));
  }, []);

  const invokePrimary = useCallback(() => {
    if (meta.disabled) return;
    runRef.current?.();
  }, [meta.disabled]);

  const value = useMemo(
    () => ({
      primaryDisabled: meta.disabled,
      primaryLabel: meta.label,
      primaryHidden: Boolean(meta.hidden),
      tabBarHeight,
      isDayPlanFocused,
      invokePrimary,
      registerTabBarHeight,
      registerIsDayPlanFocused,
      registerPrimaryAction,
    }),
    [
      meta.disabled,
      meta.hidden,
      meta.label,
      tabBarHeight,
      isDayPlanFocused,
      invokePrimary,
      registerTabBarHeight,
      registerIsDayPlanFocused,
      registerPrimaryAction,
    ],
  );

  return <DayPlanTabBridgeContext.Provider value={value}>{children}</DayPlanTabBridgeContext.Provider>;
}

export function useDayPlanTabBridge(): Ctx {
  const ctx = useContext(DayPlanTabBridgeContext);
  if (!ctx) {
    throw new Error('useDayPlanTabBridge: Provider is required in the (tabs) layout.');
  }
  return ctx;
}
