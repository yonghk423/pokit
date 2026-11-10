import { createContext, useContext } from 'react';

/** Image decoders notify only the hidden widget renderer; normal app calendars do no extra work. */
export const CalendarWidgetRenderReadyContext = createContext<(() => void) | undefined>(undefined);
export const useCalendarWidgetImageReady = () => useContext(CalendarWidgetRenderReadyContext);
