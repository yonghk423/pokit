import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { ThemedText } from '@shared/ui/themed-text';
import { restartAppSession } from '@shared/lib/app-session';
import { buildSettingsPalette, SettingsRowIcon, SettingsSection, settingsChromeStyles as chrome } from '../../pages/settings/lib/settingsChrome';
import { loadHeroOriginalPhotoLibrary } from '../../pages/day-plan/lib/heroOriginalPhoto';
import { dateOf, localDates } from './dateData';
import { backupDate, connectDrive, disconnectDrive, driveEmail, restoreDriveConnection, listBackups, restoreDate, type DriveBackup } from './drive';
function BackupButton({ label, onPress, disabled, p }: { label: string; onPress: () => void; disabled: boolean; p: ReturnType<typeof buildSettingsPalette> }) {
  return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} style={[styles.button, { borderColor: p.border, opacity: disabled ? 0.5 : 1 }]}><ThemedText style={{ color: p.title }}>{label}</ThemedText></Pressable>;
}
export function DriveBackupSection({ isDark }: { isDark: boolean }) {
  const p = buildSettingsPalette(isDark);
  const [galleryDates, setGalleryDates] = useState<string[]>([]);
  useEffect(() => { let active = true; void loadHeroOriginalPhotoLibrary().then(images => { if (active) setGalleryDates(images.map(image => dateOf(image.createdAt))); }).catch(() => undefined); return () => { active = false; }; }, []);
  const [email, setEmail] = useState(driveEmail);
  const [open, setOpen] = useState(false);
  const running = useRef(false);
  const [busy, setBusy] = useState('연결 확인 중');
  useEffect(() => {
    let active = true;
    void restoreDriveConnection().then(account => { if (active) setEmail(account); }).catch(() => undefined).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);
  const [backups, setBackups] = useState<DriveBackup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState('');
  const dates = [...new Set([...localDates(), ...galleryDates, ...backups.map(b => b.appProperties.date)])].sort().reverse();
  const periods = [...new Set(dates.map(d => d.slice(0, 7)))];
  const selected = period || periods[0];
  const run = useCallback(async (label: string, task: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(label);
    try { await task(); } catch (e) { Alert.alert('백업 및 복구', e instanceof Error ? e.message : '작업을 완료하지 못했어요. 다시 시도해 주세요.'); }
    finally { running.current = false; setBusy(''); }
  }, []);
  async function refresh() { setBackups(await listBackups()); setLoaded(true); }
  return <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
    <Pressable style={chrome.item} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <View style={chrome.itemLeft}>
        <SettingsRowIcon name="cloud.backup" color={p.icon} boxBg={p.iconBoxBg} border={p.iconBorder} shadow={p.shadow} />
        <View style={chrome.itemTextWrap}>
          <ThemedText style={[chrome.itemTitle, { color: p.title }]}>백업 및 복구</ThemedText>
          <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{email ?? '날짜별 기록과 이미지 원본을 내 Google Drive에 보관해요'}</ThemedText>
        </View>
      </View>
      <ThemedText style={{ color: p.desc }}>{open ? '−' : '+'}</ThemedText>
    </Pressable>
    {open && <View style={styles.content}>
      <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>나의 이야기, 직접 추가한 이벤트, 업로드한 사진 원본과 사진에 저장한 글을 날짜별로 백업해요. 글꼴 등 앱 설정은 제외하며, 내 Google Drive의 앱 전용 공간에 보관해요.</ThemedText>
      {!email ? <BackupButton label={'Google Drive 연결하기'} onPress={() => void run('Google 연결 중', async () => { setEmail(await connectDrive()); await refresh(); })} disabled={!!busy} p={p} /> : <>
        {<BackupButton label={'백업 목록 새로고침'} onPress={() => void run('목록 불러오는 중', refresh)} disabled={!!busy} p={p} />}
        {<BackupButton label={'Google Drive 연결 해제'} onPress={() => Alert.alert('연결 해제', 'Drive에 저장한 백업은 유지돼요.', [{ text: '취소', style: 'cancel' }, { text: '연결 해제', onPress: () => void run('연결 해제 중', async () => { await disconnectDrive(); setEmail(null); setBackups([]); setLoaded(false); }) }])} disabled={!!busy} p={p} />}
        {!loaded && <ThemedText style={{ color: p.desc }}>새로고침을 눌러 저장된 백업을 확인하세요.</ThemedText>}
        <View style={styles.periods}>{periods.map(month => <Pressable key={month} disabled={!!busy} accessibilityRole="button" accessibilityState={{ selected: month === selected }} onPress={() => setPeriod(month)} style={[styles.button, { borderColor: p.border, backgroundColor: month === selected ? p.bg : p.surface }]}><ThemedText style={{ color: p.title }}>{month.slice(0, 4)}년 {Number(month.slice(5))}월</ThemedText></Pressable>)}</View>
        {dates.filter(d => d.startsWith(selected ?? '')).map(date => <View key={date} style={[styles.day, { borderColor: p.border }]}>
          <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{date}</ThemedText>
          {[...localDates(), ...galleryDates].includes(date) && <BackupButton label={'이 날짜 백업하기'} onPress={() => void run('백업 준비 중', async () => { await backupDate(date, setBusy); await refresh(); Alert.alert('백업 완료', `${date}의 기록과 이미지 원본을 Google Drive에 저장했어요.`); })} disabled={!!busy} p={p} />}
          {backups.filter(b => b.appProperties.date === date).map(b => <View key={b.id}>{<BackupButton label={`복구 · ${new Date(b.createdTime).toLocaleString()}`} onPress={() => Alert.alert(`${date} 복구`, `이 날짜의 기록을 선택한 백업으로 교체해요. 다른 날짜의 기록은 유지돼요.`, [{ text: '취소', style: 'cancel' }, { text: '복구하기', style: 'destructive', onPress: () => void run('백업 확인 중', async () => { await restoreDate(b, setBusy); Alert.alert('복구 완료', `${date}의 기록과 이미지를 가져왔어요.`, [{ text: '확인', onPress: restartAppSession }]); }) }])} disabled={!!busy} p={p} />}</View>)}
        </View>)}
        {dates.length === 0 && <ThemedText style={{ color: p.desc }}>백업할 날짜별 기록이 없어요.</ThemedText>}
      </>}
      {!!busy && <ThemedText accessibilityLiveRegion="polite" style={{ color: p.title }}>{busy}</ThemedText>}
    </View>}
  </SettingsSection>;
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 12 }, button: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12 }, periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, day: { borderTopWidth: 1, paddingTop: 12, gap: 8 } });
