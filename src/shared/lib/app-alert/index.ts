import type { AlertButton, AlertOptions } from 'react-native';
import { create } from 'zustand';

export type AppAlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

type AfterClose = (action: () => void) => void;
type AlertScope = { id: string; depth: number };
type AppAlertState = {
  queue: AppAlertRequest[];
  scopes: AlertScope[];
  enqueue: (request: Omit<AppAlertRequest, 'id'>) => void;
  press: (id: number, buttonIndex: number, afterClose?: AfterClose) => void;
  dismiss: (id: number, afterClose?: AfterClose) => void;
  registerScope: (scope: AlertScope) => void;
  releaseScope: (id: string) => void;
};

let nextId = 1;

/** Deepest visible sheet owns alerts; among siblings the most recently opened wins. */
export function activeAlertScope(scopes: readonly AlertScope[]): string {
  return scopes.reduce<AlertScope | undefined>((top, scope) =>
    !top || scope.depth >= top.depth ? scope : top, undefined)?.id ?? 'root';
}

export const useAppAlertStore = create<AppAlertState>((set, get) => ({
  queue: [],
  scopes: [],
  enqueue: (request) => set((state) => ({ queue: [...state.queue, { ...request, id: nextId++ }] })),
  press: (id, buttonIndex, afterClose) => {
    const request = get().queue[0];
    if (!request || request.id !== id) return;
    // No supplied buttons means the localized default confirmation button.
    if (request.buttons.length > 0 && !request.buttons[buttonIndex]) return;
    if (request.buttons.length === 0 && buttonIndex !== 0) return;
    set((state) => ({ queue: state.queue.slice(1) }));
    const action = () => { request.buttons[buttonIndex]?.onPress?.(); };
    if (afterClose) afterClose(action);
    else action();
  },
  dismiss: (id, afterClose) => {
    const request = get().queue[0];
    if (!request || request.id !== id || request.options?.cancelable !== true) return;
    set((state) => ({ queue: state.queue.slice(1) }));
    const action = () => { request.options?.onDismiss?.(); };
    if (afterClose) afterClose(action);
    else action();
  },
  registerScope: (scope) => set((state) => ({
    scopes: [...state.scopes.filter((entry) => entry.id !== scope.id), scope],
  })),
  releaseScope: (id) => set((state) => ({ scopes: state.scopes.filter((entry) => entry.id !== id) })),
}));

/** Native Alert.alert-compatible entry point; business callbacks remain at the call site. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
    useAppAlertStore.getState().enqueue({ title, message, buttons: buttons?.slice() ?? [], options });
  },
};
