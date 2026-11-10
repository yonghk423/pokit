import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

/** Lets the active daily view place its controls alongside the fixed settings button. */
export const DayPlanHeaderActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);
/** Diary mode paints the day-plan shell white, then clears it when the mode closes. */
export const DayPlanShellBackgroundContext = createContext<((color: string | null) => void) | null>(null);
export function useDayPlanHeaderActions() {
  return useContext(DayPlanHeaderActionsContext);
}

/** Controls at the trailing edge of the comic header, alongside weather when visible. */
export const DayPlanWeatherActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

/** Centered controls independent of the title and weather widths. */
export const DayPlanHeaderCenterActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

/** Gives the diary composer the header space while its keyboard is open. */
export const DayPlanComposerKeyboardContext = createContext<((open: boolean) => void) | null>(null);

/** Gives the scattered board real touch bounds beneath the header. */
export const DayPlanCanvasContext = createContext<{ setExpanded: (expanded: boolean) => void; headerHeight: number } | null>(null);
