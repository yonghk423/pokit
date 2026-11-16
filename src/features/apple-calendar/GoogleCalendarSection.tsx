import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { SettingsRowIcon, buildSettingsPalette, settingsChromeStyles as chrome } from '../../pages/settings/lib/settingsChrome';
import { connectGoogleCalendar, selectGoogleCalendar, useGoogleCalendar } from './googleCalendar';

export function GoogleCalendarSection({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();
  const email = useGoogleCalendar(state => state.email);
  const tasksEmail = useGoogleCalendar(state => state.tasksEmail);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const p = buildSettingsPalette(isDark);
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  const complete = !!email && tasksEmail === email;
  async function toggleConnection() {
    setFailed(false);
    if (complete) {
      selectGoogleCalendar(null);
      return;
    }
    setBusy(true);
    try {
      await connectGoogleCalendar();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return <View><Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ busy }} onPress={() => void toggleConnection()} style={chrome.item}>
      <View style={chrome.itemLeft}>
        <SettingsRowIcon name="calendar" color={p.icon} boxBg={p.iconBoxBg} border={p.iconBorder} shadow={p.shadow} />
        <View style={chrome.itemTextWrap}>
          <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{t(complete ? 'settings.googleCalendar.disconnect' : email ? 'settings.googleCalendar.upgrade' : 'settings.googleCalendar.connect')}</ThemedText>
          <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{email ?? t('settings.googleCalendar.description')}</ThemedText>
          {failed && <ThemedText accessibilityLiveRegion="polite" style={{ color: p.title }}>{t('settings.googleCalendar.error')}</ThemedText>}
        </View>
      </View>
    </Pressable>
    {email && !complete && <Pressable accessibilityRole="button" disabled={busy} onPress={() => selectGoogleCalendar(null)} style={chrome.item}>
      <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{t('settings.googleCalendar.disconnect')}</ThemedText>
    </Pressable>}
  </View>;
}
