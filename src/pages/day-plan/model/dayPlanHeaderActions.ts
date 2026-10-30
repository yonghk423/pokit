import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

/** Lets the active daily view place its controls alongside the fixed settings button. */
export const DayPlanHeaderActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);
/** Diary mode paints the day-plan shell white, then clears it when the mode closes. */
export const DayPlanShellBackgroundContext = createContext<((color: string | null) => void) | null>(null);
export function useDayPlanHeaderActions() {
  return useContext(DayPlanHeaderActionsContext);
}

/** Controls immediately before weather in the comic header. */
export const DayPlanWeatherActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

/** Centered controls independent of the title and weather widths. */
export const DayPlanHeaderCenterActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);
