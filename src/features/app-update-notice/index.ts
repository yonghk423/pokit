export { detectAppUpdate } from './lib/detectAppUpdate';
export type { AppUpdateDetection } from './lib/detectAppUpdate';
export {
  listRecentReleaseNotes,
  RECENT_RELEASE_NOTES_LIMIT,
  resolveReleaseNoteHighlights,
} from './lib/releaseNotes';
export type { ReleaseNoteListItem } from './lib/releaseNotes';
export { useAppUpdateNotice } from './model/useAppUpdateNotice';
export type { AppUpdateNoticeState } from './model/useAppUpdateNotice';
export { AppUpdateNoticeModal } from './ui/AppUpdateNoticeModal';
