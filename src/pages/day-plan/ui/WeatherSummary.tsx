import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PenFrame } from '@shared/ui/pen-frame';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { syncWeatherToWidget } from '../lib/weatherWidgetSync';
import { nextWeatherOutfit, selectWeatherOutfit, weatherOutfitCandidates } from '../lib/weatherOutfit';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

const OPENWEATHER_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim();
const CACHE_MS = 15 * 60 * 1000;
const GPS_WATCH_MS = 12_000;
const GPS_RETRY_MS = 8_000;
const GPS_RETRY_LIMIT = 1;

type WeatherReport = {
  city: string;
  temperature: number;
  description: string;
  icon: string;
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number;
  windGust?: number;
  precipitation?: number;
  rainfall?: number;
  snowfall?: number;
  cloudiness?: number;
  visibilityKm?: number;
  pressure?: number;
  sunrise?: number;
  sunset?: number;
  timezoneOffset?: number;
  hemisphere: 'north' | 'south';
};

type OpenWeatherResponse = {
  name?: unknown;
  main?: { temp?: unknown; feels_like?: unknown; humidity?: unknown; pressure?: unknown };
  weather?: { description?: unknown; icon?: unknown }[];
  wind?: { speed?: unknown; gust?: unknown };
  rain?: { '1h'?: unknown };
  snow?: { '1h'?: unknown };
  clouds?: { all?: unknown };
  visibility?: unknown;
  sys?: { sunrise?: unknown; sunset?: unknown };
  timezone?: unknown;
};

type OpenWeatherGeoPlace = {
  name?: unknown;
  state?: unknown;
  local_names?: { en?: unknown; ascii?: unknown };
};

