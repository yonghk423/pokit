import { create } from 'zustand';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
export type ServiceMode = 'rhythm' | 'comic';
export type ServiceStep = 'comicTools' | 'comicWeather' | 'rhythmTemplate' | 'comicCharacter' | 'comicName' | 'comicReady' | 'comicReturn' | 'rhythmAdd' | 'rhythmPicker' | 'rhythmForm' | 'rhythmOpen' | 'rhythmRecord' | 'rhythmCheck' | 'rhythmSuccess' | 'comicStart' | 'comicPick' | 'comicOpen' | 'comicMemo' | 'comicTask' | 'comicCheck' | 'comicSuccess' | 'finish';
export type ServiceProgress = { active: boolean; runId: string | null; mode: ServiceMode; step: ServiceStep; completed: ServiceMode[]; routineKey: string | null; diaryKey: string | null; sceneKey: string | null; taskKey: string | null; dismissed: boolean };
const KEY = 'pokit:service-tutorial-v2';
export const initialServiceProgress: ServiceProgress = { active: false, runId: null, mode: 'comic', step: 'comicStart', completed: [], routineKey: null, diaryKey: null, sceneKey: null, taskKey: null, dismissed: false };
export function loadServiceTutorial(): ServiceProgress {
  const saved = localStorageClient.getJson<ServiceProgress>(KEY);
  if (!saved || !['rhythm', 'comic'].includes(saved.mode) || !Array.isArray(saved.completed)
    || !['comicTools','comicWeather','rhythmTemplate','comicCharacter','comicName','comicReady','comicReturn','rhythmAdd','rhythmPicker','rhythmForm','rhythmOpen','rhythmRecord','rhythmCheck','rhythmSuccess','comicStart','comicPick','comicOpen','comicMemo','comicTask','comicCheck','comicSuccess','finish'].includes(saved.step)) return initialServiceProgress;
  const restored = { ...initialServiceProgress, ...saved };
  if (restored.step === 'finish' || (restored.completed.includes('comic') && restored.completed.includes('rhythm'))) {
    return { ...restored, active: false, step: 'finish' };
  }
  // Legacy task-check steps now resume at the card-opening step.
  if (restored.mode === 'rhythm' && ['rhythmRecord', 'rhythmCheck'].includes(restored.step)) {
    restored.step = restored.routineKey ? 'rhythmOpen' : 'rhythmAdd';
  }
  // Detail drawer is gone after pause — ask to reopen the scene, then close with ×.
  if (restored.mode === 'comic' && ['comicMemo', 'comicTask', 'comicCheck'].includes(restored.step)) {
    restored.step = restored.sceneKey ? 'comicOpen' : 'comicStart';
  }
  if (restored.completed.includes('comic') && restored.mode === 'rhythm' && restored.step === 'rhythmAdd') {
    restored.mode = 'comic';
    restored.step = 'comicTools';
  }
  return restored;
}
type Store = ServiceProgress & {
  start: (mode?: ServiceMode) => void;
  advance: (from: ServiceStep, to: ServiceStep, patch?: Partial<ServiceProgress>) => void;
  pause: () => void;
  skipStep: () => void;
  /** Bring back a paused in-progress run without resetting the step. */
  resume: () => void;
  nextMode: () => void;
};
function persist(patch: Partial<ServiceProgress>) {
  const { active, runId, mode, step, completed, routineKey, diaryKey, sceneKey, taskKey, dismissed } = useServiceTutorial.getState();
  const next = { active, runId, mode, step, completed, routineKey, diaryKey, sceneKey, taskKey, dismissed, ...patch };
  localStorageClient.setJson(KEY, next);
  useServiceTutorial.setState(next);
}
/** After local data is wiped, forget the in-memory run so the intro starts from scratch. */
export function resetServiceTutorialSession() {
  useServiceTutorial.setState({ ...initialServiceProgress });
}
export const useServiceTutorial = create<Store>(() => ({
  ...initialServiceProgress,
  start: mode => {
    const saved = loadServiceTutorial();
    if (mode && saved.completed.length === 1 && !saved.completed.includes(mode) && saved.mode === mode && ['rhythmAdd', 'comicStart'].includes(saved.step)) { persist({ ...saved, active: true, dismissed: true }); return; }
    if (!mode && saved.step !== 'finish') { persist({ ...saved, active: true, dismissed: true }); return; }
    const chosen = mode ?? 'comic';
    persist({ ...initialServiceProgress, active: true, runId: `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, dismissed: true, mode: chosen, step: chosen === 'rhythm' ? 'rhythmAdd' : 'comicStart' });
  },
  advance: (from, to, patch = {}) => {
    const s = useServiceTutorial.getState();
    if (s.active && s.step === from) persist({ ...patch, step: to });
  },
  skipStep: () => {
    const s = useServiceTutorial.getState();
    if (!s.active) return;
    const next: Partial<Record<ServiceStep, ServiceStep>> = {
      rhythmAdd: 'rhythmPicker', rhythmPicker: 'rhythmForm', rhythmForm: 'rhythmTemplate', rhythmTemplate: 'rhythmOpen',
      rhythmOpen: 'rhythmRecord', rhythmRecord: 'rhythmSuccess', rhythmCheck: 'rhythmSuccess',
      comicStart: 'comicCharacter', comicCharacter: 'comicName', comicName: 'comicReady', comicReady: 'comicPick', comicPick: 'comicReturn', comicReturn: 'comicOpen', comicOpen: 'comicMemo', comicWeather: 'comicTools',
      comicTools: 'rhythmAdd', comicMemo: 'comicSuccess', comicTask: 'comicSuccess', comicCheck: 'comicSuccess',
    };
    if (next[s.step]) persist({ step: next[s.step], ...(s.step === 'comicTools' ? { mode: 'rhythm' as const } : {}) });
  },
  pause: () => persist({ ...loadServiceTutorial(), active: false, dismissed: true }),
  resume: () => {
    const saved = loadServiceTutorial();
    if (saved.active || saved.step === 'finish' || saved.completed.length === 2) return;
    // Only revive a real run (start() always sets runId). Bare defaults must stay inactive
    // or every comic-tab mount would show the empty tutorial board instead of the chooser.
    if (!saved.runId) return;
    if (saved.completed.includes(saved.mode) && !['comicTools', 'comicWeather'].includes(saved.step)) return;
    persist({ ...saved, active: true });
  },
  nextMode: () => {
    const s = useServiceTutorial.getState();
    if (!s.active || !['rhythmSuccess', 'comicSuccess'].includes(s.step)) return;
    const completed = [...new Set([...s.completed, s.mode])];
    if (s.step === 'comicSuccess') {
      persist({ completed, mode: 'comic', step: 'comicWeather', active: true });
    } else {
      persist({ completed, step: 'finish', active: false });
    }
  },
}));
export function completeTutorialMateCreation(routineKey: string) {
  const s = useServiceTutorial.getState();
  if (!routineKey.trim() || !s.active || s.mode !== 'rhythm') return;
  if (!s.routineKey && ['rhythmOpen', 'rhythmRecord'].includes(s.step)) {
    s.advance(s.step, s.step, { routineKey, taskKey: null });
  } else if (s.step === 'rhythmTemplate' || s.step === 'rhythmForm' || s.step === 'rhythmPicker') {
    s.advance(s.step, 'rhythmOpen', { routineKey, taskKey: null });
  }
}

/** The tutorial shows only records the person has just created; personal records remain stored. */
export function tutorialRoutineVisible(key: string, progress: Pick<ServiceProgress, 'active' | 'mode' | 'routineKey'>) {
  return !progress.active || progress.mode !== 'rhythm' || (progress.routineKey != null && key.split('::instance:')[0] === progress.routineKey);
}

export function tutorialDiaryId(library: { activeId: string | null; diaries: { id: string; scenes: { id: string }[] }[] }, progress: Pick<ServiceProgress, 'active' | 'mode' | 'diaryKey' | 'sceneKey'>) {
  if (!progress.active || progress.mode !== 'comic') return library.activeId;
  return progress.diaryKey ?? library.diaries.find(item => item.scenes.some(scene => scene.id === progress.sceneKey))?.id ?? null;
}

/** Closing the scene completes its introduction before the tray tool; writing is optional. */
export function completeTutorialSceneClose(sceneKey: string) {
  const s = useServiceTutorial.getState();
  if (!sceneKey || !s.active || s.mode !== 'comic' || s.sceneKey !== sceneKey) return;
  if (['comicMemo', 'comicTask', 'comicCheck'].includes(s.step)) {
    s.advance(s.step, 'comicSuccess');
  }
}

/** After the character chooser, land on scene pick with this diary — ignore mismatched `from` steps. */
export function beginComicScenePick(diaryKey: string) {
  const key = diaryKey.trim();
  const s = useServiceTutorial.getState();
  if (!key || !s.active || s.mode !== 'comic') return;
  if (!['comicStart', 'comicCharacter', 'comicName', 'comicReady', 'comicPick'].includes(s.step)) return;
  persist({ step: 'comicPick', diaryKey: key, sceneKey: null });
}

export function completeTutorialMateClose(routineKey: string) {
  const s = useServiceTutorial.getState();
  if (!s.active || s.mode !== 'rhythm' || !s.routineKey) return;
  if (routineKey.split('::instance:')[0] === s.routineKey) s.advance('rhythmRecord', 'rhythmSuccess');
}

export const tutorialSteps: Record<ServiceMode, readonly ServiceStep[]> = {
  rhythm: ['rhythmAdd', 'rhythmPicker', 'rhythmForm', 'rhythmTemplate', 'rhythmOpen', 'rhythmRecord'],
  comic: ['comicStart', 'comicCharacter', 'comicName', 'comicReady', 'comicPick', 'comicReturn', 'comicOpen', 'comicMemo'],
};
export function tutorialStepProgress(mode: ServiceMode, step: ServiceStep) {
  const steps: ServiceStep[] = [...tutorialSteps.comic, 'comicWeather', 'comicTools', ...tutorialSteps.rhythm];
  const index = steps.indexOf(step);
  return { current: index < 0 ? steps.length : index + 1, total: steps.length };
}
