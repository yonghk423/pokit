import { createContext, useContext } from 'react';

/** True only after the native splash has closed and the app has rendered. */
export const AppPresentationReadyContext = createContext(false);

export function useAppPresentationReady() {
  return useContext(AppPresentationReadyContext);
}
