import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { SnsIcon } from './SnsIcon';
import { PaperGrain } from '@shared/ui/paper-grain';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { Book, Placement } from '@entities/day-plan/lib/libraryBooks';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';

export function LibraryShareSheet({ books, heading, titleFor, renderBook, placementFor, bookWidth, close }: {
  placementFor: (book: Book, index: number) => Placement;
  bookWidth: number;
  renderBook: (book: Book, onReady?: () => void) => React.ReactNode; books: Book[]; heading: string; titleFor: (book: Book) => string; close: () => void;
}) {
  const { t } = useTranslation();
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const canvas = useRef<View>(null);
  const screen = useWindowDimensions();
  const ratio = 5 / 4;
  const width = Math.floor(Math.min(screen.width - 48, screen.height * 0.67 / ratio));
  const layout = books.map((book, index) => ({ book, ...placementFor(book, index) }));
  const selected = layout.filter(({ book }) => ids.includes(book.id));
  const ready = selected.length > 0 && selected.every(({ book }) => !book.cover || loaded[book.id]);
  async function share() {
    if (!ready || running.current || !canvas.current) return;
    tapHaptic('select');
    running.current = true;
    setBusy(true);
    let uri: string | undefined;
    try {
      // The iOS renderer takes points and applies the device scale when encoding.
      const captureScale = Platform.OS === 'ios' ? screen.scale : 1;
      uri = await captureRef(canvas, { format: 'png', result: 'tmpfile', width: 1080 / captureScale, height: 1350 / captureScale });
      await Sharing.shareAsync(uri.startsWith('/') ? 'file://' + uri : uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      AppAlert.alert(t('studyNote.shareFailedTitle'), t('history.puzzle.shareFailedBody'));
    } finally {
      if (uri) releaseCapture(uri);
      running.current = false;
      setBusy(false);
    }
  }
  const left = layout.length ? Math.min(...layout.map(item => item.x)) : 0;
  const top = layout.length ? Math.min(...layout.map(item => item.y)) : 0;
  const spanX = Math.max(1, ...layout.map(item => item.x - left + bookWidth));
  const spanY = Math.max(1, ...layout.map(item => item.y - top + bookWidth / 0.69));
  const columns = Math.max(1, Math.ceil(Math.sqrt(selected.length)));
  const rows = Math.max(1, Math.ceil(selected.length / columns));
  const gap = width * 0.025;
  // Fit the rotated cover bounds inside each cell, including custom shelf angles.
  const radians = selected.map(({ angle }) => angle * Math.PI / 180);
  const widthFactor = Math.max(1, ...radians.map(a => Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)) / 0.69));
  const heightFactor = Math.max(1, ...radians.map(a => Math.abs(Math.sin(a)) + Math.abs(Math.cos(a)) / 0.69));
  const shareBookWidth = Math.min(
    (width * 0.88 - gap * (columns - 1)) / (columns * widthFactor),
    (width * ratio * 0.76 - gap * (rows - 1)) / (rows * heightFactor),
  );
  const cellWidth = shareBookWidth * widthFactor;
  const cellHeight = shareBookWidth * heightFactor;
  const shareGroupHeight = rows * cellHeight + (rows - 1) * gap;
  // Let the selected books fill the picker while leaving enough room for the
  // sheet header and title. Reserve extra vertical space for rotated covers.
  const pickerScale = Math.min(
    (screen.width - 64) * 0.92 / spanX,
    Math.max(1, screen.height - 240) / (spanY * 1.1),
  );
  return <AppModal visible nativeAnimation="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) close(); }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F4EE', paddingHorizontal: 16 }}>
      <PaperGrain opacity={0.42} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={close}
            style={{ minHeight: 48, minWidth: 60, justifyContent: 'center', paddingHorizontal: 12 }}>
            <ThemedText style={{ fontSize: 20, lineHeight: 28 }}>{t('common.close')}</ThemedText>
          </Pressable>
        </View>
        <ThemedText>{ids.length} / 9</ThemedText>
        <View style={{ flex: 1, alignItems: 'flex-end' }}><Pressable accessibilityRole="button" accessibilityLabel="SNS" disabled={!ready || busy} onPress={share} style={{ opacity: ready && !busy ? 1 : 0.4, padding: 5 }}>
          <SnsIcon color="#403A32" />
        </Pressable></View>
      </View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -width - 32 }}>
      <View ref={canvas} collapsable={false} style={{ width, height: width * ratio, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F2EC' }}>
        <PaperGrain opacity={0.42} />
        <ThemedText style={{ color: '#403A32', marginBottom: 10 }}>{heading}</ThemedText>
        <View style={{ width, height: shareGroupHeight }}>
          {selected.map(({ book, angle }, index) => {
            const row = Math.floor(index / columns);
            const rowCount = Math.min(columns, selected.length - row * columns);
            const rowWidth = rowCount * cellWidth + (rowCount - 1) * gap;
            return <View key={book.id} style={{
            position: 'absolute',
            left: (width - rowWidth + cellWidth - shareBookWidth) / 2 + (index % columns) * (cellWidth + gap),
            top: row * (cellHeight + gap) + (cellHeight - shareBookWidth / 0.69) / 2,
            width: shareBookWidth, transform: [{ rotate: angle + 'deg' }],
          }}>
            {renderBook(book, () => setLoaded(prev => prev[book.id] ? prev : { ...prev, [book.id]: true }))}
          </View>; })}
        </View>
      </View>
      </View>
        <ThemedText style={{ alignSelf: 'center', marginVertical: 16, fontSize: 22 }}>{heading}</ThemedText>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ width: spanX * pickerScale, height: spanY * pickerScale, alignSelf: 'center' }}>
          {layout.map(({ book, x, y, angle }) => {
            const position = ids.indexOf(book.id);
            const selected = position >= 0;
            const disabled = busy || (!selected && ids.length >= 9);
            return <Pressable key={book.id} accessibilityRole="button" accessibilityLabel={titleFor(book)}
              accessibilityState={{ selected, disabled }} disabled={disabled}
              onPress={() => { tapHaptic('select'); setLoaded(previous => ({ ...previous, [book.id]: false })); setIds(previous => previous.includes(book.id)
                ? previous.filter(id => id !== book.id)
                : previous.length < 9 ? [...previous, book.id] : previous); }}
              style={{ position: 'absolute', left: (x - left) * pickerScale, top: (y - top) * pickerScale, width: bookWidth * pickerScale, opacity: disabled ? 0.45 : 1, transform: [{ rotate: angle + 'deg' }] }}>
              {renderBook(book)}
              {selected && <View style={{ position: 'absolute', right: '8%', top: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#393530', alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ color: 'white', fontSize: 14 }}>{position + 1}</ThemedText>
              </View>}
            </Pressable>;
          })}
          </View>
        </ScrollView>
    </SafeAreaView>
  </AppModal>;
}