const weatherDetailCopy = {
  ko: { title: '현재 날씨', close: '닫기', refresh: '날씨 새로고침', loading: '불러오는 중', feelsLike: '체감온도', humidity: '습도', wind: '풍속', gust: '돌풍', precipitation: '1시간 강수량', clouds: '구름량', visibility: '시정', pressure: '기압', sunrise: '일출', sunset: '일몰', none: '없음' },
  en: { title: 'Current weather', close: 'Close', refresh: 'Refresh weather', loading: 'Loading', feelsLike: 'Feels like', humidity: 'Humidity', wind: 'Wind', gust: 'Gusts', precipitation: 'Precipitation · 1h', clouds: 'Cloud cover', visibility: 'Visibility', pressure: 'Pressure', sunrise: 'Sunrise', sunset: 'Sunset', none: 'None' },
  ja: { title: '現在の天気', close: '閉じる', refresh: '天気を更新', loading: '読み込み中', feelsLike: '体感温度', humidity: '湿度', wind: '風速', gust: '突風', precipitation: '1時間降水量', clouds: '雲量', visibility: '視程', pressure: '気圧', sunrise: '日の出', sunset: '日の入り', none: 'なし' },
  'zh-TW': { title: '目前天氣', close: '關閉', refresh: '重新整理天氣', loading: '載入中', feelsLike: '體感溫度', humidity: '濕度', wind: '風速', gust: '陣風', precipitation: '1小時雨量', clouds: '雲量', visibility: '能見度', pressure: '氣壓', sunrise: '日出', sunset: '日落', none: '無' },
} as const;

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatWeatherTime(timestamp: number, timezoneOffset: number, locale: string): string {
  const shiftedDate = new Date((timestamp + timezoneOffset) * 1000);
  return shiftedDate.toLocaleTimeString(locale, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
}

function publishWeather(report: WeatherReport, fetchedAt: number) {
  syncWeatherToWidget({
    version: 1,
    temperature: report.temperature,
    description: report.description,
    city: report.city,
    icon: report.icon,
    fetchedAt,
  });
}

let cachedReport: { report: WeatherReport; fetchedAt: number } | null = null;

function gridCell(lat: number, lon: number) {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

/** 동·읍·면·리. 구·시 이름은 통과시킨다. */
function isNeighborhoodName(name: string): boolean {
  const value = name.trim();
  if (/(?:동|읍|면|리|洞|\d+가)$/.test(value)) return true;
  const folded = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /(?:[-\s])(?:dong|eup|myeon|myon|ri)$/i.test(folded);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isLocalizedWeatherText(value: string): boolean {
  return /[가-힣\u3040-\u30ff\u4e00-\u9fff]/.test(value);
}

function englishPlaceName(place: OpenWeatherGeoPlace): string {
  return text(place.local_names?.en) || text(place.local_names?.ascii) || text(place.name);
}

/** 동 이름은 버리고, 영문 지역명(시·도)만 고른다. */
async function resolveRegionName(coords: { lat: number; lon: number }): Promise<string> {
  if (!OPENWEATHER_KEY) return '';
  try {
    const query = new URLSearchParams({
      lat: String(coords.lat),
      lon: String(coords.lon),
      limit: '1',
      appid: OPENWEATHER_KEY,
    });
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?${query.toString()}`);
    if (!response.ok) return '';
    const places = await response.json() as OpenWeatherGeoPlace[];
    const closest = Array.isArray(places) ? places[0] : undefined;
    if (!closest) return '';
    const name = englishPlaceName(closest);
    if (name && !isNeighborhoodName(name) && !isLocalizedWeatherText(name)) return name;
    const state = text(closest.state);
    return state && !isLocalizedWeatherText(state) ? state : '';
  } catch {
    return '';
  }
}

/** Wait for the first real fix — getCurrentPosition often fails with kCLErrorLocationUnknown on cold start. */
async function watchFirstFix(timeoutMs: number): Promise<{ lat: number; lon: number } | null> {
  return await new Promise(resolve => {
    let settled = false;
    let subscription: Location.LocationSubscription | null = null;
    const finish = (coords: { lat: number; lon: number } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(coords);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Low, distanceInterval: 0, timeInterval: 1000, mayShowUserSettingsDialog: false },
      position => finish(gridCell(position.coords.latitude, position.coords.longitude)),
      () => undefined,
    ).then(next => {
      subscription = next;
      if (settled) next.remove();
    }).catch(() => finish(null));
  });
}

/** Real device coords only — never invent a city. */
async function resolveCoords(): Promise<{ lat: number; lon: number } | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000, requiredAccuracy: 5000 });
  if (last) return gridCell(last.coords.latitude, last.coords.longitude);

  for (const accuracy of [Location.Accuracy.Lowest, Location.Accuracy.Low, Location.Accuracy.Balanced]) {
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy, mayShowUserSettingsDialog: false });
      return gridCell(current.coords.latitude, current.coords.longitude);
    } catch {
      // Cold GPS often returns LocationUnavailable once — keep trying.
    }
  }

  return watchFirstFix(GPS_WATCH_MS);
}

export function WeatherSummary({ ink, muted }: { ink: string; muted: string }) {
  const { locale } = useTranslation();
  const weatherTutorialActive = useServiceTutorial(state => state.active && state.mode === 'comic' && state.step === 'comicWeather');
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<number | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [refreshRotation] = useState(() => new Animated.Value(0));
  const refreshAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const requestInFlight = useRef(false);
  const loadWeatherRef = useRef<(force?: boolean) => Promise<void>>(async () => undefined);
  const alive = useRef(true);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const startRefreshAnimation = useCallback(() => {
    refreshAnimation.current?.stop();
    refreshRotation.setValue(0);
    const loop = Animated.loop(Animated.timing(refreshRotation, {
      toValue: 1,
      duration: 850,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    refreshAnimation.current = loop;
    loop.start();
  }, [refreshRotation]);

  const finishRefreshAnimation = useCallback(() => {
    const current = refreshAnimation.current;
    if (!current) return;
    current.stop();
    refreshAnimation.current = null;
    refreshRotation.stopAnimation(value => {
      const remaining = value > 0.995 ? 0 : 1 - value;
      if (remaining === 0) {
        refreshRotation.setValue(0);
        return;
      }
      const settle = Animated.timing(refreshRotation, {
        toValue: 1,
        duration: Math.max(140, Math.round(850 * remaining)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      refreshAnimation.current = settle;
      settle.start(({ finished }) => {
        if (refreshAnimation.current !== settle) return;
        refreshAnimation.current = null;
        if (finished) refreshRotation.setValue(0);
      });
    });
  }, [refreshRotation]);

  useEffect(() => () => {
    refreshAnimation.current?.stop();
    refreshRotation.stopAnimation();
  }, [refreshRotation]);

  const loadWeather = useCallback(async (force = false) => {
    if (!OPENWEATHER_KEY || requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    clearRetry();
    try {
      const cachedCity = cachedReport?.report.city ?? '';
      const cachedDescription = cachedReport?.report.description ?? '';
      const cachedInEnglish = !isNeighborhoodName(cachedCity) && !isLocalizedWeatherText(`${cachedCity} ${cachedDescription}`);
      if (!force && cachedReport && cachedInEnglish && Date.now() - cachedReport.fetchedAt < CACHE_MS) {
        if (alive.current) setReport(cachedReport.report);
        publishWeather(cachedReport.report, cachedReport.fetchedAt);
        retryCount.current = 0;
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setReport(null);
        setPermissionBlocked(!permission.canAskAgain);
        return;
      }
      setPermissionBlocked(false);

      const services = await Location.getProviderStatusAsync();
      if (!services.locationServicesEnabled) {
        if (__DEV__) console.warn('[weather] location services are off');
        if (alive.current) setReport(null);
        return;
      }

      const coords = await resolveCoords();
      if (!coords) {
        if (alive.current) setReport(null);
        if (alive.current && retryCount.current < GPS_RETRY_LIMIT) {
          retryCount.current += 1;
          retryTimer.current = setTimeout(() => {
            if (alive.current) void loadWeatherRef.current(true);
          }, GPS_RETRY_MS);
        }
        return;
      }
      retryCount.current = 0;
      const query = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lon),
        units: 'metric',
        lang: 'en',
        appid: OPENWEATHER_KEY,
      });
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${query.toString()}`);
      if (!response.ok) throw new Error(`weather-request-failed:${response.status}`);
      const data = await response.json() as OpenWeatherResponse;
      const temperature = Number(data.main?.temp);
      const description = typeof data.weather?.[0]?.description === 'string' ? data.weather[0].description : '';
      const icon = typeof data.weather?.[0]?.icon === 'string' ? data.weather[0].icon : '';
      if (!Number.isFinite(temperature) || !description) throw new Error('weather-response-invalid');

      const city = await resolveRegionName(coords);
      const rain = optionalNumber(data.rain?.['1h']);
      const snow = optionalNumber(data.snow?.['1h']);
      const nextReport: WeatherReport = {
        city,
        temperature: Math.round(temperature),
        description,
        icon,
        feelsLike: optionalNumber(data.main?.feels_like),
        humidity: optionalNumber(data.main?.humidity),
        windSpeed: optionalNumber(data.wind?.speed),
        windGust: optionalNumber(data.wind?.gust),
        precipitation: rain === undefined && snow === undefined ? 0 : (rain ?? 0) + (snow ?? 0),
        rainfall: rain,
        snowfall: snow,
        cloudiness: optionalNumber(data.clouds?.all),
        visibilityKm: optionalNumber(data.visibility) === undefined ? undefined : (optionalNumber(data.visibility) ?? 0) / 1000,
        pressure: optionalNumber(data.main?.pressure),
        sunrise: optionalNumber(data.sys?.sunrise),
        sunset: optionalNumber(data.sys?.sunset),
        timezoneOffset: optionalNumber(data.timezone) ?? 0,
        hemisphere: coords.lat >= 0 ? 'north' : 'south',
      };
      const fetchedAt = Date.now();
      cachedReport = { report: nextReport, fetchedAt };
      publishWeather(nextReport, fetchedAt);
      if (alive.current) {
        setReport(nextReport);
      }
    } catch (error) {
      if (__DEV__) console.warn('[weather]', error instanceof Error ? error.message : error);
      if (alive.current) setReport(null);
    } finally {
      requestInFlight.current = false;
      if (alive.current) setLoading(false);
    }
  }, [clearRetry]);

  useEffect(() => {
    loadWeatherRef.current = loadWeather;
    alive.current = true;
    if (__DEV__ && !OPENWEATHER_KEY) console.warn('[weather] EXPO_PUBLIC_OPENWEATHER_API_KEY is missing from the bundle');
    const initialLoadTimer = OPENWEATHER_KEY ? setTimeout(() => { void loadWeather(); }, 0) : null;
    return () => {
      alive.current = false;
      clearRetry();
      if (initialLoadTimer) clearTimeout(initialLoadTimer);
    };
  }, [clearRetry, loadWeather]);

  useEffect(() => {
    if (!weatherTutorialActive || loading || report) return;
    const timer = setTimeout(() => useServiceTutorial.getState().advance('comicWeather', 'comicTools'), 2000);
    return () => clearTimeout(timer);
  }, [weatherTutorialActive, loading, report]);

  const closeDetails = useCallback(() => {
    tapHaptic();
    setDetailsVisible(false);
    if (weatherTutorialActive) useServiceTutorial.getState().advance('comicWeather', 'comicTools');
  }, [weatherTutorialActive]);

  if (!OPENWEATHER_KEY || !report) return null;

  const labels = locale === 'zh-TW'
    ? weatherDetailCopy['zh-TW']
    : locale.startsWith('ja')
      ? weatherDetailCopy.ja
      : locale.startsWith('en')
        ? weatherDetailCopy.en
        : weatherDetailCopy.ko;
  const candidates = weatherOutfitCandidates(report);
  const outfitIndex = selectedOutfit !== null && candidates.includes(selectedOutfit) ? selectedOutfit : candidates[0];
  const openDetails = () => {
    tapHaptic();
    const key = 'pokit:weather-outfit-rotation:v1';
    const history = localStorageClient.getJson<Record<string, number>>(key) ?? {};
    const condition = String(selectWeatherOutfit(report));
    const next = nextWeatherOutfit(report, history[condition]);
    setSelectedOutfit(next);
    localStorageClient.setJson(key, { ...history, [condition]: next });
    setDetailsVisible(true);
  };
  const label = report.city ? `${report.temperature}° · ${report.city}` : `${report.temperature}°`;
  const accessibilityLabel = report.description ? `${label}, ${report.description}` : label;
  const detailRows: [string, string | null][] = [
    [labels.feelsLike, report.feelsLike === undefined ? null : `${Math.round(report.feelsLike)}°`],
    [labels.humidity, report.humidity === undefined ? null : `${Math.round(report.humidity)}%`],
    [labels.wind, report.windSpeed === undefined ? null : `${report.windSpeed.toFixed(1)} m/s`],
    [labels.gust, report.windGust === undefined ? null : `${report.windGust.toFixed(1)} m/s`],
    [labels.precipitation, report.precipitation === undefined ? null : `${report.precipitation.toFixed(1)} mm`],
    [labels.clouds, report.cloudiness === undefined ? null : `${Math.round(report.cloudiness)}%`],
    [labels.visibility, report.visibilityKm === undefined ? null : `${report.visibilityKm.toFixed(1)} km`],
    [labels.pressure, report.pressure === undefined ? null : `${Math.round(report.pressure)} hPa`],
    [labels.sunrise, report.sunrise === undefined ? null : formatWeatherTime(report.sunrise, report.timezoneOffset ?? 0, locale)],
    [labels.sunset, report.sunset === undefined ? null : formatWeatherTime(report.sunset, report.timezoneOffset ?? 0, locale)],
  ];

  return (
    <View style={styles.container}>
      <ServiceTutorialCoach steps={['comicWeather']} />
      <View style={styles.weatherRow}>
        <ServiceTutorialTarget steps={weatherTutorialActive ? ['comicWeather'] : []}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={openDetails}
          style={styles.weatherButton}>
          <WeatherMark color={muted} />
          <ThemedText numberOfLines={1} style={[styles.weatherText, { color: ink }]}>{label}</ThemedText>
        </Pressable>
        </ServiceTutorialTarget>
      </View>
      <Modal visible={detailsVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={closeDetails}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel={labels.close} onPress={closeDetails} style={styles.modalScrim} />
          <View style={[styles.modalCard, { borderColor: ink }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: ink }]}>{labels.title}</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel={labels.close} hitSlop={10} onPress={closeDetails} style={styles.closeButton}>
                <ThemedText style={[styles.closeText, { color: ink }]}>×</ThemedText>
              </Pressable>
            </View>
            <View style={[styles.modalWeather, { borderBottomColor: muted }]}>
              <WeatherMark color={muted} />
              <View style={styles.modalWeatherCopy}>
                <ThemedText style={[styles.modalTemperature, { color: ink }]}>{report.temperature}°{report.city ? ` · ${report.city}` : ''}</ThemedText>
                {report.description ? <ThemedText style={[styles.modalDescription, { color: muted }]}>{report.description}</ThemedText> : null}
              </View>
              <WeatherOutfit index={outfitIndex} size={56} />
            </View>
            <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsList} showsVerticalScrollIndicator={false}>
              {detailRows.map(([name, value]) => value === null ? null : (
                <View key={name} style={[styles.detailRow, { borderBottomColor: muted }]}>
                  <ThemedText style={[styles.detailName, { color: muted }]}>{name}</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: ink }]}>{value}</ThemedText>
                </View>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={labels.refresh}
              disabled={loading}
              onPress={() => {
                if (!permissionBlocked && requestInFlight.current) return;
                tapHaptic();
                if (permissionBlocked) void Linking.openSettings();
                else if (!requestInFlight.current) {
                  startRefreshAnimation();
                  void loadWeather(true).finally(finishRefreshAnimation);
                }
              }}
              style={[styles.refreshButton, { opacity: loading ? 0.55 : 1 }]}>
              <PenFrame color={muted} />
              <Animated.View style={{ transform: [{ rotate: refreshRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                <RefreshMark color={ink} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const WEATHER_OUTFITS = [
  require('../../../../assets/weather/outfits/01.webp'),
  require('../../../../assets/weather/outfits/02.webp'),
  require('../../../../assets/weather/outfits/03.webp'),
  require('../../../../assets/weather/outfits/04.webp'),
  require('../../../../assets/weather/outfits/05.webp'),
  require('../../../../assets/weather/outfits/06.webp'),
  require('../../../../assets/weather/outfits/07.webp'),
  require('../../../../assets/weather/outfits/08.webp'),
  require('../../../../assets/weather/outfits/09.webp'),
  require('../../../../assets/weather/outfits/10.webp'),
  require('../../../../assets/weather/outfits/11.webp'),
  require('../../../../assets/weather/outfits/12.webp'),
  require('../../../../assets/weather/outfits/13.webp'),
  require('../../../../assets/weather/outfits/14.webp'),
  require('../../../../assets/weather/outfits/15.webp'),
  require('../../../../assets/weather/outfits/16.webp'),
  require('../../../../assets/weather/outfits/17.webp'),
  require('../../../../assets/weather/outfits/18.webp'),
  require('../../../../assets/weather/outfits/19.webp'),
  require('../../../../assets/weather/outfits/20.webp'),
] as const;

function WeatherOutfit({ index, size }: { index: number; size: number }) {
  return (
    <Image
      accessible={false}
      contentFit="contain"
      source={WEATHER_OUTFITS[index]}
      style={{ width: size, height: size * 287 / 274, flexShrink: 0 }}
    />
  );
}

function WeatherMark({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={9} cy={9} r={3.5} fill="none" stroke={color} strokeWidth={1.25} />
      <Line x1={9} y1={1.5} x2={9} y2={3} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Line x1={9} y1={15} x2={9} y2={16.5} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Line x1={1.5} y1={9} x2={3} y2={9} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Line x1={15} y1={9} x2={16.5} y2={9} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Path d="M7.5 19.2h10.2a3.3 3.3 0 0 0 .2-6.6 4.6 4.6 0 0 0-8.7.6 3 3 0 0 0-1.7 6Z" fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshMark({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path d="M19 8A7.5 7.5 0 0 0 5 7" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5 3v4h4M5 16a7.5 7.5 0 0 0 14 1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 21v-4h-4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 26, maxWidth: '100%' },
  weatherRow: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' },
  weatherButton: { minWidth: 0, minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  weatherText: { fontSize: 15, lineHeight: 22, flexShrink: 1 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 23, 20, 0.38)' },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '84%', padding: 20, gap: 13, borderWidth: 1.2, borderRadius: 5, backgroundColor: '#F7F4EC' },
  modalHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, lineHeight: 26 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, lineHeight: 32 },
  modalWeather: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  modalWeatherCopy: { flex: 1, gap: 3 },
  modalTemperature: { fontSize: 22, lineHeight: 30 },
  modalDescription: { fontSize: 13, lineHeight: 19, textTransform: 'capitalize' },
  detailsScroll: { flexShrink: 1 },
  detailsList: { gap: 0 },
  detailRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  detailName: { fontSize: 13, lineHeight: 19 },
  detailValue: { fontSize: 14, lineHeight: 20, textAlign: 'right' },
  refreshButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
