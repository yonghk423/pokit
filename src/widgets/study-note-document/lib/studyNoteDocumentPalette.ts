/** 스터디·독립 노트 문서 에디터 공통 팔레트 */
export function studyNoteDocumentPalette(isDark: boolean) {
  if (isDark) {
    return {
      surfaceLow: '#ffffff',
      surfaceLowest: '#ffffff',
      onSurface: '#18181b',
      onVariant: '#52525b',
      outline: '#a1a1aa',
      outlineVariant: 'rgba(0,0,0,0.10)',
    };
  }
  return {
    surfaceLow: '#ffffff',
    surfaceLowest: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    outlineVariant: 'rgba(0,0,0,0.10)',
  };
}

export type StudyNoteDocumentPalette = ReturnType<typeof studyNoteDocumentPalette>;
