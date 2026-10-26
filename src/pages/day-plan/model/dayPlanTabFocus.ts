import { createContext } from 'react';

/** Native tabs stay mounted; their hidden card surfaces must not keep animating. */
export const DayPlanTabFocusContext = createContext(true);
