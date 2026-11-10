import { HeroTrashIcon } from './HeroTrashIcon';
import type { HeroCardText } from './HeroCardCaption';
import type { PolaroidDraft } from './HeroPolaroidEditor';
import type { AppFontId } from '@shared/lib/ui-font';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { formatHeroPolaroidDate, HeroPolaroidExport, type HeroPolaroidContent } from './HeroPolaroidExport';

export function HeroImageActions({ initialDraft, imageSize, onSaveDraft, uri, source, title = '', memo, paper, pen, fontId, exportDate, compact = false, saveOnly = false, directDownload = false, onDelete, embeddedEditor = false, editorOnly = false, onEditorClose, onSaveText }: { initialDraft?: PolaroidDraft; imageSize?: { width: number; height: number }; onSaveDraft?: (draft: PolaroidDraft) => Promise<void>; onSaveText?: (text: HeroCardText) => void; embeddedEditor?: boolean; editorOnly?: boolean; onEditorClose?: () => void; onDelete?: () => void; uri?: string; source?: number; title?: string; memo?: string; paper?: string; pen?: string; fontId?: AppFontId; exportDate?: string | number; compact?: boolean; saveOnly?: boolean; directDownload?: boolean }) {
  const { t } = useTranslation();
  const [editorOpen, setEditorOpen] = useState(editorOnly);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [captureContent, setCaptureContent] = useState<HeroPolaroidContent | null>(null);
  const pendingCapture = useRef<{ resolve: (uri: string) => void; reject: (error: unknown) => void } | null>(null);
  const captureComplete = useCallback((result: string) => { pendingCapture.current?.resolve(result); pendingCapture.current = null; setCaptureContent(null); }, []);
  const captureFailed = useCallback((error: unknown) => { pendingCapture.current?.reject(error); pendingCapture.current = null; setCaptureContent(null); }, []);
  useEffect(() => () => { pendingCapture.current?.reject(new Error('export_unmounted')); pendingCapture.current = null; }, []);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1000);
    return () => clearTimeout(timer);
  }, [saved]);
  const run = async (action: 'save' | 'share' | 'download', draft?: PolaroidDraft) => {
    if (lock.current) return;
    tapHaptic();
    lock.current = true; setBusy(true);
    if (action !== 'share') setSaved(false);
    let temporary: string | undefined;
    let polaroid: string | undefined;
    try {
      if (action === 'save' && draft && onSaveDraft) { await onSaveDraft(draft); setEditorOpen(false); onEditorClose?.(); return; }
      let local = uri ? resolveHeroArtworkUri(uri) : undefined;
      if (!local && source != null) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Asset } = require('expo-asset') as typeof import('expo-asset');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { manipulateAsync, SaveFormat } = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();
        const converted = await manipulateAsync(asset.localUri ?? asset.uri, [], { format: SaveFormat.PNG, compress: 1 });
        local = converted.uri; temporary = converted.uri;
      }
      if (!local) throw new Error('missing_image');
      if (action !== 'share') {
        // Load native actions only on interaction so the preview can still open before a native rebuild.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const media = require('expo-media-library/legacy') as typeof import('expo-media-library/legacy');
        if (Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) < 29)) {
          const permission = await media.requestPermissionsAsync(true);
          if (!permission.granted) {
            Alert.alert(t('comicDay.export.permission'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('comicDay.export.settings'), onPress: () => { tapHaptic(); void Linking.openSettings(); } }]);
            return;
          }
        }

      }
      {
        polaroid = await new Promise<string>((resolve, reject) => {
          pendingCapture.current = { resolve, reject };
          setCaptureContent({ uri: local!, title, paper, pen, fontId, ...(memo ? { memo } : {}), date: formatHeroPolaroidDate(exportDate), ...draft, ...((source != null || uri?.includes('/character-packs/protagonist-7/')) ? { fixedPrintRatio: true } : {}) });
        });
      }
      if (action !== 'share') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const media = require('expo-media-library/legacy') as typeof import('expo-media-library/legacy');
        await media.saveToLibraryAsync(polaroid!);
        setSaved(true);
        Alert.alert(t('comicDay.export.saved'));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharing = require('expo-sharing') as typeof import('expo-sharing');
        if (!await sharing.isAvailableAsync()) { Alert.alert(t('comicDay.export.unavailable')); return; }
        await sharing.shareAsync(polaroid ?? local, { mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch { Alert.alert(t('comicDay.export.failed')); }
    finally {
      pendingCapture.current = null;
      setCaptureContent(null);
      if (polaroid) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
          releaseCapture(polaroid);
        } catch { /* The export has already been saved or reported as failed. */ }
      }
      if (temporary) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
        await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
      }
      lock.current = false; setBusy(false); }
  };
  // Load the native subscription UI only when the editor is opened.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Editor = editorOpen ? (require('./HeroPolaroidEditor') as typeof import('./HeroPolaroidEditor')).HeroPolaroidEditor : null;
  return <View style={embeddedEditor ? { flex: 1 } : [s.row, compact && s.compactRow]}>
    {Editor ? <Editor imageSize={imageSize} onDelete={onDelete} embedded={embeddedEditor} onSaveText={onSaveText} uri={uri ? resolveHeroArtworkUri(uri) : undefined} source={source} initial={{ title, memo, paper, pen, fontId, date: formatHeroPolaroidDate(exportDate), ...initialDraft }} busy={busy} onClose={() => { setEditorOpen(false); onEditorClose?.(); }} onExport={run}>
      {captureContent ? <HeroPolaroidExport content={captureContent} onComplete={captureComplete} onError={captureFailed} /> : null}
    </Editor> : null}
    {!editorOpen && captureContent ? <HeroPolaroidExport content={captureContent} onComplete={captureComplete} onError={captureFailed} /> : null}
    {!editorOnly ? <>
    {onDelete ? <Pressable testID="hero-image-delete" accessibilityRole="button" accessibilityLabel={t('comicDay.deleteScene')} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { tapHaptic('warn'); onDelete(); }} style={[s.button, compact && s.compactButton, busy && { opacity: 0.45 }]}>
      <HeroTrashIcon size={compact ? 24 : 30} />
    </Pressable> : null}
    {(saveOnly ? ['save'] as const : ['save', 'share'] as const).map(action => <Pressable key={action} testID={`hero-image-${action}`} accessibilityRole="button" accessibilityLabel={t(`comicDay.export.${action}`)} disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => { if (action !== 'share') { tapHaptic(); setEditorOpen(true); } else if (directDownload) void run('share', { title, paper, pen, fontId, date: formatHeroPolaroidDate(exportDate) }); else void run(action); }} style={[s.button, compact && s.compactButton, (busy) && { opacity: 0.45 }]}>
      <Svg width={compact ? 22 : 30} height={compact ? 22 : 30} viewBox={action === 'save' ? '0 0 32 32' : '0 0 28 28'} accessible={false}>
        {action === 'save' ? <Path d="M5 3.3q11-.4 22-.1l-.2 26.1-21.5.1Zm3.5 3.5 15-.2-.1 15-14.7.2Z" stroke={pen ?? '#343B32'} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : <Path d={action === 'share' ? 'M14 18Q14.3 10 14 3M9 8L14 3 19 8M8 12L5 12 5.5 25 23 24.5 23 12 20 12M6 24L11 24.4' : 'M5 14L11 21Q17 12 24 6M5.5 14L10.5 20'} stroke={pen ?? '#343B32'} strokeWidth={action === 'share' ? 1.1 : 1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      </Svg>
    </Pressable>)}
    {directDownload ? <Pressable testID="hero-image-direct-download" accessibilityRole="button" accessibilityLabel="폴라로이드 다운로드" disabled={busy} onPress={() => void run('save', { title, paper, pen, fontId, date: formatHeroPolaroidDate(exportDate) })} style={[s.button, busy && { opacity: 0.45 }]}>
      <Svg width={30} height={30} viewBox="0 0 28 28" accessible={false}><Path testID={saved ? "hero-download-complete" : "hero-download-arrow"} d={saved ? "M5 14L11 21Q17 12 24 6M5.5 14L10.5 20" : "M14 3v15m-5-5 5 5 5-5M6 17v6h16v-6"} stroke={pen ?? '#343B32'} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
    </Pressable> : null}
    </> : null}
  </View>;
}
const s = StyleSheet.create({ compactRow: { gap: 2 }, compactButton: { width: 32, height: 28 }, row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }, button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' } });
