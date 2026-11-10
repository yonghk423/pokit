import { calendarDisplayTitle } from './calendarDisplayTitle';
import type { DeviceEvent } from './calendarDates';
import { calendarSourceLabel } from './calendarSourceLabel';
import { memo, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { useTranslation } from '@shared/lib/i18n';
import { calendarError, deviceCalendars, deviceEvents, useAppleCalendar, type DeviceCalendar } from './appleCalendar';
// Keep the heading's native text views stable while the accordion body loads.
const CalendarHeading = memo(function CalendarHeading({ ko, ink }: { ko: boolean; ink: string }) {
  return <View collapsable={false} style={{ flex: 1, gap: 2 }}>
    <ThemedText style={{ color: ink, fontSize: 19, lineHeight: 28 }}>{ko ? 'Apple · Google 캘린더 연결' : 'Apple · Google Calendar'}</ThemedText>
    <ThemedText style={{ color: ink, opacity: 0.7, fontSize: 13, lineHeight: 20 }}>{ko ? '일정과 오늘의 기록을 함께 봐요' : 'See your plans alongside your diary'}</ThemedText>
  </View>;
});
export function AppleCalendarSection({ isDark }: { isDark: boolean }) {
  const { locale } = useTranslation();
  const ko = locale === 'ko', ink = isDark ? '#EEECE6' : '#292D28';
  const ids = useAppleCalendar(state => state.ids), select = useAppleCalendar(state => state.select);
  const disconnected = useAppleCalendar(state => state.disconnected);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [monthEvents, setMonthEvents] = useState<DeviceEvent[] | null>(null);
  const loaded = useRef(false);
  const loading = useRef(false);
  const load = async (request = false) => {
    if (loading.current || (!request && useAppleCalendar.getState().disconnected)) return;
    loading.current = true;
    setBusy(true); setError(''); setMonthEvents(null);
    try {
      const next = await deviceCalendars(request);
      if (request) useAppleCalendar.getState().reconnect();
      if (useAppleCalendar.getState().disconnected) return;
      setCalendars(next); loaded.current = true;
      const selected = useAppleCalendar.getState().ids;
      const valid = selected.filter(id => next.some(calendar => calendar.id === id));
      if (valid.length !== selected.length) select(valid);
      const now = new Date();
      try { setMonthEvents(await deviceEvents(next.map(calendar => calendar.id), new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1))); }
      catch { setMonthEvents(null); }
    }
    catch (e) { setError(calendarError(e, ko)); }
    finally { loading.current = false; setBusy(false); }
  };
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active' && open) void load(); });
    return () => subscription.remove();
  }, [open, ko]);
  if (Platform.OS !== 'ios') return null;
  return <View style={{ padding: 16, gap: 10, marginBottom: 18, borderWidth: 0.5, borderColor: ink, borderRadius: 8 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, busy }} onPress={() => { setOpen(value => !value); if (!open && !loaded.current && !disconnected) void load(true); }} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <HanddrawnControl name="calendar" color={ink} size={28} />
      <CalendarHeading ko={ko} ink={ink} />
      <View style={{ width: 24, height: 28, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, lineHeight: 28 }}>{open ? '−' : '+'}</ThemedText></View>
    </Pressable>

    <View accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={{ display: open ? 'flex' : 'none', gap: 10 }}>
      {disconnected ? <View style={{ gap: 8 }}>
        <ThemedText style={{ color: ink }}>{ko ? '캘린더 연결이 해제되어 있어요.' : 'Calendar connection is off.'}</ThemedText>
        {error ? <ThemedText accessibilityLiveRegion="polite" style={{ color: ink }}>{error}</ThemedText> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void load(true)} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, textDecorationLine: 'underline' }}>{ko ? '캘린더 다시 연결' : 'Reconnect calendars'}</ThemedText></Pressable>
      </View> : null}
      <View style={{ display: disconnected ? 'none' : 'flex', gap: 10 }} accessibilityElementsHidden={disconnected} importantForAccessibility={disconnected ? 'no-hide-descendants' : 'auto'}>
      {error ? <><ThemedText accessibilityLiveRegion="polite" style={{ color: ink }}>{error}</ThemedText><Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}><ThemedText style={{ color: ink, textDecorationLine: 'underline' }}>{ko ? '아이폰 설정 열기' : 'Open iPhone Settings'}</ThemedText></Pressable></> : null}
      <ThemedText accessibilityLiveRegion="polite" style={{ color: ink, fontSize: 13, lineHeight: 20 }}>{busy ? (ko ? '불러오는 중…' : 'Loading…') : (ko ? `${ids.length}개 캘린더 표시 중` : `${ids.length} calendars selected`)}</ThemedText>
      <ThemedText style={{ color: ink, fontSize: 13 }}>{ko ? '아이폰에 등록된 Apple·Google 캘린더를 선택해주세요. 체크한 캘린더의 일정을 함께 표시해요.' : 'Choose Apple and Google calendars registered on your iPhone. Events from all selected calendars appear together.'}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Pressable testID="calendar-refresh-always" accessibilityRole="button" disabled={busy} onPress={() => void load()} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, textDecorationLine: 'underline' }}>{ko ? '목록 새로고침' : 'Refresh calendars'}</ThemedText></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink }}>{ko ? '앱 접근 권한 확인' : 'Check app permissions'}</ThemedText></Pressable>
      </View>
      {!busy && !error && !calendars.length ? <ThemedText style={{ color: ink }}>{ko ? '연결된 캘린더가 없어요.' : 'No calendars available.'}</ThemedText> : null}
      {[...new Set(calendars.map(calendar => calendarSourceLabel(calendar.sourceName, calendar.sourceType, ko)))].map(provider => <View key={provider} style={{ gap: 4, marginTop: 12 }}>
        <ThemedText style={{ color: ink, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{provider}</ThemedText>
        {calendars.filter(calendar => calendarSourceLabel(calendar.sourceName, calendar.sourceType, ko) === provider).map(calendar => <Pressable key={calendar.id} accessibilityRole="checkbox" accessibilityLabel={`${provider}, ${calendarDisplayTitle(calendar.title, ko)}`} accessibilityState={{ checked: ids.includes(calendar.id) }} onPress={() => select(ids.includes(calendar.id) ? ids.filter(id => id !== calendar.id) : [...ids, calendar.id])} style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 24, height: 24, borderWidth: 1, borderRadius: 4, borderColor: ink, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText style={{ color: ink, fontSize: 18, lineHeight: 22, opacity: ids.includes(calendar.id) ? 1 : 0 }}>✓</ThemedText>
          </View>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: calendar.color }} />
          <View style={{ flex: 1, paddingVertical: 8, gap: 3 }}>
            <ThemedText style={{ color: ink }}>{calendarDisplayTitle(calendar.title, ko)}</ThemedText>
            <ThemedText numberOfLines={1} style={{ color: ink, opacity: 0.65, fontSize: 12, lineHeight: 20 }}>{monthEvents === null ? (busy ? (ko ? '이번 달 일정 확인 중…' : 'Checking this month…') : (ko ? '이번 달 일정 수 확인 불가' : 'Event count unavailable')) : (ko ? `이번 달 ${monthEvents.filter(event => event.calendarId === calendar.id).length}개` : `${monthEvents.filter(event => event.calendarId === calendar.id).length} events this month`) + (monthEvents.find(event => event.calendarId === calendar.id)?.title ? ` · ${monthEvents.find(event => event.calendarId === calendar.id)!.title}` : '')}</ThemedText>
          </View>
        </Pressable>)}
      </View>)}
      <Pressable accessibilityRole="button" disabled={!ids.length} onPress={() => select([])} style={{ minHeight: 44, justifyContent: 'center', opacity: ids.length ? 1 : 0.35 }}><ThemedText style={{ color: ink }}>{ko ? '모두 선택 해제' : 'Deselect all'}</ThemedText></Pressable>
      <Pressable testID="calendar-disconnect" accessibilityRole="button" disabled={busy} onPress={() => {
        useAppleCalendar.getState().disconnect();
        setCalendars([]); setMonthEvents(null); setError(''); loaded.current = false;
      }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, textDecorationLine: 'underline' }}>{ko ? '캘린더 연결 해제' : 'Disconnect calendars'}</ThemedText></Pressable>
      <ThemedText style={{ color: ink, opacity: 0.65, fontSize: 12 }}>{ko ? '앱에서 일정 조회와 표시를 중단해요. 접근 권한도 끄려면 아이폰 설정에서 변경해주세요.' : 'Stops reading and showing events in this app. To revoke access, use iPhone Settings.'}</ThemedText>
      </View>
      {disconnected ? <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink }}>{ko ? '아이폰에서 접근 권한 끄기' : 'Manage permission in iPhone Settings'}</ThemedText></Pressable> : null}
    </View>
  </View>;
}
