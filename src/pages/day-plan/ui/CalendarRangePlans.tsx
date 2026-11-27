import { rangePlansKey as key, readPlans, plansOnDate, reachesPlanLimit, usedPlanColors, type CalendarPlan } from '../model/calendarRangePlans';
export { readPlans, type CalendarPlan } from '../model/calendarRangePlans';
import type { CalendarNoteStyle } from '../model/calendarNoteStyle';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, { FadeInDown, FadeOutUp, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { AppAlert } from '@shared/lib/app-alert';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { useTranslation } from '@shared/lib/i18n';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { PaperGrain } from '@shared/ui/paper-grain';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { usePremiumPackPaywall } from './usePremiumPackPaywall';

const colors = ['#C6D6A5','#E4B3AD','#ACCCDE','#D0BCE1','#E8CE97'];
const proColors = [
  '#F3C6CA', '#EBAFBC', '#F3D7E6', '#DCA9C4', '#F1BCA8', '#F8DAC5',
  '#EBC19B', '#F4D7A2', '#F6E6AE', '#E7DEA9', '#D8DC9F', '#D9E6B8',
  '#AEC99E', '#BDD6AF', '#BBD8C5', '#A9D5BA', '#BDE3D5', '#AFD7D8',
  '#B5DFEA', '#C8E4F3', '#BCCFED', '#A9BDDE', '#CCCFF0', '#DADBF3',
  '#CBB3E2', '#E0C8ED', '#DCC8DB', '#E4D5CF', '#D3C0AA', '#C7D0D9',
  '#F9DCE0', '#F5B5C4', '#E8A8BE', '#DFB0CC', '#EFD2E3',
  '#F7C6AD', '#F9DFD1', '#E9B39D', '#F3CDA2', '#FBE5CE',
  '#F9E9A2', '#F4EAC9', '#E6CC85', '#E5E9AA', '#D3DBAE',
  '#C3D5A6', '#DCE8CD', '#AFC4A9', '#B6D6A4', '#CBE1C0',
  '#DAF0E3', '#A3CDB1', '#B3E0CB', '#9BC9BD', '#CBE8DD',
  '#A2CDD0', '#BCE5E6', '#A9DDEA', '#CDEAF0', '#91C4D7',
  '#A0C6E6', '#D6E7F7', '#B3C3E9', '#C9D4F1', '#AAB8DD',
  '#C0B9E5', '#E6E0F6', '#ACA6D5', '#D6C0EC', '#E9D3F2',
  '#CDA8D4', '#E6C2DF', '#F0DCEB', '#C9AEC0', '#E9C5CF',
  '#F1DED5', '#DFCCB6', '#E8DABB', '#D8DBD2', '#BCC9D3',
];
const paletteColumns = 6;
const paletteRowHeight = 44;
const proColorRows = Array.from({ length: Math.ceil(proColors.length / paletteColumns) }, (_, index) =>
  proColors.slice(index * paletteColumns, (index + 1) * paletteColumns),
);
const moreColorsLabel = {
  ko: '파스텔 색상 더 보기',
  en: 'More pastel colors',
  ja: 'パステルカラーをもっと見る',
  zh: '查看更多粉彩色',
};
export const PlanAccentContext = createContext('#FFFFFF');
// Keep each stored highlighter recognizable while tinting it toward the active paper's accent.
function markerColor(base: string, accent: string) {
  const tintStrength = proColors.includes(base) ? 0.06 : 0.22;
  const channels = [1, 3, 5].map(offset => {
    const original = parseInt(base.slice(offset, offset + 2), 16);
    const tint = parseInt(accent.slice(offset, offset + 2), 16);
    return Math.round(original * (1 - tintStrength) + tint * tintStrength);
  });
  return 'rgb(' + channels.join(',') + ')';
}
export const PlanContext = createContext<CalendarPlan[]>([]);
export function DateInk({ date, top = 0, height }: { date: string; top?: number; height?: number }) {
  const accent = useContext(PlanAccentContext);
  const active = plansOnDate(useContext(PlanContext), date);
  if (!active.length) return null;
  return <View pointerEvents="none" style={{position:'absolute', left:0, right:0, top, height, bottom:height === undefined ? 0 : undefined}}>
    {active.map(plan => <View key={plan.id} style={{flex:1,backgroundColor:markerColor(plan.color,accent),opacity:.84}} />)}
  </View>;
}

const labels = {
  ko:['계획','새 계획','계획 이름','시작일','종료일','형광펜 색','등록','취소','닫기','계획 수정','저장','날짜별로 계획을 최대 5개까지 등록할 수 있어요. 기간을 변경해 주세요.','기간을 확인해 주세요.'],
  en:['Plans','New plan','Plan name','Start','End','Highlighter','Add','Cancel','Close','Edit plan','Save','A date can have up to 5 plans. Choose a different date range.','Check the dates.'],
  ja:['計画','新しい計画','計画名','開始日','終了日','マーカーの色','登録','キャンセル','閉じる','計画の編集','保存','同じ日に登録できる計画は5件までです。期間を変更してください。','期間を確認してください。'],
  zh:['計畫','新增計畫','計畫名稱','開始日期','結束日期','螢光筆顏色','新增','取消','關閉','編輯計畫','儲存','同一天最多可有 5 個計畫。請調整日期範圍。','請確認日期。']
};
const duplicateColorMessage = {
  ko: '같은 기간에 이미 사용 중인 색이에요. 다른 색을 선택해 주세요.',
  en: 'This color is already used during these dates. Choose another color.',
  ja: 'この期間にはすでに同じ色が使われています。別の色を選んでください。',
  zh: '這段期間已使用此顏色，請選擇其他顏色。',
};

const displayCopy = {
  ko: { toggle: '달력에 표시', limit: '월별로 최대 5개까지 표시할 수 있어요. 표시 중인 계획을 먼저 해제해 주세요.', hidden: '계획을 저장했어요. 달력에 표시하려면 목록에서 선택해 주세요.' },
  en: { toggle: 'Show on calendar', limit: 'You can show up to 5 plans per month. Uncheck a displayed plan first.', hidden: 'Plan saved. Select it in the list to show it on the calendar.' },
  ja: { toggle: 'カレンダーに表示', limit: '月に最大5件まで表示できます。表示中の計画を先に解除してください。', hidden: '保存しました。カレンダーに表示するには一覧から選択してください。' },
  zh: { toggle: '顯示於行事曆', limit: '每月最多可顯示 5 個計畫。請先取消勾選一個已顯示的計畫。', hidden: '已儲存計畫。請在列表中勾選要顯示的計畫。' },
};

const planListCopy = {
  ko: { footer: '캘린더에는 월별로 최대 5개의 계획을 표시할 수 있어요.', deletePrompt: '이 계획을 삭제할까요?' },
  en: { footer: 'You can show up to 5 plans per month on the calendar.', deletePrompt: 'Delete this plan?' },
  ja: { footer: 'カレンダーに表示できる計画は月に最大5件です。', deletePrompt: 'この計画を削除しますか？' },
  zh: { footer: '行事曆每月最多可顯示 5 個計畫。', deletePrompt: '要刪除這個計畫嗎？' },
};

function validDate(value:string) {
  const d=new Date(value+'T12:00:00');
  return Number.isFinite(d.getTime()) && getLocalDateKey(d)===value;
}
const planEnter = FadeInDown.duration(200)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 5 }] })
  .reduceMotion(ReduceMotion.System);
