import { create } from 'zustand';
export type ServiceMode = 'rhythm' | 'comic';
export type ServiceStep = 'comicTools' | 'comicWeather' | 'rhythmTemplate' | 'comicCharacter' | 'comicName' | 'comicReady' | 'comicReturn' | 'rhythmAdd' | 'rhythmPicker' | 'rhythmForm' | 'rhythmOpen' | 'rhythmRecord' | 'rhythmCheck' | 'rhythmSuccess' | 'comicStart' | 'comicPick' | 'comicOpen' | 'comicMemo' | 'comicTask' | 'comicCheck' | 'comicSuccess' | 'finish';
export type ServiceProgress = { active: boolean; runId: string | null; mode: ServiceMode; step: ServiceStep; completed: ServiceMode[]; routineKey: string | null; diaryKey: string | null; sceneKey: string | null; taskKey: string | null; dismissed: boolean };

/** Compatibility state for existing card callbacks. The retired tutorial cannot start or resume. */
export const initialServiceProgress: ServiceProgress = { active: false, runId: null, mode: 'comic', step: 'finish', completed: [], routineKey: null, diaryKey: null, sceneKey: null, taskKey: null, dismissed: true };
export function loadServiceTutorial(): ServiceProgress { return { ...initialServiceProgress, completed: [] }; }
type Store = ServiceProgress & {
  start: (mode?: ServiceMode) => void;
  advance: (from: ServiceStep, to: ServiceStep, patch?: Partial<ServiceProgress>) => void;
  pause: () => void;
  skipStep: () => void;
  /** Bring back a paused in-progress run without resetting the step. */
  resume: () => void;
  nextMode: () => void;
};

const noop = () => {};
export const useServiceTutorial = create<Store>(() => ({
  ...loadServiceTutorial(), start: noop, advance: noop, pause: noop, skipStep: noop, resume: noop, nextMode: noop,
}));
export function resetServiceTutorialSession() { useServiceTutorial.setState(loadServiceTutorial()); }
export function completeTutorialMateCreation(_routineKey: string) {}
export function completeTutorialMateClose(_routineKey: string) {}
export function completeTutorialSceneClose(_sceneKey: string) {}
export function beginComicScenePick(_diaryKey: string) {}
export function tutorialRoutineVisible(_key: string, _progress: Pick<ServiceProgress, 'active' | 'mode' | 'routineKey'>) { return true; }
export function tutorialDiaryId(library: { activeId: string | null; diaries: { id: string; scenes: { id: string }[] }[] }, _progress: Pick<ServiceProgress, 'active' | 'mode' | 'diaryKey' | 'sceneKey'>) { return library.activeId; }
export const tutorialSteps: Record<ServiceMode, readonly ServiceStep[]> = { rhythm: [], comic: [] };
export function tutorialStepProgress(_mode: ServiceMode, _step: ServiceStep) { return { current: 0, total: 0 }; }
