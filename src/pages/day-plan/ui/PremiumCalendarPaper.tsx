import { CalendarEventDot } from './CalendarEventDot';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { installedPaper } from '../lib/calendarStoreDownload';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Rect, Line, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { type PremiumPaper, premiumPapers, isRaisedCalendar } from '../model/premiumCalendarPapers';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { groupCalendarDiaries } from '../lib/heroCalendar';
import type { ComicDiary } from '../lib/heroDiaryStorage';

export const premiumPaperRatios: Record<PremiumPaper, number> = {
  'silver-ring': 1.14, 'mint-glass': 1.12, 'leather-folio': 1.18, 'soft-mint': 1.04,
  'mint-planner': 1.46, 'spiral-plan': 1.5, 'kraft-clip': 1.4, 'ivory-paper': 1.22, 'berry-purple': 1.14, 'cobalt-blue': 1.14, emerald: 1.14,
};
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function PremiumCalendarPaper({ widgetSize, design, month, today, diaries, eventDates, width, height, miniature, onSelectDate, onPreviousMonth, onNextMonth }: {
  widgetSize?: 'small' | 'large'; design: PremiumPaper; month: Date; today: Date; diaries: ComicDiary[]; eventDates: string[];
  width: number; height?: number; miniature: boolean; onSelectDate?: (date: string) => void;
  onPreviousMonth?: () => void; onNextMonth?: () => void;
}) {
  const ratio = widgetSize ? (height ?? width) / width : premiumPaperRatios[design];
  const topDot = ['soft-mint', 'spiral-plan', 'kraft-clip', 'ivory-paper'].includes(design);
  const vivid = isRaisedCalendar(design);
  const compactKraft = design === 'kraft-clip' && !widgetSize;
  const shadowRatio = compactKraft ? 0.06 : 0.14;
  const availableWidth = width * (!miniature && !widgetSize ? compactKraft ? 0.98 : 0.94 : 1 / (1 + 2 * shadowRatio));
  const paperWidth = Math.min(availableWidth, height ? height / (ratio + 2 * shadowRatio) : availableWidth);
  const naturalHeight = paperWidth * ratio;
  const paperHeight = naturalHeight;
  const canvasHeight = paperHeight / (paperWidth / 330);
  const s = paperWidth / 330;
  const asset = miniature ? null : installedPaper(design);
  const theme = asset ?? premiumPapers[design];
  const glass = design === 'mint-glass';
  const metal = design === 'silver-ring';
  const leather = design === 'leather-folio';
  const navy = design === 'mint-planner';
  const berryPurple = design === 'berry-purple';
  const emerald = design === 'emerald';
  const cobaltBlue = design === 'cobalt-blue';

  const soft = design === 'soft-mint' || design === 'mint-planner' || vivid;
  const kraft = design === 'kraft-clip';
  const spiral = design === 'spiral-plan';
  const ivory = design === 'ivory-paper';
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const grouped = groupCalendarDiaries(diaries);
  const offset = (new Date(month.getFullYear(), month.getMonth(), 1, 12).getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1, 12));
  const ink = navy ? '#F0F3F8' : vivid ? '#FFF8FC' : glass ? '#315844' : '#252C31';
  const mutedInk = emerald ? '#B2DECF' : berryPurple ? '#E9ACCB' : cobaltBlue ? '#A9C2F1' : navy ? '#8193AA' : '#B6BAB4';
  const weekdayInk = emerald ? '#DEFFF2' : berryPurple ? '#FFE5F2' : cobaltBlue ? '#DCE8FF' : ink;
  const activeDayBackground = emerald ? '#E3FFF1' : berryPurple ? '#FFF0F8' : '#EAF1FF';
  const activeDayInk = theme.paper;
  const navigationBackground = emerald ? '#005C43' : berryPurple ? '#891E60' : '#003A87';
  const font = (size: number) => ({ fontSize: size * s, color: ink });
  const navigate = (delta: number) => { tapHaptic('select'); (delta < 0 ? onPreviousMonth : onNextMonth)?.(); };
  return <View style={{ width, height: height ?? (paperHeight + 2 * paperWidth * shadowRatio), justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: paperWidth, height: paperHeight, borderRadius: (soft ? 34 : glass ? 27 : 12) * s }}>
      <Svg pointerEvents="none" width={paperWidth * (1 + shadowRatio)} height={paperHeight + paperWidth * shadowRatio} viewBox={`0 0 ${330 * (1 + shadowRatio)} ${canvasHeight + 330 * shadowRatio}`} style={{ position: 'absolute', top: 0, left: 0 }}>
        {Array.from({ length: 24 }, (_, index) => {
          const offset = (index + 1) * 330 * shadowRatio / 24;
          return <Rect key={index} x={offset} y={offset} width={330} height={canvasHeight} rx={soft ? 34 : glass ? 27 : 12} fill="#292631" opacity={0.032 * (1 - index / 24)} />;
        })}
      </Svg>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 330 ${canvasHeight}`} style={{ position: 'absolute' }}>
        {leather && <Defs>
          <LinearGradient id="folio-cover" x1="0%" y1="0%" x2="95%" y2="100%">
            <Stop offset="0" stopColor="#905258" />
            <Stop offset="0.32" stopColor={theme.edge} />
            <Stop offset="1" stopColor="#51242B" />
          </LinearGradient>
          <LinearGradient id="folio-bevel" x1="0%" y1="0%" x2="90%" y2="100%">
            <Stop offset="0" stopColor="#D8A3A1" /><Stop offset="0.5" stopColor="#884A50" /><Stop offset="1" stopColor="#3C1B20" />
          </LinearGradient>
        </Defs>}
        {leather && <Rect x="1" y="4" width="328" height={canvasHeight - 5} rx="12" fill="#391B21" />}
        <Defs>
          <LinearGradient id="calendar-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#21152C" stopOpacity={0.32} />
          </LinearGradient>
        </Defs>
        <Rect x="1" y="1" width={leather ? 326 : 328} height={canvasHeight - (leather ? 6 : 2)} rx={soft ? 34 : glass ? 27 : 12} fill={metal ? '#DDE0DE' : leather ? 'url(#folio-cover)' : theme.paper} stroke={leather ? 'url(#folio-bevel)' : 'url(#calendar-rim)'} strokeWidth={vivid ? 1.5 : 1} />
        {leather && <>
          <Rect x="15" y="27" width="304" height={canvasHeight - 37} rx="3" fill="#35181D" opacity={0.55} />
          <Rect x="14" y="26" width="304" height={canvasHeight - 37} rx="3" fill="#B9A78B" />
          <Rect x="13.5" y="24.5" width="304" height={canvasHeight - 37} rx="3" fill="#E0CEAF" />
        </>}
        {(metal || leather) && <Rect x="13" y="23" width="304" height={canvasHeight - 37} rx="3" fill={theme.paper} stroke={leather ? '#D9A67E' : '#F8F9F8'} strokeDasharray={leather ? '2 3' : undefined} />}
        {glass && <Rect x="9" y="9" width="312" height={canvasHeight - 18} rx="22" fill="none" stroke="#F2FFF7" strokeWidth="3" />}
        {Array.from({ length: 24 }, (_, i) => <Line key={i} x1="17" x2="313" y1={32 + i * 19} y2={32 + i * 19} stroke={leather ? '#C9AE8D' : '#FFFFFF'} opacity="0.06" />)}
        {(metal || glass) && [55, 275].map(x => <Ellipse key={x} cx={x} cy="20" rx="6" ry="8" fill={metal ? '#777D7B' : '#7AAB8E'} stroke="#FFFFFF" />)}
        {spiral && Array.from({ length: 14 }, (_, i) => <Rect key={i} x={17 + i * 22} y="0" width="7" height="25" rx="3" fill="#222825" stroke="#6D726C" />)}
      </Svg>
      {kraft && <Image source={asset?.binding ? { uri: asset.binding } : require('../../../../assets/pro-store-previews/kraft-clip.webp')} resizeMode="contain" style={{ position: 'absolute', top: -36 * s, alignSelf: 'center', width: 68 * s, height: 80 * s }} />}
      <View style={{ flex: 1, paddingHorizontal: (compactKraft ? 12 : metal || leather ? 25 : 20) * s, paddingTop: (compactKraft ? 44 : kraft ? 54 : spiral ? 40 : 34) * s, paddingBottom: (compactKraft ? 12 : 20) * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: (compactKraft ? 12 : 18) * s }}>
          <View style={{ flex: 1 }}>
            {kraft && <Text allowFontScaling={false} style={[font(46), { textAlign: 'center', fontFamily: 'Georgia' }]}>{month.getMonth() + 1}</Text>}
            <Text allowFontScaling={false} style={[font(soft || spiral ? 20 : 15), { fontWeight: soft || spiral ? '700' : '400', textAlign: soft || spiral ? 'left' : 'center', letterSpacing: ivory ? 2 : 0, fontFamily: metal || leather || ivory || kraft ? 'Georgia' : undefined }]}>{months[month.getMonth()]} {month.getFullYear()}</Text>
          </View>
          {!miniature && <View style={{ flexDirection: 'row', gap: vivid ? 7 * s : 0 }}>{[-1, 1].map(delta => <Pressable key={delta} accessibilityLabel={delta < 0 ? translateUiText("이전 달") : translateUiText("다음 달")} onPress={() => navigate(delta)} style={{ minWidth: vivid ? 32 * s : 32, minHeight: vivid ? 30 * s : 36, alignItems: 'center', justifyContent: 'center', ...(vivid ? { backgroundColor: navigationBackground, borderRadius: 6 * s, boxShadow: `-${2 * s}px -${2 * s}px ${4 * s}px ${emerald ? 'rgba(126,232,188,0.55)' : berryPurple ? 'rgba(255,146,211,0.55)' : 'rgba(100,170,255,0.55)'}, ${3 * s}px ${3 * s}px ${5 * s}px ${emerald ? 'rgba(0,54,38,0.55)' : berryPurple ? 'rgba(82,9,53,0.55)' : 'rgba(0,26,70,0.55)'}` } : {}) }}><Text style={font(22)}>{delta < 0 ? '‹' : '›'}</Text></Pressable>)}</View>}
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 7 * s }}>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => <Text key={day} allowFontScaling={false} style={[font(8), { width: '14.2857%', textAlign: 'center', color: ivory ? '#AE6657' : weekdayInk }]}>{day}</Text>)}</View>
        <View style={{ flex: 1 }}>
          {Array.from({ length: 6 }, (_, row) => <View key={row} style={{ flex: 1, flexDirection: 'row' }}>{days.slice(row * 7, row * 7 + 7).map(day => {
            const key = getLocalDateKey(day);
            const current = day.getMonth() === month.getMonth();
            const thumbnail = widgetSize ? undefined : grouped.get(key)?.flatMap(record => record.scenes).find(scene => scene.artworkUri)?.artworkUri;
            const active = key === getLocalDateKey(today) || key === rangeStart;
            return <Pressable key={key} disabled={miniature} accessibilityLabel={key} onPress={() => { tapHaptic('select'); setRangeStart(key); onSelectDate?.(key); }} style={{ width: '14.2857%', padding: 2 * s }}>
              <View style={{ flex: 1, alignItems: 'center', borderWidth: glass || metal || leather || ivory ? 0.5 : 0, borderColor: glass ? '#8AB89A' : '#D7CFC3', backgroundColor: glass ? 'rgba(255,255,255,0.21)' : 'transparent', borderRadius: glass ? 5 * s : 0 }}>
                {topDot && !miniature && <CalendarEventDot date={key} visible={eventDates.includes(key)} color="#A64C37" size={Math.min(4, 3 * s)} />}
                <View style={{ borderWidth: active || (!topDot && eventDates.includes(key)) ? 1 : 0, borderColor: navy ? '#94B9D3' : emerald ? '#DAFFEC' : berryPurple ? '#FFE8F4' : cobaltBlue ? '#E2ECFF' : soft ? '#419C82' : '#BC7565', borderRadius: soft ? 5 * s : 20 * s, backgroundColor: active && soft ? navy ? '#456D94' : vivid ? activeDayBackground : '#65B99C' : 'transparent', paddingHorizontal: 3 * s }}>
                  <Text allowFontScaling={false} style={[font(13), { color: current ? active && soft ? vivid ? activeDayInk : '#FFFFFF' : ink : mutedInk, fontFamily: metal || ivory || leather ? 'Georgia' : undefined }]}>{day.getDate()}</Text>
                </View>
                {thumbnail && current && <View style={{ flex: 1, minHeight: 0, width: '70%' }}><HeroCalendarPhoto uri={thumbnail} /></View>}
              </View>
            </Pressable>;
          })}</View>)}
        </View>
      </View>
    </View>
  </View>;
}
