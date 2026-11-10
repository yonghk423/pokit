import { HeroImageActions } from './HeroImageActions';
import type { PolaroidDraft } from './HeroPolaroidEditor';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useEffect } from 'react';
export type ImportedHeroPhoto = { uri: string; fileName?: string | null; width?: number; height?: number };

/** Fit the entire print, including its border, into the available stage. */
export function fitImportedPhoto(width: number, height: number, ratio: number) {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 2 / 3;
  const frameHeight = 324 / safeRatio + 106;
  const scale = Math.max(0, Math.min((width - 48) / 360, (height - 48) / frameHeight, 1.2));
  return { width: 360 * scale, height: frameHeight * scale, photoWidth: 324 * scale, photoHeight: 324 / safeRatio * scale, scale };
}

export function HeroPhotoImportPending() {
  // Remain opaque while iOS dismisses the album and resolves its selected asset.
  return <View testID="hero-camera-import-pending" style={{ flex: 1, backgroundColor: '#F8F8F4', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#73796C" accessibilityLabel="사진 불러오는 중" /></View>;
}

export function HeroPhotoImportPreview({ embedded = false, photo, visible, busy, error, onSave, onClose, title, memo, ink, onTitleChange, onMemoChange }: {
  title: string; memo: string; ink: string; onTitleChange: (value: string) => void; onMemoChange: (value: string) => void; onPick: () => void; embedded?: boolean; photo: ImportedHeroPhoto; visible: boolean; busy: boolean; error: string | null; onSave: (draft?: PolaroidDraft) => void | Promise<void>; onClose: () => void;
}) {
  useEffect(() => { if (error) Alert.alert(error); }, [error]);
  if (!visible) return null;
  return <HeroImageActions key={photo.uri} editorOnly imageSize={photo.width && photo.height ? { width: photo.width, height: photo.height } : undefined} embeddedEditor={embedded} uri={photo.uri} title={title} memo={memo} pen={ink}
    onEditorClose={onClose}
    onSaveText={text => { onTitleChange(text.title); onMemoChange(text.memo); }}
    onSaveDraft={async draft => { if (!busy) await onSave(draft); }} />;
}
