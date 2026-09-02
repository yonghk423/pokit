import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const PRIMARY = 'rgb(0, 0, 0)';
const BG = '#09090b';
const SURFACE = '#151518';
const SURFACE_CARD = '#1e1e23';
const TEXT_MUTED = '#9ca3af';

const STYLE_KEYS = [
  'data-rich',
  'minimal-timer',
  'image-focus',
  'circular-focus',
  'bold-type',
  'habit-streak',
  'zen-gradient',
  'analog-clock',
  'checklist',
  'ai-message',
  'retro-pixel',
  'kinetic-glass',
] as const;

const STYLE_TITLES: Record<(typeof STYLE_KEYS)[number], string> = {
  'data-rich': 'Data Rich',
  'minimal-timer': 'Minimal Timer',
  'image-focus': 'Image Focus',
  'circular-focus': 'Circular Focus',
  'bold-type': 'Bold Typography',
  'habit-streak': 'Habit Streak',
  'zen-gradient': 'Zen Gradient',
  'analog-clock': 'Analog Clock',
  checklist: 'Checklist',
  'ai-message': 'AI Message',
  'retro-pixel': 'Retro Pixel',
  'kinetic-glass': 'Kinetic Glass',
};

const STYLE_DESC_KEYS = {
  'data-rich': 'widgetSettings.style.dataRich',
  'minimal-timer': 'widgetSettings.style.minimalTimer',
  'image-focus': 'widgetSettings.style.imageFocus',
  'circular-focus': 'widgetSettings.style.circularFocus',
  'bold-type': 'widgetSettings.style.boldType',
  'habit-streak': 'widgetSettings.style.habitStreak',
  'zen-gradient': 'widgetSettings.style.zenGradient',
  'analog-clock': 'widgetSettings.style.analogClock',
  checklist: 'widgetSettings.style.checklist',
  'ai-message': 'widgetSettings.style.aiMessage',
  'retro-pixel': 'widgetSettings.style.retroPixel',
  'kinetic-glass': 'widgetSettings.style.kineticGlass',
} as const;

