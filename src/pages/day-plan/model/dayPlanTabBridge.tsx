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

type Ctx = {
  primaryDisabled: boolean;
  primaryLabel: string;
  primaryHidden: boolean;
  invokePrimary: () => void;
  registerPrimaryAction: (run: (() => void) | null, meta: DayPlanPrimaryMeta) => void;
};

const DayPlanTabBridgeContext = createContext<Ctx | null>(null);

export function DayPlanTabBridgeProvider({ children }: { children: ReactNode }) {
  const runRef = useRef<(() => void) | null>(null);
  const [meta, setMeta] = useState<DayPlanPrimaryMeta>({ disabled: true, label: '시작하기', hidden: false });

  const registerPrimaryAction = useCallback((run: (() => void) | null, m: DayPlanPrimaryMeta) => {
    runRef.current = run;
    setMeta(m);
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
      invokePrimary,
      registerPrimaryAction,
    }),
    [meta.disabled, meta.hidden, meta.label, invokePrimary, registerPrimaryAction],
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
