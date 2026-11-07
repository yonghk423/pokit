import Svg, { Path } from 'react-native-svg';
import { useEffect, useState, type ReactNode } from 'react';
import { loadCityPopFont } from '@app/useCityPopFonts';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { APP_FONT_IDS, type AppFontId } from '@shared/lib/ui-font/appFontIds';
import { useTranslation } from '@shared/lib/i18n';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';

/** Same per-card controls for the lined editor and scene detail. */
export function HeroCardAppearanceControls({ pen, fontId, onChange, fontsOnly = false, leadingAction, trailingAction }: {
  paper: string; pen: string; fontId?: AppFontId; fontsOnly?: boolean; hidePaper?: boolean; leadingAction?: ReactNode; trailingAction?: ReactNode;
  onChange: (patch: { paper?: string; pen?: string; fontId?: AppFontId }) => void;
}) {
  const toolbar = !!(leadingAction || trailingAction);
  const { t } = useTranslation();
  const [open, setOpen] = useState<'font' | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void loadCityPopFont('cafe24Syongsyong').then(() => { if (mounted) setFontsReady(true); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const fontOptions = <ScrollView key={fontsReady ? 'loaded' : 'loading'} horizontal nestedScrollEnabled keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={[styles.fontScroller, fontsOnly && styles.inlineFontScroller]} contentContainerStyle={styles.fontOptions}>
    {[undefined, ...APP_FONT_IDS].map(id => <Pressable key={id ?? 'default'} testID={`hero-card-font-${id ?? 'default'}`} accessibilityRole="button"
      accessibilityLabel={id ? t(`settings.font.${id}`) : t('comicDay.fontDefault')} accessibilityState={{ selected: id === fontId }}
      onPress={() => { tapHaptic('select'); void loadCityPopFont(id ?? '').then(() => onChange({ fontId: id })); }} style={styles.fontChoice}>
      <ThemedText fontId={id} style={{ color: pen, fontSize: 15 }}>{id ? t(`settings.font.${id}`) : t('comicDay.fontDefaultShort')}</ThemedText>
      {id === fontId ? <View pointerEvents="none" testID={`hero-card-font-underline-${id ?? 'default'}`} style={styles.fontUnderline}>
        <Svg width="100%" height={6} viewBox="0 0 100 8" preserveAspectRatio="none" accessible={false}>
          <Path d="M2 4.9C22 3.7 44 5.1 64 3.8C78 3.1 90 3.6 98 3.1L97 4.1C82 4.9 72 4.5 62 5.5C40 6.6 19 5.7 3 6Z" fill={pen} />
        </Svg>
      </View> : null}
    </Pressable>)}
  </ScrollView>;
  if (fontsOnly) return <View testID="hero-card-font-row" style={styles.fontRow}>
    <View accessible accessibilityLabel={t('settings.fontTitle')} style={styles.fontIcon}><HanddrawnControl name="textformat" size={24} color={pen} /></View>
    <View style={styles.divider} />
    {fontOptions}
  </View>;
  return <View style={[styles.root, toolbar && styles.toolbarRoot]}>
    <View testID={toolbar ? "hero-card-editor-action-row" : undefined} style={[styles.row, toolbar && styles.toolbarRow]}>
      {leadingAction}
      <View style={[styles.row, toolbar && styles.toolbarChoices]}>
      <Pressable testID="hero-card-font-trigger" accessibilityRole="button" accessibilityLabel={t('settings.fontTitle')} accessibilityState={{ expanded: open === 'font' }} onPress={() => { Keyboard.dismiss(); setOpen(open === 'font' ? null : 'font'); }} style={[styles.trigger, toolbar && styles.toolbarTrigger]}>
        {toolbar ? <HanddrawnControl name="textformat" size={24} color={pen} /> : <ThemedText style={{ color: pen, fontSize: 13 }}>{t('settings.fontTitle')}</ThemedText>}
      </Pressable>
      </View>
      {trailingAction}
    </View>
    {open === 'font' ? fontOptions : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { flexShrink: 0, paddingVertical: 6, gap: 6 }, row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toolbarRoot: { flex: 1, flexDirection: 'column-reverse' }, toolbarRow: { flexWrap: 'nowrap', justifyContent: 'space-between', gap: 0 },
  toolbarChoices: { flex: 1, flexWrap: 'nowrap', justifyContent: 'center', gap: 4 },
  toolbarTrigger: { borderWidth: 0, paddingHorizontal: 6, width: 40, height: 44, justifyContent: 'center' },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 9, borderWidth: 0.5, borderRadius: 4 },
  fontRow: { flexDirection: 'row', width: '100%', gap: 4, alignItems: 'center', minHeight: 40 },
  fontIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 21, width: 0.5, backgroundColor: '#B6B6B0', marginHorizontal: 4 },
  fontScroller: { flexGrow: 0, flexShrink: 1, minWidth: 0, height: 40 },
  inlineFontScroller: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
  fontOptions: { alignItems: 'center', gap: 8, paddingRight: 8 },
  fontChoice: { minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  fontUnderline: { position: 'absolute', left: 5, right: 5, bottom: 0, height: 6 },
});
