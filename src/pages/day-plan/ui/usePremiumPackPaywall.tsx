import { useEffect, useRef, useState } from 'react';
import { AppModal } from '@shared/ui/app-modal';
import { ProPreviewPage } from '../../settings/ui/ProPreviewPage';

export function usePremiumPackPaywall() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<((result: string) => void) | null>(null);
  useEffect(() => () => { pending.current?.('cancelled'); pending.current = null; }, []);
  const finish = (result: string) => { setOpen(false); pending.current?.(result); pending.current = null; };
  return {
    present: () => new Promise<string>(resolve => { pending.current = resolve; setOpen(true); }),
    modal: open ? <AppModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={() => { if (!busy) finish('cancelled'); }}><ProPreviewPage onBusyChange={setBusy} onClose={() => finish('cancelled')} onActivated={finish} /></AppModal> : null,
  };
}
