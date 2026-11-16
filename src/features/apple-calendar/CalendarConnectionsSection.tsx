import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { ThemedText } from '@shared/ui/themed-text';
import { SettingsRowIcon, SettingsSection, buildSettingsPalette, settingsChromeStyles as chrome } from '../../pages/settings/lib/settingsChrome';
import { GoogleCalendarSection } from './GoogleCalendarSection';
import { AppleCalendarSection } from './AppleCalendarSection';

export function CalendarConnectionsSection({ isDark }: { isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const p = buildSettingsPalette(isDark);
  if (Platform.OS === 'android') return <SettingsSection border={p.border} surface={p.surface} isDark={isDark}><GoogleCalendarSection isDark={isDark} /></SettingsSection>;
  if (Platform.OS !== 'ios') return null;
  return <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(value => !value)}
      style={chrome.item}>
      <View style={chrome.itemLeft}>
        <SettingsRowIcon name="calendar" color={p.icon} boxBg={p.iconBoxBg} border={p.iconBorder} shadow={p.shadow} />
        <View collapsable={false} style={chrome.itemTextWrap}>
          <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{translateUiText("Apple · Google 캘린더 연결")}</ThemedText>
          <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{translateUiText("일정과 오늘의 기록을 함께 봐요")}</ThemedText>
        </View>
      </View>
      <ThemedText style={{ color: p.desc }}>{open ? '−' : '+'}</ThemedText>
    </Pressable>
    {open && <View>
      <AppleCalendarSection isDark={isDark} />
      <GoogleCalendarSection isDark={isDark} />
    </View>}
  </SettingsSection>;
}
