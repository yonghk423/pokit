import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type DayPlanPrimaryMeta = {
  disabled: boolean;
  label: string;
  /** true면 하단 탭 가운데 액션 칸을 렌더하지 않음(화면 안의 버튼으로 대체) */
  hidden?: boolean;
};

/** 우측 하단 탭 위 플로팅 — 우선순위 모드에서만 사용 */
export type DayPlanRoutineStartFabMeta = {
  visible: boolean;
  disabled: boolean;
  label: string;
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
  routineStartFab: DayPlanRoutineStartFabMeta;
  invokeRoutineStartFab: () => void;
  registerRoutineStartFab: (run: (() => void) | null, meta: DayPlanRoutineStartFabMeta) => void;
};

const DayPlanTabBridgeContext = createContext<Ctx | null>(null);

export function DayPlanTabBridgeProvider({ children }: { children: ReactNode }) {
  const runRef = useRef<(() => void) | null>(null);
  const [meta, setMeta] = useState<DayPlanPrimaryMeta>({ disabled: true, label: '시작하기', hidden: false });
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [isDayPlanFocused, setIsDayPlanFocused] = useState(false);

  const routineRunRef = useRef<(() => void) | null>(null);
  const routineFabRef = useRef<DayPlanRoutineStartFabMeta>({
    visible: false,
    disabled: true,
    label: '오늘 루틴 시작',
  });
  const [fabVer, setFabVer] = useState(0);

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

  const registerRoutineStartFab = useCallback((run: (() => void) | null, m: DayPlanRoutineStartFabMeta) => {
    routineRunRef.current = run;
    const prev = routineFabRef.current;
    if (prev.visible === m.visible && prev.disabled === m.disabled && prev.label === m.label) {
      return;
    }
    routineFabRef.current = m;
    setFabVer((v) => v + 1);
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

  const invokeRoutineStartFab = useCallback(() => {
    const fab = routineFabRef.current;
    if (!fab.visible || fab.disabled) return;
    routineRunRef.current?.();
  }, []);

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
      routineStartFab: routineFabRef.current,
      invokeRoutineStartFab,
      registerRoutineStartFab,
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
      fabVer,
      invokeRoutineStartFab,
      registerRoutineStartFab,
    ],
  );

  return <DayPlanTabBridgeContext.Provider value={value}>{children}</DayPlanTabBridgeContext.Provider>;
}

export function useDayPlanTabBridge(): Ctx {
  const ctx = useContext(DayPlanTabBridgeContext);
  if (!ctx) {
    throw new Error('useDayPlanTabBridge: Provider가 (tabs) 레이아웃에 필요합니다.');
  }
  return ctx;
}
