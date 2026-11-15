import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalendarPhotosHidden, setCalendarPhotosHidden } from '@shared/lib/calendarLayoutPreferences';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnToggle } from '@shared/ui/handdrawn-toggle';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { buildSettingsPalette, SettingsSection, settingsChromeStyles as chrome } from '../lib/settingsChrome';

export function LayoutSettingsPage() {
  useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const hidden = useCalendarPhotosHidden();
  return <ThemedView style={{ flex: 1, backgroundColor: p.bg }}>
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View style={[chrome.header, { backgroundColor: p.bg, borderBottomColor: p.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={translateUiText("뒤로")} onPress={() => router.back()} style={chrome.headerBtn}><IconSymbol name="chevron.left" size={20} color={p.title} /></Pressable>
        <ThemedText style={[chrome.headerTitle, { color: p.title }]}>{translateUiText("레이아웃 설정")}</ThemedText>
        <View style={chrome.headerBtn} />
      </View>
      <ScrollView contentContainerStyle={chrome.container}>
        <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
          <View style={[chrome.item, { borderTopWidth: 0 }]}>
            <View style={[chrome.itemTextWrap, { flex: 1 }]}>
              <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{translateUiText("메인 달력 사진 가리기")}</ThemedText>
              <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{translateUiText("메인 달력과 위젯의 날짜 안 사진을 숨겨 간결하게 보여줘요.")}</ThemedText>
            </View>
            <HanddrawnToggle checked={hidden} label={translateUiText("메인 달력 사진 가리기")} isDark={isDark} onChange={value => { tapHaptic('select'); setCalendarPhotosHidden(value); }} />
          </View>
        </SettingsSection>
      </ScrollView>
    </View>
  </ThemedView>;
}
