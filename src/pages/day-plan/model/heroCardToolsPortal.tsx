import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

type Entry = { owner: object; content: ReactNode } | null;
export const HeroCardToolsRegisterContext = createContext<Dispatch<SetStateAction<Entry>> | null>(null);
export const HeroCardToolsContentContext = createContext<ReactNode>(null);
export function HeroCardToolsProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry>(null);
  return <HeroCardToolsRegisterContext.Provider value={setEntry}><HeroCardToolsContentContext.Provider value={entry?.content ?? null}>{children}</HeroCardToolsContentContext.Provider></HeroCardToolsRegisterContext.Provider>;
}
export function HeroCardToolsPortal({ children }: { children: ReactNode }) {
  const register = useContext(HeroCardToolsRegisterContext);
  const [owner] = useState(() => ({}));
  useEffect(() => {
    if (!register) return;
    register({ owner, content: children });
  }, [register, owner, children]);
  useEffect(() => {
    return () => { register?.(entry => entry?.owner === owner ? null : entry); };
  }, [register, owner]);
  return register ? null : children;
}
