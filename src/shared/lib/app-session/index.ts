import { create } from 'zustand';

type AppSessionState = {
  /** 바뀌면 전역 스토어를 다시 읽고 화면 트리를 새로 마운트한다. */
  epoch: number;
  restart: () => void;
};

export const useAppSessionStore = create<AppSessionState>((set) => ({
  epoch: 0,
  restart: () => set((state) => ({ epoch: state.epoch + 1 })),
}));

/** 로컬 데이터 초기화 등 저장소를 통째로 바꾼 뒤, 앱을 껐다 켠 것처럼 다시 시작한다. */
export function restartAppSession(): void {
  useAppSessionStore.getState().restart();
}