const planExit = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);
const planLayout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);

export function CalendarPlansPanel({ theme, month, plans, onSave, open, maxHeight, topInset }: { theme:CalendarNoteStyle; month:Date; plans:CalendarPlan[]; onSave:(p:CalendarPlan[])=>void; open:boolean; maxHeight:number; topInset:number }) {
  const { locale, t } = useTranslation();
  const language = locale?.startsWith('zh') ? 'zh' : locale === 'ko' || locale === 'ja' ? locale : 'en';
  const l = labels[language];
  const paywall = usePremiumPackPaywall();
  const planScroll = useRef<ScrollView>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draft,setDraft]=useState<CalendarPlan|null>(null);
  const [field,setField]=useState<'start'|'end'|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{if(!open){setDraft(null);setField(null);setError('');setPaletteOpen(false)}},[open]);
  const first=getLocalDateKey(new Date(month.getFullYear(),month.getMonth(),1));
  const last=getLocalDateKey(new Date(month.getFullYear(),month.getMonth()+1,0));
  function edit(plan: CalendarPlan | null) {
    Keyboard.dismiss();
    setField(null);
    setError('');
    setDraft(plan);
    setPaletteOpen(!!plan && proColors.includes(plan.color));
    if (plan) planScroll.current?.scrollTo({ y: 0, animated: true });
  }
  async function chooseProColor(color: string, draftId: string) {
    if (!selectIsPro(useSubscriptionStore.getState())) {
      Keyboard.dismiss();
      await paywall.present();
      if (!selectIsPro(useSubscriptionStore.getState())) return;
    }
    setDraft(current => {
      if (current?.id !== draftId) return current;
      const stored = readPlans();
      if (current.visibleOnCalendar !== false && !reachesPlanLimit(stored, current) && usedPlanColors(stored, current).has(color)) return current;
      return { ...current, color };
    });
    setError('');
  }

  function save(){
    if(!draft || !draft.name.trim()) return;
    if(!validDate(draft.start)||!validDate(draft.end)||draft.end<draft.start){setError(l[12]);return}
    const stored = readPlans();
    if (proColors.includes(draft.color) && stored.find(plan => plan.id === draft.id)?.color !== draft.color
      && !selectIsPro(useSubscriptionStore.getState())) {
      Keyboard.dismiss();
      void paywall.present();
      return;
    }
    const others = stored.filter(plan => plan.id !== draft.id);
    const visibleOnCalendar = draft.visibleOnCalendar !== false &&
      !reachesPlanLimit(others, draft) && !usedPlanColors(others, draft).has(draft.color);
    const next = [...others, { ...draft, name: draft.name.trim(), visibleOnCalendar }]
      .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
    localStorageClient.setJson(key, next);
    onSave(next);
    edit(null);
    if (!visibleOnCalendar) setError(displayCopy[language].hidden);
  }

  function confirmDelete(plan: CalendarPlan) {
    Keyboard.dismiss();
    AppAlert.alert(planListCopy[language].deletePrompt, plan.name, [
      { text: l[7], style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          const next = readPlans().filter(item => item.id !== plan.id);
          localStorageClient.setJson(key, next);
          onSave(next);
          edit(null);
        },
      },
    ]);
  }

  function togglePlanVisibility(id: string) {
    const stored = readPlans();
    const plan = stored.find(item => item.id === id);
    if (!plan) return;
    const visibleOnCalendar = plan.visibleOnCalendar === false;
    if (visibleOnCalendar && reachesPlanLimit(stored, plan)) {
      setError(displayCopy[language].limit);
      return;
    }
    if (visibleOnCalendar && usedPlanColors(stored, plan).has(plan.color)) {
      setError(duplicateColorMessage[language]);
      return;
    }
    const next = stored.map(item => item.id === id ? { ...item, visibleOnCalendar } : item);
    localStorageClient.setJson(key, next);
    onSave(next);
    setError('');
  }

  const unavailableColors = draft && draft.visibleOnCalendar !== false && !reachesPlanLimit(plans, draft)
    ? usedPlanColors(plans, draft)
    : new Set<string>();
  const submitDisabled = !draft?.name.trim();
  const existing=plans.some(p=>p.id===draft?.id);
  const actions = draft && (
        <View style={s.formActions}>
          {existing && (
            <Pressable accessibilityRole="button" onPress={() => confirmDelete(draft)} style={[s.action, s.deleteAction]}>
              <ThemedText style={{ color: '#D98989', textDecorationLine: 'underline' }}>{t('common.delete')}</ThemedText>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => edit(null)} style={({ pressed }) => [s.action, pressed && s.pressed]}>
            <ThemedText style={{ color: theme.ink }}>{l[7]}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitDisabled }}
            disabled={submitDisabled}
            onPress={save}
            style={({ pressed }) => [s.submit, { borderColor: theme.rule, opacity: submitDisabled ? .4 : 1 }, pressed && s.pressed]}
          >
            <ThemedText style={{ color: theme.ink, fontWeight: '600' }}>{existing ? l[10] : l[6]}</ThemedText>
          </Pressable>
        </View>
  );
  return <View style={{height:maxHeight,backgroundColor:theme.paper,paddingHorizontal:18,paddingTop:Math.max(12, topInset),paddingBottom:8}}>
    <PaperGrain opacity={.3}/>
    <ScrollView bounces={false} contentInsetAdjustmentBehavior="never" scrollEnabled={!paletteOpen} ref={planScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{gap:10,paddingBottom:16}}>
      {draft ? <Animated.View entering={planEnter} exiting={planExit} layout={planLayout} style={s.form}>
        {!paletteOpen && <>
        <ThemedTextInput placeholder={l[2]} accessibilityLabel={l[2]} placeholderTextColor={theme.ink+'99'} value={draft.name} onChangeText={name=>setDraft({...draft,name})} style={[s.input,{color:theme.ink,borderColor:theme.rule}]}/>
        <View style={s.row}>
          {(['start', 'end'] as const).map((dateField, index) => (
            <Pressable
              key={dateField}
              accessibilityRole="button"
              accessibilityLabel={l[3 + index] + ' ' + draft[dateField]}
              accessibilityState={{ expanded: field === dateField }}
              onPress={() => { Keyboard.dismiss(); setField(field === dateField ? null : dateField); }}
              style={[s.dateField, { borderColor: field === dateField ? theme.ink : theme.rule }]}
            >
              <ThemedText style={[s.label, { color: theme.ink }]}>{l[3 + index]}</ThemedText>
              <ThemedText style={{ color: theme.ink }}>{draft[dateField]}</ThemedText>
            </Pressable>
          ))}
        </View>
        {field && (
          <PlanDatePicker
            key={field}
            value={draft[field]}
            theme={theme}
            onSelect={value => {
              setDraft({ ...draft, [field]: value });
              setError('');
              setField(null);
            }}
          />
        )}
        </>}
        <View>
          <View style={s.highlighterHeading}>
            <ThemedText style={[s.label, { color: theme.ink }]}>{l[5]}</ThemedText>
            <View
              accessible={false}
              style={[s.colorPreview, {
                backgroundColor: markerColor(draft.color, theme.accent),
                borderColor: theme.rule,
              }]}
            />
          </View>
          <View style={s.palette}>
            {colors.map((color, index) => (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityLabel={l[5] + ' ' + (index + 1)}
                accessibilityState={{ checked: draft.color === color, disabled: unavailableColors.has(color) }}
                disabled={unavailableColors.has(color)}
                onPress={() => { setDraft({ ...draft, color }); setError(''); }}
                style={[s.basicSwatchButton, unavailableColors.has(color) && s.disabledSwatch]}
              >
                <View style={[
                  s.basicSwatch,
                  {
                    backgroundColor: markerColor(color, theme.accent),
                    borderColor: draft.color === color ? theme.ink : 'transparent',
                  },
                ]} />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={moreColorsLabel[language] + ' · Pro'}
              accessibilityState={{ expanded: paletteOpen }}
              onPress={() => { Keyboard.dismiss(); setPaletteOpen(value => !value); }}
              style={({ pressed }) => [s.moreColors, pressed && s.pressed]}
            >
              <ThemedText style={{ color: theme.ink, fontSize: 19 }}>{paletteOpen ? '−' : '+'}</ThemedText>
            </Pressable>
          </View>
          {paletteOpen && (
            <Animated.View entering={planEnter} style={[s.proPalette, { borderColor: theme.rule }]}>
              <ThemedText style={[s.label, { color: theme.ink }]}>{moreColorsLabel[language]} · Pro</ThemedText>
              <ScrollView
                style={{ maxHeight: Math.max(paletteRowHeight, Math.min(paletteRowHeight * 4, maxHeight - Math.max(12, topInset) - 160)) }}
                bounces={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                persistentScrollbar
              >
                <View accessibilityRole="radiogroup">
                  {proColorRows.map((row, rowIndex) => (
                    <View key={row[0]} style={s.palette}>
                      {row.map((color, columnIndex) => {
                        const unavailable = unavailableColors.has(color);
                        const selected = draft.color === color;
                        return (
                          <Pressable
                            key={color}
                            accessibilityRole="radio"
                            accessibilityLabel={moreColorsLabel[language] + ' ' + (rowIndex * paletteColumns + columnIndex + 1)}
                            accessibilityState={{ checked: selected, disabled: unavailable }}
                            disabled={unavailable}
                            onPress={() => void chooseProColor(color, draft.id)}
                            style={[s.swatchButton, unavailable && s.disabledSwatch]}
                          >
                            <View style={[
                              s.swatch,
                              { backgroundColor: markerColor(color, theme.accent), borderColor: selected ? theme.ink : 'transparent' },
                            ]} />
                          </Pressable>
                        );
                      })}
                      {row.length < paletteColumns && <View style={{ flex: paletteColumns - row.length }} />}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>
        {!paletteOpen && actions}
      </Animated.View> : (
        <Animated.View entering={planEnter} exiting={planExit} layout={planLayout}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.newPlan, pressed && s.pressed]}
            onPress={() => {
              const today = getLocalDateKey(new Date());
              const start = today >= first && today <= last ? today : first;
              const newPlan = { id: String(Date.now()), name: '', start, end: start };
              const used = reachesPlanLimit(plans, { ...newPlan, color: colors[0] }) ? new Set<string>() : usedPlanColors(plans, newPlan);
              edit({ ...newPlan, color: colors.find(color => !used.has(color)) ?? colors[0] });
            }}
          >
            <ThemedText style={{ color: theme.ink }}>＋ {l[1]}</ThemedText>
          </Pressable>
        </Animated.View>
      )}
      {!paletteOpen && <Animated.View layout={planLayout} style={s.form}>
        {!!error && <ThemedText accessibilityRole="alert" style={{ color: theme.ink }}>{error}</ThemedText>}
        {plans.filter(plan => plan.start <= last && plan.end >= first).map(plan => {
          const checked = plan.visibleOnCalendar !== false;
          const preview = draft?.id === plan.id ? draft : plan;
          return (
            <Animated.View key={plan.id} entering={planEnter} exiting={planExit} layout={planLayout} style={[s.row, s.planRow, { borderColor: theme.rule }]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={displayCopy[language].toggle + ' · ' + plan.name}
                accessibilityState={{ checked }}
                onPress={() => togglePlanVisibility(plan.id)}
                style={s.visibilityToggle}
              >
                <Svg width={27} height={27} viewBox="0 0 24 24" accessible={false}>
                  <Rect x={3} y={3} width={18} height={18} rx={4} fill={checked ? theme.ink : 'none'} fillOpacity={checked ? .1 : 1} stroke={theme.ink} strokeOpacity={checked ? .65 : .4} strokeWidth={1.3} />
                  {checked && <Path d="m7.5 12 3 3 6-6" fill="none" stroke={theme.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />}
                </Svg>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={l[9] + ' · ' + plan.name} onPress={() => edit(plan)} style={[s.row, s.planName]}>
                <View style={[s.planColor, { backgroundColor: markerColor(preview.color, theme.accent) }]} />
                <View style={s.planName}>
                  <ThemedText style={[s.planDate, { color: theme.ink }]}>
                    {preview.start === preview.end ? preview.start : preview.start + ' – ' + preview.end}
                  </ThemedText>
                  <ThemedText style={{ color: theme.ink }}>{preview.name}</ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
        <ThemedText style={[s.listFooter, { color: theme.ink }]}>{planListCopy[language].footer}</ThemedText>
      </Animated.View>}

    </ScrollView>
    {paletteOpen && actions}
    {paywall.modal}
  </View>;
}
const englishMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const englishDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' });
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PlanDatePicker({ value, theme, onSelect }: { value: string; theme: CalendarNoteStyle; onSelect: (value: string) => void }) {
  const [month, setMonth] = useState(() => new Date(value + 'T12:00:00'));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + lastDate) / 7) * 7;

  return (
    <View style={[s.datePicker, { borderColor: theme.rule }]} accessibilityLabel="Choose a date">
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={s.monthArrow} onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}>
          <ThemedText style={[s.arrow, { color: theme.ink }]}>‹</ThemedText>
        </Pressable>
        <ThemedText accessibilityRole="header" style={{ color: theme.ink, fontSize: 14, fontWeight: '500' }}>
          {englishMonth.format(month)}
        </ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={s.monthArrow} onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}>
          <ThemedText style={[s.arrow, { color: theme.ink }]}>›</ThemedText>
        </Pressable>
      </View>
      <View style={s.dateGrid}>
        {weekdays.map(day => <ThemedText key={day} style={[s.weekday, { color: theme.ink }]}>{day}</ThemedText>)}
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index - firstDay + 1;
          if (day < 1 || day > lastDate) return <View key={index} style={s.dayCell} />;
          const date = new Date(year, monthIndex, day, 12);
          const dateKey = getLocalDateKey(date);
          const selected = dateKey === value;
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={englishDate.format(date)}
              accessibilityState={{ selected }}
              onPress={() => onSelect(dateKey)}
              style={s.dayCell}
            >
              <View style={[s.dayMark, selected && { backgroundColor: theme.accent + '26', borderColor: theme.rule }]}>
                <ThemedText style={{ color: theme.ink, fontSize: 13, fontWeight: selected ? '600' : '400' }}>{day}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:44},dateField: { flex: 1, minHeight: 48, gap: 3, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  datePicker: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 3, paddingHorizontal: 6, paddingBottom: 4 },
  monthArrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 21 },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.28%', fontSize: 11, textAlign: 'center', paddingBottom: 4 },
  dayCell: { width: '14.28%', minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  dayMark: { width: 29, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', borderRadius: 2 },
  palette: { flexDirection: 'row' },
  swatchButton: { flex: 1, height: paletteRowHeight },
  basicSwatchButton: { width: 44, height: 44, justifyContent: 'center', flexShrink: 1 },
  basicSwatch: { width: '91%', height: 34, borderWidth: 1, borderRadius: 2 },
  visibilityToggle: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  highlighterHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorPreview: { width: 24, height: 13, borderWidth: StyleSheet.hairlineWidth, borderRadius: 2 },
  moreColors: { width: 44, height: 44, flexShrink: 1, alignItems: 'center', justifyContent: 'center' },
  proPalette: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 4 },
  disabledSwatch: { opacity: .28 },
  swatch: { flex: 1, borderWidth: 1 },
  form: { gap: 10 },
  pressed: { opacity: .65 },
  deleteAction: { marginRight: 'auto' },
  listFooter: { fontSize: 12, paddingTop: 6, paddingBottom: 4 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  newPlan: { minHeight: 44, justifyContent: 'center' },
  planRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 9 },
  planColor: { width: 18, height: 5 },
  planName: { flex: 1, minWidth: 0 },
  planDate: { fontSize: 12, marginBottom: 3 },
  submit: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4 },
  action:{color:'#446553',paddingVertical:12,paddingHorizontal:8,minHeight:44},input:{color:'#303830',fontSize:16,lineHeight:24,paddingHorizontal:0,paddingVertical:8,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#8E998D',minHeight:44},label:{fontSize:12,color:'#60695E',marginTop:5}});
