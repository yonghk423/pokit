import { DriveStorageMeter } from './DriveStorageMeter';
import { useTranslation } from '@shared/lib/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { ThemedText } from '@shared/ui/themed-text';
import { restartAppSession } from '@shared/lib/app-session';
import { openWebLink } from '@shared/lib/url/openWebLink';
import { buildSettingsPalette, SettingsRowIcon, SettingsSection, settingsChromeStyles as chrome } from '../../pages/settings/lib/settingsChrome';
import { loadHeroOriginalPhotoLibrary } from '../../pages/day-plan/lib/heroOriginalPhoto';
import { dateOf, localDates } from './dateData';
import { backupDate, connectDrive, disconnectDrive, driveEmail, restoreDriveConnection, listBackups, getDriveStorageQuota, restoreDate, deleteDateBackup, type DriveBackup, type DriveStorageQuota } from './drive';
function BackupButton({ label, onPress, disabled, p }: { label: string; onPress: () => void; disabled: boolean; p: ReturnType<typeof buildSettingsPalette> }) {
  return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} style={[styles.button, { borderColor: p.border, opacity: disabled ? 0.5 : 1 }]}><ThemedText style={{ color: p.title }}>{label}</ThemedText></Pressable>;
}
export function DriveBackupSection({ isDark }: { isDark: boolean }) {
  const p = buildSettingsPalette(isDark);
  const { t } = useTranslation();
  const [galleryDates, setGalleryDates] = useState<string[]>([]);
  useEffect(() => { let active = true; void loadHeroOriginalPhotoLibrary().then(images => { if (active) setGalleryDates(images.map(image => dateOf(image.createdAt))); }).catch(() => undefined); return () => { active = false; }; }, []);
  const [email, setEmail] = useState(driveEmail);
  const [storageQuota, setStorageQuota] = useState<DriveStorageQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(!!email);
  const [quotaError, setQuotaError] = useState(false);
  const [open, setOpen] = useState(false);
  const running = useRef(false);
  const [busy, setBusy] = useState('연결 확인 중');
  const [listError, setListError] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const account = await restoreDriveConnection();
        if (!active) return;
        setEmail(account);
        if (account) {
          setQuotaLoading(true);
          setBusy('백업 상태 확인 중');
          const [rows, quota] = await Promise.allSettled([listBackups(), getDriveStorageQuota()]);
          if (active && rows.status === 'fulfilled') { setBackups(rows.value); setLoaded(true); setListError(false); }
          else if (active) setListError(true);
          if (active && quota.status === 'fulfilled') { setStorageQuota(quota.value); setQuotaError(false); }
          else if (active) setQuotaError(true);
        }
      } catch { if (active) { setLoaded(false); setListError(true); } }
      finally { if (active) { setBusy(''); setQuotaLoading(false); } }
    })();
    return () => { active = false; };
  }, []);
  const [backups, setBackups] = useState<DriveBackup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
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
  async function refresh() {
    setLoaded(false);
    setListError(false);
    setQuotaLoading(true);
    setQuotaError(false);
    try {
      const [rows, quota] = await Promise.allSettled([listBackups(), getDriveStorageQuota()]);
      if (rows.status === 'rejected') throw rows.reason;
      setBackups(rows.value);
      setLoaded(true);
      if (quota.status === 'fulfilled') setStorageQuota(quota.value);
      else setQuotaError(true);
    }
    catch (error) { setListError(true); throw error; }
    finally { setQuotaLoading(false); }
  }
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
      <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>일정 계획 기록, 직접 추가한 이벤트, 업로드한 사진 원본과 사진에 저장한 글을 날짜별로 백업해요. 글꼴 등 앱 설정은 제외하며, 내 Google Drive의 앱 전용 공간에 보관해요.</ThemedText>
      {!email ? <BackupButton label={'Google Drive 연결하기'} onPress={() => void run('Google 연결 중', async () => { setEmail(await connectDrive()); await refresh(); })} disabled={!!busy} p={p} /> : <>
        <View style={[styles.quota, { borderColor: p.border, backgroundColor: p.surface }]}>
          <ThemedText style={{ color: p.title }}>{t('drive.storage.title')}</ThemedText>
          {storageQuota ? <DriveStorageMeter quota={storageQuota} ink={p.title} muted={p.desc} dark={isDark} /> : <ThemedText style={{ color: p.desc, fontSize: 13 }}>{quotaLoading ? '저장공간 확인 중…' : quotaError ? '저장공간을 확인하지 못했어요. 목록을 새로고침해 주세요.' : '저장공간 정보가 없어요.'}</ThemedText>}
          <ThemedText style={{ color: p.desc, fontSize: 12, lineHeight: 18 }}>{t('drive.storage.description')}</ThemedText>
          <BackupButton label={'Google One에서 저장공간 관리'} onPress={() => { void openWebLink('https://one.google.com/about/plans').then(opened => { if (!opened) Alert.alert('Google One', '페이지를 열지 못했어요. Safari에서 one.google.com/about/plans에 접속해 주세요.'); }); }} disabled={!!busy} p={p} />
          <ThemedText style={{ color: p.desc, fontSize: 12, lineHeight: 18 }}>용량을 변경한 뒤 돌아와 백업 목록을 새로고침하면 남은 공간을 다시 확인할 수 있어요.</ThemedText>
        </View>
        {<BackupButton label={'백업 목록 새로고침'} onPress={() => void run('목록 불러오는 중', refresh)} disabled={!!busy} p={p} />}
        {<BackupButton label={'Google Drive 연결 해제'} onPress={() => Alert.alert('연결 해제', 'Drive에 저장한 백업은 유지돼요.', [{ text: '취소', style: 'cancel' }, { text: '연결 해제', onPress: () => void run('연결 해제 중', async () => { await disconnectDrive(); setEmail(null); setBackups([]); setLoaded(false); }) }])} disabled={!!busy} p={p} />}
        {!loaded && <ThemedText style={{ color: p.desc }}>{listError ? '백업 상태를 확인하지 못했어요. 목록 새로고침을 눌러 다시 확인해 주세요.' : 'Google Drive의 백업 상태를 확인하고 있어요.'}</ThemedText>}
        <View style={styles.periods}>{periods.map(month => <Pressable key={month} disabled={!!busy} accessibilityRole="button" accessibilityState={{ selected: month === selected }} onPress={() => { setPeriod(month); setExpandedDate(null); }} style={[styles.button, { borderColor: p.border, backgroundColor: month === selected ? p.bg : p.surface }]}><ThemedText style={{ color: p.title }}>{month.slice(0, 4)}년 {Number(month.slice(5))}월</ThemedText></Pressable>)}</View>
        <ThemedText style={{ color: p.desc }}>날짜를 선택해 백업하거나 복구하세요</ThemedText>
        <ScrollView style={styles.dateList} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar contentContainerStyle={styles.dateListContent}>
        {dates.filter(d => d.startsWith(selected ?? '')).map(date => <View key={date} style={[styles.day, { borderColor: p.border }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedDate === date }} onPress={() => setExpandedDate(expandedDate === date ? null : date)} style={styles.dateHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{date}</ThemedText>
              <ThemedText style={{ color: p.desc, fontSize: 13 }}>{!loaded ? (listError ? '백업 상태 확인 필요' : '백업 상태 확인 중') : backups.some(b => b.appProperties.date === date) ? 'Drive에 백업됨' : 'Google Drive 백업 없음'}</ThemedText>
            </View>
            <ThemedText style={{ color: p.desc }}>{expandedDate === date ? '−' : '+'}</ThemedText>
          </Pressable>
          {expandedDate === date && <View style={styles.dateActions}>
          {loaded && !backups.some(b => b.appProperties.date === date) && <ThemedText style={{ color: p.desc, fontSize: 13, lineHeight: 20 }}>이 날짜의 기록과 사진은 현재 휴대폰에 저장되어 있어요. 아래 백업 버튼을 누르면 Google Drive에도 복사해 보관할 수 있어요.</ThemedText>}
          {[...localDates(), ...galleryDates].includes(date) && <BackupButton label={'이 날짜 백업하기'} onPress={() => void run('백업 준비 중', async () => { await backupDate(date, setBusy); await refresh(); Alert.alert('백업 완료', `${date}의 기록과 이미지 원본을 Google Drive에 저장했어요.`); })} disabled={!!busy} p={p} />}
          {backups.filter(b => b.appProperties.date === date).map(b => <View key={b.id} style={[styles.backupRow, { borderColor: p.border, backgroundColor: p.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${date} ${new Date(b.createdTime).toLocaleString()} 백업 복구`}
              disabled={!!busy}
              onPress={() => Alert.alert(`${date} 복구`, `이 날짜의 기록을 선택한 백업으로 교체해요. 다른 날짜의 기록은 유지돼요.`, [{ text: '취소', style: 'cancel' }, { text: '복구하기', style: 'destructive', onPress: () => void run('백업 확인 중', async () => { await restoreDate(b, setBusy); Alert.alert('복구 완료', `${date}의 기록과 이미지를 가져왔어요.`, [{ text: '확인', onPress: restartAppSession }]); }) }])}
              style={styles.restoreRow}>
              <ThemedText numberOfLines={1} style={{ color: p.title, flexShrink: 1 }}>복구 · {new Date(b.createdTime).toLocaleString()}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${date} Drive 백업 삭제`}
              disabled={!!busy}
              onPress={() => Alert.alert('Drive 백업 삭제', `${date} 백업과 함께 저장된 사진 원본도 Google Drive에서 삭제해요. 휴대폰에 있는 원본과 기록은 유지됩니다.`, [{ text: '취소', style: 'cancel' }, { text: '백업 삭제', style: 'destructive', onPress: () => void run('Drive 백업 삭제 중', async () => { await deleteDateBackup(b, setBusy); await refresh(); Alert.alert('삭제 완료', `${date} 백업과 백업 사진을 Google Drive에서 삭제했어요.`); }) }])}
              style={[styles.deleteRow, { borderColor: p.border, opacity: busy ? 0.5 : 1 }]}>
              <ThemedText style={{ color: p.desc, fontSize: 14 }}>{t('common.delete')}</ThemedText>
            </Pressable>
          </View>)}
          </View>}
        </View>)}
        </ScrollView>
        {dates.length === 0 && <ThemedText style={{ color: p.desc }}>백업할 날짜별 기록이 없어요.</ThemedText>}
      </>}
      {!!busy && <ThemedText accessibilityLiveRegion="polite" style={{ color: p.title }}>{busy}</ThemedText>}
    </View>}
  </SettingsSection>;
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 12 }, quota: { padding: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 }, button: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12 }, periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dateList: { maxHeight: 320, borderRadius: 12 }, dateListContent: { paddingRight: 10 }, dateHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 10, gap: 12 }, dateActions: { gap: 8, paddingBottom: 12 }, backupRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 }, restoreRow: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 }, deleteRow: { minWidth: 60, paddingHorizontal: 10, height: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth }, day: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8 } });
