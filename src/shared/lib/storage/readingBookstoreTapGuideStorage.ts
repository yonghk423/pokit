import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedReadingBookstoreTapGuide = {
  /** 시드 책 행 1회 탭 유도 대기 */
  pending?: boolean;
  /** 도서 검색 버튼 1회 유도 대기 */
  searchPending?: boolean;
};

function readGuide(): PersistedReadingBookstoreTapGuide | null {
  return localStorageClient.getJson<PersistedReadingBookstoreTapGuide>(
    StorageKeys.readingBookstoreTapGuide,
  );
}

function writeGuide(next: PersistedReadingBookstoreTapGuide): void {
  localStorageClient.setJson<PersistedReadingBookstoreTapGuide>(
    StorageKeys.readingBookstoreTapGuide,
    next,
  );
}

/** 책방 시드 책 리스트 탭 유도가 아직 재생 대기인지 */
export function loadReadingBookstoreTapGuidePending(): boolean {
  return readGuide()?.pending === true;
}

/** 도서 검색 유도 포스트잇이 아직 대기인지 */
export function loadReadingBookstoreSearchGuidePending(): boolean {
  const v = readGuide();
  if (!v) return false;
  if (v.searchPending === true) return true;
  // 레거시: 리스트 유도만 켜져 있고 searchPending 키가 없으면 검색 유도도 함께 노출
  if (v.pending === true && v.searchPending == null) return true;
  return false;
}

export function markReadingBookstoreTapGuidePending(): void {
  writeGuide({ pending: true, searchPending: true });
}

export function clearReadingBookstoreTapGuidePending(): void {
  const v = readGuide();
  if (v?.pending !== true) return;
  writeGuide({ ...v, pending: false });
}

export function clearReadingBookstoreSearchGuidePending(): void {
  const v = readGuide();
  if (!v) return;
  if (v.searchPending !== true && !(v.pending === true && v.searchPending == null)) return;
  writeGuide({ ...v, searchPending: false });
}

/** 앱 데이터 초기화 등 */
export function clearReadingBookstoreTapGuide(): void {
  localStorageClient.removeItem(StorageKeys.readingBookstoreTapGuide);
}
