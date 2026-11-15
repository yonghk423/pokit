import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useTranslation } from '@shared/lib/i18n';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { ForecastDay } from '../lib/weatherForecast';

export type CalendarWeather = { city: string; temperature: number; description: string; icon: string; forecast?: ForecastDay[] };
export function ForecastMark({ icon, size }: { icon: string; size: number }) {
  if (!icon) return <View style={{ width: size, height: size }} />;
  const cloudy = /^(02|03|04|09|10|11|13|50)/.test(icon);
  const wet = /^(09|10|11|13)/.test(icon);
  return <Svg width={size} height={size} viewBox="0 0 48 40" accessible={false}>
    {(!cloudy || icon.startsWith('02')) && <><Circle cx={cloudy ? 15 : 24} cy={cloudy ? 14 : 20} r={8} stroke="#50514F" strokeWidth={1.5} fill="none" />{Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; const x = cloudy ? 15 : 24, y = cloudy ? 14 : 20; return <Line key={i} x1={x + Math.cos(a) * 12} y1={y + Math.sin(a) * 12} x2={x + Math.cos(a) * 16} y2={y + Math.sin(a) * 16} stroke="#50514F" strokeWidth={1.3} />; })}</>}
    {cloudy && <Path d="M12 30 C3 30 4 20 12 20 C12 9 28 8 31 20 C43 18 47 30 35 30 Z" stroke="#50514F" strokeWidth={1.5} fill="#D7D7D3" />}
    {wet && [16, 24, 32].map(x => <Line key={x} x1={x} y1={33} x2={x - 2} y2={38} stroke="#50514F" strokeWidth={1.3} />)}
  </Svg>;
}

/** One reading order: location, current temperature and condition, daily outlook. */
export function WeatherCalendarHeader({ report, scale = 1, preview = false, statusMessage }: { report?: CalendarWeather | null; scale?: number; preview?: boolean; statusMessage?: string }) {
  const ink = '#393D3B';
  const { locale } = useTranslation();
  const ko = locale.startsWith('ko');
  // Store cards shrink the entire composition; live weather keeps readable labels.
  const metric = (value: number, minimum: number) => preview ? value * scale : Math.max(minimum * Math.min(1, scale / 0.55), value * scale);
  const data = preview ? { city: 'STOCKHOLM', temperature: 24, description: 'mostly sunny', icon: '01d', forecast: [{ date: '2026-06-01', high: 25, low: 12, icon: '01d' }, { date: '2026-06-02', high: 21, low: 11, icon: '03d' }, { date: '2026-06-03', high: 22, low: 13, icon: '02d' }] } : report;
  const days = data?.forecast ?? [];
  if (!data) return <View testID="weather-calendar-header" style={{ height: 272 * scale, justifyContent: 'center', alignItems: 'center', gap: 18 * scale, paddingHorizontal: 16 * scale }}>
    <View accessible={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * scale }}>
      <View style={{ width: 68 * scale, height: 68 * scale, borderRadius: 34 * scale, backgroundColor: 'rgba(80,81,79,0.06)' }} />
      <View style={{ gap: 10 * scale }}><View style={{ width: 90 * scale, height: 24 * scale, borderRadius: 6 * scale, backgroundColor: 'rgba(80,81,79,0.08)' }} /><View style={{ width: 64 * scale, height: 9 * scale, borderRadius: 4 * scale, backgroundColor: 'rgba(80,81,79,0.05)' }} /></View>
    </View>
    <Text accessibilityLiveRegion="polite" allowFontScaling={!preview} style={{ color: '#757671', fontSize: metric(12, 10), textAlign: 'center', lineHeight: metric(18, 15) }}>{statusMessage ?? (translateUiText("날씨 정보를 확인해주세요"))}</Text>
  </View>;
  return <View testID="weather-calendar-header" style={{ height: 272 * scale, paddingHorizontal: 12 * scale, justifyContent: 'space-evenly' }}>
    <Text testID="weather-calendar-location" allowFontScaling={!preview} numberOfLines={1} style={{ color: ink, fontSize: metric(13, 10), textAlign: 'center', fontWeight: '500' }}>{data.city}</Text>
    <View style={{ alignItems: 'center', gap: 4 * scale }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 * scale }}>
        <ForecastMark icon={data.icon} size={metric(48, 30)} />
        <Text allowFontScaling={!preview} testID="weather-calendar-temperature" style={{ color: ink, fontFamily: 'Helvetica Neue', fontWeight: '300', fontSize: 68 * scale, lineHeight: 78 * scale, letterSpacing: -2 * scale }}>{Math.round(data.temperature)}°</Text>
      </View>
      <Text testID="weather-calendar-condition" allowFontScaling={!preview} numberOfLines={2} style={{ color: '#757671', fontSize: metric(12, 10), textAlign: 'center' }}>{data.description}</Text>
    </View>
    {days.length ? <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 0.5, borderTopColor: 'rgba(80,81,79,0.15)', paddingTop: 14 * scale }}>
      {days.slice(0, 3).map((day, i) => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const label = i === 0 && (preview || day.date === today) ? (translateUiText("오늘")) : new Date(day.date + 'T12:00:00Z').toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
        return <View key={day.date} testID={`weather-forecast-column-${i}`} style={{ width: '33.3333%', minWidth: 0, alignItems: 'center', gap: 5 * scale }}>
          <Text allowFontScaling={!preview} numberOfLines={1} style={{ color: '#757671', fontSize: metric(10, 8) }}>{label}</Text>
          <ForecastMark icon={day.icon} size={metric(28, 22)} />
          <View style={{ flexDirection: 'row', gap: 7 * scale }}>
            <Text allowFontScaling={!preview} style={{ color: ink, fontSize: metric(12, 10), fontWeight: '500' }}>{Math.round(day.high)}°</Text>
            <Text allowFontScaling={!preview} style={{ color: '#858984', fontSize: metric(12, 10) }}>{Math.round(day.low)}°</Text>
          </View>
        </View>;
      })}
    </View> : null}
  </View>;
}
