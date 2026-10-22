import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

/** Lets the active daily view place its controls alongside the fixed settings button. */
export const DayPlanHeaderActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);
/** Diary mode paints the day-plan shell white, then clears it when the mode closes. */
export const DayPlanShellBackgroundContext = createContext<((color: string | null) => void) | null>(null);
export function useDayPlanHeaderActions() {
  return useContext(DayPlanHeaderActionsContext);
}
