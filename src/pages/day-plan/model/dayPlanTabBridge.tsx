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
  invokePrimary: () => void;
  registerPrimaryAction: (run: (() => void) | null, meta: DayPlanPrimaryMeta) => void;
  routineStartFab: DayPlanRoutineStartFabMeta;
  invokeRoutineStartFab: () => void;
  registerRoutineStartFab: (run: (() => void) | null, meta: DayPlanRoutineStartFabMeta) => void;
};

const DayPlanTabBridgeContext = createContext<Ctx | null>(null);

export function DayPlanTabBridgeProvider({ children }: { children: ReactNode }) {
  const runRef = useRef<(() => void) | null>(null);
  const [meta, setMeta] = useState<DayPlanPrimaryMeta>({ disabled: true, label: '시작하기', hidden: false });

  const routineRunRef = useRef<(() => void) | null>(null);
  const [routineFabMeta, setRoutineFabMeta] = useState<DayPlanRoutineStartFabMeta>({
    visible: false,
    disabled: true,
    label: '오늘 루틴 시작',
  });

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
    setRoutineFabMeta((prev) => {
      if (prev.visible === m.visible && prev.disabled === m.disabled && prev.label === m.label) {
        return prev;
      }
      return m;
    });
  }, []);

  const invokePrimary = useCallback(() => {
    if (meta.disabled) return;
    runRef.current?.();
  }, [meta.disabled]);

  const invokeRoutineStartFab = useCallback(() => {
    if (!routineFabMeta.visible || routineFabMeta.disabled) return;
    routineRunRef.current?.();
  }, [routineFabMeta.visible, routineFabMeta.disabled]);

  const value = useMemo(
    () => ({
      primaryDisabled: meta.disabled,
      primaryLabel: meta.label,
      primaryHidden: Boolean(meta.hidden),
      invokePrimary,
      registerPrimaryAction,
      routineStartFab: routineFabMeta,
      invokeRoutineStartFab,
      registerRoutineStartFab,
    }),
    [
      meta.disabled,
      meta.hidden,
      meta.label,
      invokePrimary,
      registerPrimaryAction,
      routineFabMeta,
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