export function WidgetSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<(typeof STYLE_KEYS)[number]>('data-rich');
  const [kineticTransition, setKineticTransition] = useState(true);
  const styleOptions = useMemo(
    () =>
      STYLE_KEYS.map((key) => ({
        key,
        title: STYLE_TITLES[key],
        description: t(STYLE_DESC_KEYS[key]),
      })),
    [t],
  );

  return (
    <ThemedView style={sheetStyles.screen} darkColor={BG} lightColor={BG}>
      <SafeAreaView style={sheetStyles.safe} edges={['top', 'bottom']}>
        <View style={sheetStyles.topBar}>
          <View style={sheetStyles.topBarLeft}>
            <Pressable onPress={() => router.back()} style={sheetStyles.iconTap}>
              <IconSymbol name="arrow.backward" size={20} color={PRIMARY} />
            </Pressable>
            <ThemedText style={sheetStyles.topTitle}>{t('widgetSettings.title')}</ThemedText>
          </View>
          <Pressable style={sheetStyles.saveTopButton}>
            <ThemedText style={sheetStyles.saveTopText}>{t('common.save')}</ThemedText>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheetStyles.content}>
          <View style={sheetStyles.previewSection}>
            <View style={sheetStyles.phoneShell}>
              <View style={sheetStyles.wallpaper} />
              <View style={sheetStyles.lockContent}>
                <ThemedText style={sheetStyles.dateText}>MONDAY, JUNE 12</ThemedText>
                <ThemedText style={sheetStyles.timeText}>09:41</ThemedText>

                <View style={sheetStyles.liveWidget}>
                  <View style={sheetStyles.widgetHead}>
                    <ThemedText style={sheetStyles.widgetKicker}>Morning Jog</ThemedText>
                    <IconSymbol name="figure.run" size={14} color="#fff" />
                  </View>
                  <View style={sheetStyles.widgetBottom}>
                    <View>
                      <ThemedText style={sheetStyles.kmText}>4.2km</ThemedText>
                      <ThemedText style={sheetStyles.paceText}>{'Pace: 5\'12"/km'}</ThemedText>
                    </View>
                    <View style={sheetStyles.percentCircle}>
                      <ThemedText style={sheetStyles.percentText}>75%</ThemedText>
                    </View>
                  </View>
                </View>

                <View style={sheetStyles.bottomIndicators}>
                  <View style={sheetStyles.indicatorBtn}>
                    <IconSymbol name="flashlight.off.fill" size={18} color="#fff" />
                  </View>
                  <View style={sheetStyles.indicatorBtn}>
                    <IconSymbol name="camera.fill" size={18} color="#fff" />
                  </View>
                </View>
              </View>
              <View style={sheetStyles.homeBar} />
            </View>
          </View>

          <View style={sheetStyles.sectionHeaderRow}>
            <View>
              <ThemedText style={sheetStyles.customizationKicker}>CUSTOMIZATION</ThemedText>
              <ThemedText style={sheetStyles.sectionTitle}>{t('widgetSettings.pickStyle')}</ThemedText>
            </View>
            <View style={sheetStyles.counterPill}>
              <ThemedText style={sheetStyles.counterText}>
                {styleOptions.findIndex((s) => s.key === selectedStyle) + 1} / {styleOptions.length}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={sheetStyles.styleRow}>
            {styleOptions.map((item) => {
              const active = item.key === selectedStyle;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSelectedStyle(item.key)}
                  style={[sheetStyles.styleCard, active && sheetStyles.styleCardActive]}>
                  <View style={[sheetStyles.mockCard, active && sheetStyles.mockCardActive]} />
                  <ThemedText style={sheetStyles.styleTitle}>{item.title}</ThemedText>
                  <ThemedText style={sheetStyles.styleDesc}>{item.description}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={sheetStyles.settingBox}>
            <View>
              <ThemedText style={sheetStyles.settingTitle}>{t('widgetSettings.kineticTitle')}</ThemedText>
              <ThemedText style={sheetStyles.settingDescription}>
                {t('widgetSettings.kineticDesc')}
              </ThemedText>
            </View>
            <Switch
              trackColor={{ true: PRIMARY, false: '#3f3f46' }}
              thumbColor="#fff"
              value={kineticTransition}
              onValueChange={setKineticTransition}
            />
          </View>

          <Pressable style={sheetStyles.saveButton}>
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <ThemedText style={sheetStyles.saveButtonText}>{t('widgetSettings.saveSettings')}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const sheetStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b0b0e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconTap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#f3f4f6', fontSize: 18, fontWeight: '800' },
  saveTopButton: { paddingHorizontal: 8, paddingVertical: 6 },
  saveTopText: { color: PRIMARY, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  previewSection: { marginTop: 18, alignItems: 'center' },
  phoneShell: {
    width: 280,
    height: 580,
    borderRadius: 42,
    backgroundColor: '#000',
    borderWidth: 8,
    borderColor: '#3f3f46',
    overflow: 'hidden',
  },
  wallpaper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#223047',
    opacity: 0.92,
  },
  lockContent: { flex: 1, alignItems: 'center', paddingTop: 54 },
  dateText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  timeText: { marginTop: 8, color: '#fff', fontSize: 68, fontWeight: '300', letterSpacing: -1.2 },
  liveWidget: {
    marginTop: 26,
    width: 240,
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 12,
  },
  widgetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  widgetKicker: { color: PRIMARY, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  widgetBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kmText: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  paceText: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  percentCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bottomIndicators: {
    marginTop: 'auto',
    marginBottom: 40,
    flexDirection: 'row',
    gap: 44,
  },
  indicatorBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBar: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -64,
    width: 128,
    height: 6,
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  sectionHeaderRow: {
    marginTop: 26,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  customizationKicker: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  counterPill: {
    borderRadius: 0,
    backgroundColor: SURFACE,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  counterText: { color: '#f3f4f6', fontSize: 13, fontWeight: '700' },
  styleRow: { gap: 12, paddingHorizontal: 8, paddingTop: 18, paddingBottom: 14 },
  styleCard: {
    width: 160,
    borderRadius: 0,
    backgroundColor: SURFACE_CARD,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  styleCardActive: {
    backgroundColor: '#fff',
    borderColor: PRIMARY,
    borderWidth: 2,
  },
  mockCard: {
    height: 94,
    borderRadius: 0,
    backgroundColor: '#2f2f34',
    marginBottom: 10,
  },
  mockCardActive: {
    backgroundColor: '#f3f4f6',
  },
  styleTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  styleDesc: { color: '#4b5563', fontSize: 10, marginTop: 4, lineHeight: 14 },
  settingBox: {
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 0,
    backgroundColor: SURFACE_CARD,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  settingDescription: { color: TEXT_MUTED, fontSize: 12, marginTop: 4, maxWidth: 220 },
  saveButton: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    height: 56,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
