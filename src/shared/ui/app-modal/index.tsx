import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { Modal as NativeModal, type ModalProps } from 'react-native';

import { activeAlertScope, useAppAlertStore } from '@shared/lib/app-alert';
import { AppAlertSurface, useAppAlertScope } from '@shared/ui/app-alert/AppAlertSurface';

/** Keeps native-sheet behavior while hosting paper alerts above the sheet's content. */
export function AppModal({ children, visible = true, onRequestClose, ...props }: ModalProps) {
  const scope = useAppAlertScope(visible);
  return (
    <NativeModal
      {...props}
      visible={visible}
      onRequestClose={(event) => {
        const state = useAppAlertStore.getState();
        const request = state.queue[0];
        if (request && activeAlertScope(state.scopes) === scope.id) {
          state.dismiss(request.id);
          return;
        }
        onRequestClose?.(event);
      }}>
      <AppAlertSurface scopeId={scope.id} depth={scope.depth}><TutorialGuideLayer>{children}</TutorialGuideLayer></AppAlertSurface>
    </NativeModal>
  );
}
