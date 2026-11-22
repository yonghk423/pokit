import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { RETIRED_CALENDAR_DESIGNS } from './retiredCalendarDesigns';
import { freePhotoCalendar, type FreePhotoCalendar } from './freePhotoCalendars';
import { removeSavedPickerFile } from '@shared/lib/media/removeSavedPickerFile';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { isPremiumPaper, type PremiumPaper } from './premiumCalendarPapers';
import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';

import { EVERYDAY_CINEMA_THEMES } from './everydayCinemaThemes';
import { WARM_SEPIA_OPEN_PANEL_THEMES } from './warmSepiaThemes';
import { CITYPOP_RETRO_THEMES } from './citypopRetroThemes';
export { EVERYDAY_CINEMA_THEMES };
export { WARM_SEPIA_OPEN_PANEL_THEMES };
export { CITYPOP_RETRO_THEMES };
import { TEXTURED_WATERCOLOR_THEMES } from './texturedWatercolorThemes';
export { TEXTURED_WATERCOLOR_THEMES };
import { SEASON_WINTER_THEMES } from './seasonWinterThemes';
import { SEASON_COLLECTION_THEMES } from './seasonCollectionThemes';
export const CITY_CALENDAR_THEMES = [
  ...SEASON_COLLECTION_THEMES.spring, ...SEASON_COLLECTION_THEMES.summer, ...SEASON_COLLECTION_THEMES.autumn,
  ...SEASON_WINTER_THEMES,
  ...EVERYDAY_CINEMA_THEMES,
  ...WARM_SEPIA_OPEN_PANEL_THEMES,
  ...CITYPOP_RETRO_THEMES,
  ...TEXTURED_WATERCOLOR_THEMES,
  { design: 'city-animation-01', themeId: '01-rush-hour-commute', get title() { return translateUiText("계단을 내려가는 아침"); }, concept: '출근 계단마다 놓인 오늘의 날짜' },
  { design: 'city-animation-02', themeId: '02-office-presentation', get title() { return translateUiText("나의 발표"); }, concept: '발표 보드에 차곡차곡 적는 한 달' },
  { design: 'city-animation-03', themeId: '03-spilled-coffee-report', get title() { return translateUiText("커피를 쏟은 아침"); }, concept: '보고서 위에 다시 채워가는 하루' },
  { design: 'city-animation-04', themeId: '04-lunch-rooftop', get title() { return translateUiText("옥상의 점심"); }, concept: '피크닉 매트에 담긴 한 달의 기록' },
  { design: 'city-animation-05', themeId: '05-proud-promotion', get title() { return translateUiText("축하받은 날"); }, concept: '축하 게시판에 핀 날짜 카드' },
  { design: 'city-animation-06', themeId: '06-angry-email', get title() { return translateUiText("화난 메일"); }, concept: '퇴근길 책상 위에 쌓이는 한 달' },
  { design: 'city-animation-07', themeId: '07-after-work-run', get title() { return translateUiText("퇴근 후 달리기"); }, concept: '트랙을 따라 이어지는 날짜' },
  { design: 'city-animation-08', themeId: '08-missed-deadline', get title() { return translateUiText("마감의 밤"); }, concept: '늦은 사무실의 유리 메모 보드' },
  { design: 'city-animation-09', themeId: '09-boxing-bag', get title() { return translateUiText("샌드백을 치며"); }, concept: '체육관의 종이 기록판' },
  { design: 'city-animation-10', themeId: '10-basketball-shot', get title() { return translateUiText("농구 슛"); }, concept: '코트 옆 전술 보드에 채우는 날들' },
  { design: 'city-animation-11', themeId: '11-swimming-laps', get title() { return translateUiText("수영 연습"); }, concept: '수영장 타일 위에 새기는 한 달' },
  { design: 'city-animation-12', themeId: '12-cycling-hill', get title() { return translateUiText("언덕 자전거"); }, concept: '언덕길 표지석에 남기는 날짜' },
  { design: 'city-animation-13', themeId: '13-yoga-balance', get title() { return translateUiText("요가 균형"); }, concept: '스튜디오 수납 칸에 담은 기록' },
  { design: 'city-animation-14', themeId: '14-tennis-serve', get title() { return translateUiText("테니스 서브"); }, concept: '코트 라인을 따라 정리한 한 달' },
  { design: 'city-animation-15', themeId: '15-soccer-dribble', get title() { return translateUiText("축구 드리블"); }, concept: '경기장 전광판에 쌓이는 날들' },
  { design: 'city-animation-16', themeId: '16-dance-practice', get title() { return translateUiText("춤 연습"); }, concept: '연습실 조명으로 밝히는 한 달' },
  { design: 'city-animation-17', themeId: '17-climbing-wall', get title() { return translateUiText("클라이밍"); }, concept: '암벽 홀드 사이에 기록하는 날짜' },
  { design: 'city-animation-18', themeId: '18-jump-rope', get title() { return translateUiText("줄넘기"); }, concept: '체육관 바닥 타일의 달력' },
  { design: 'city-animation-19', themeId: '19-rain-run', get title() { return translateUiText("빗속 달리기"); }, concept: '빗방울 맺힌 야간 트랙의 한 달' },
  { design: 'city-animation-20', themeId: '20-badminton-rally', get title() { return translateUiText("배드민턴"); }, concept: '코트 옆 밝은 기록 보드' },
  { design: 'city-animation-21', themeId: '21-couch-after-work', get title() { return translateUiText("퇴근 후 휴식"); }, concept: '포근한 쿠션에 새기는 날짜' },
  { design: 'city-animation-22', themeId: '22-window-tea', get title() { return translateUiText("창가의 차 한잔"); }, concept: '창가 유리에 비치는 한 달' },
  { design: 'city-animation-23', themeId: '23-laundry-day', get title() { return translateUiText("빨래하는 날"); }, concept: '세탁실 타일 칸에 적는 기록' },
  { design: 'city-animation-24', themeId: '24-home-cooking', get title() { return translateUiText("저녁 준비"); }, concept: '주방의 남색 타일 달력' },
  { design: 'city-animation-25', themeId: '25-lazy-morning', get title() { return translateUiText("느린 아침"); }, concept: '침대 곁 이불 위에 놓인 한 달' },
  { design: 'city-animation-26', themeId: '26-couch-nap', get title() { return translateUiText("소파 낮잠"); }, concept: '접힌 담요의 포근한 달력' },
  { design: 'city-animation-27', themeId: '27-houseplant-care', get title() { return translateUiText("식물 돌보기"); }, concept: '햇살 드는 화분 선반의 기록' },
  { design: 'city-animation-28', themeId: '28-movie-night', get title() { return translateUiText("영화 보는 밤"); }, concept: '극장 전광판에 비추는 날짜' },
  { design: 'city-animation-29', themeId: '29-bathroom-skincare', get title() { return translateUiText("스킨케어 시간"); }, concept: '욕실 거울 옆 타일 달력' },
  { design: 'city-animation-30', themeId: '30-cat-on-lap', get title() { return translateUiText("고양이와 휴식"); }, concept: '니트 담요의 부드러운 날짜 칸' },
  { design: 'city-animation-31', themeId: '31-frustrated-phone-call', get title() { return translateUiText("답답한 전화"); }, concept: '오래된 교환대에 쌓이는 날들' },
  { design: 'city-animation-32', themeId: '32-sad-bus-stop', get title() { return translateUiText("비 오는 정류장"); }, concept: '젖은 유리 너머로 보는 한 달' },
  { design: 'city-animation-33', themeId: '33-exam-results-joy', get title() { return translateUiText("합격의 순간"); }, concept: '칠판에 남기는 기쁜 날짜들' },
  { design: 'city-animation-34', themeId: '34-interview-nerves', get title() { return translateUiText("면접 전 긴장"); }, concept: '차분한 금속 패널에 새기는 한 달' },
  { design: 'city-animation-35', themeId: '35-breakup-evening', get title() { return translateUiText("이별의 저녁"); }, concept: '편지지에 한 장씩 채우는 날' },
  { design: 'city-animation-36', themeId: '36-concert-happiness', get title() { return translateUiText("공연의 열기"); }, concept: '빛나는 공연장 타일 달력' },
  { design: 'city-animation-37', themeId: '37-embarrassed-spill', get title() { return translateUiText("커피를 쏟은 날"); }, concept: '카페 코스터마다 남기는 기록' },
  { design: 'city-animation-38', themeId: '38-holiday-loneliness', get title() { return translateUiText("여행지의 외로움"); }, concept: '공항 안내판처럼 흐르는 날짜' },
  { design: 'city-animation-39', themeId: '39-birthday-surprise', get title() { return translateUiText("생일 축하"); }, concept: '색색의 선물 태그로 모은 한 달' },
  { design: 'city-animation-40', themeId: '40-relief-after-cry', get title() { return translateUiText("울고 난 뒤의 안도"); }, concept: '린넨 이불에 조용히 남기는 날' },
  { design: 'city-animation-41', themeId: '41-spring-blossom-bicycle', get title() { return translateUiText("봄꽃 자전거"); }, concept: '꽃잎이 놓인 돌길 위의 한 달' },
  { design: 'city-animation-42', themeId: '42-spring-rain-puddle', get title() { return translateUiText("봄비 산책"); }, concept: '빗물에 번지는 봄날의 날짜' },
  { design: 'city-animation-43', themeId: '43-spring-garden-planting', get title() { return translateUiText("봄날의 정원"); }, concept: '모종 트레이에 자라나는 기록' },
  { design: 'city-animation-44', themeId: '44-summer-beach-walk', get title() { return translateUiText("여름 해변"); }, concept: '해변 담요에 펼쳐 둔 달력' },
  { design: 'city-animation-45', themeId: '45-summer-hill-hike', get title() { return translateUiText("여름 언덕 산책"); }, concept: '산책길 돌 표식에 담은 날짜' },
  { design: 'city-animation-46', themeId: '46-autumn-leaves', get title() { return translateUiText("가을 낙엽 길"); }, concept: '낙엽 아래 놓인 종이 날짜 칸' },
  { design: 'city-animation-47', themeId: '47-autumn-market', get title() { return translateUiText("가을 시장"); }, concept: '시장 바구니에 차곡차곡 담은 한 달' },
  { design: 'city-animation-48', themeId: '48-autumn-bus-shelter', get title() { return translateUiText("가을 버스 정류장"); }, concept: '정류장 유리에 비친 가을 날짜' },
  { design: 'city-animation-49', themeId: '49-winter-snow-play', get title() { return translateUiText("첫눈의 장난"); }, concept: '눈 내린 길 위에 적는 한 달' },
  { design: 'city-animation-50', themeId: '50-winter-bus-wait', get title() { return translateUiText("겨울 정류장"); }, concept: '목도리의 니트 칸마다 담은 기록' },
] as const;
export type HeroCalendarDesign = FreePhotoCalendar | PremiumPaper | 'clipboard' | 'bold' | 'grid' | 'photo' | 'weather' | 'illustration' | typeof CITY_CALENDAR_THEMES[number]['design'];
export function isIllustrationCalendarDesign(design: string): boolean {
  return design === 'illustration' || CITY_CALENDAR_THEMES.some(theme => theme.design === design);
}
const KEY = 'pokit:calendar-design';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function readHeroCalendarDesign(): HeroCalendarDesign {
  const saved = localStorageClient.getJson<string>(KEY);
  if (saved && RETIRED_CALENDAR_DESIGNS.has(saved)) return 'cream-kitten';
  return freePhotoCalendar(saved) || isPremiumPaper(saved) || saved === 'clipboard' || saved === 'bold' || saved === 'photo' || saved === 'weather' || CITY_CALENDAR_THEMES.some(theme => theme.design === saved) ? saved as HeroCalendarDesign : 'cream-kitten';
}
export const isProCalendarDesign = (design: HeroCalendarDesign) => {
  const theme = freePhotoCalendar(design);
  return !!theme && 'pro' in theme && theme.pro;
};
export function applyHeroCalendarDesign(design: HeroCalendarDesign) {
  if (isProCalendarDesign(design) && !selectCanTestProStoreItems(useSubscriptionStore.getState())) return;
  localStorageClient.setJson(KEY, design);
  listeners.forEach(listener => listener());
}
export function useHeroCalendarDesign() {
  const design = useSyncExternalStore(subscribe, readHeroCalendarDesign, readHeroCalendarDesign);
  const pro = useSubscriptionStore(selectCanTestProStoreItems);
  return !pro && isProCalendarDesign(design) ? 'cream-kitten' : design;
}

const coverKey = (month: string) => `pokit:calendar-cover:${month}`;
export function useHeroCalendarCover(month: string) {
  const snapshot = () => {
    const saved = localStorageClient.getJson<string>(coverKey(month));
    return saved ? resolveHeroArtworkUri(saved) : null;
  };
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
export async function saveHeroCalendarCover(month: string, uri: string, fileName?: string | null) {
  const fs = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  if (!fs.documentDirectory) throw new Error('calendar_cover_storage_unavailable');
  const extension = (/\.(jpe?g|png|heic|heif|webp|gif|avif)$/i.exec(uri.split('?')[0]) ?? /\.(jpe?g|png|heic|heif|webp|gif|avif)$/i.exec(fileName ?? ''))?.[1] ?? 'jpg';
  const folder = `${fs.documentDirectory}calendar-covers/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const destination = `${folder}${month}-${Date.now()}.${extension}`;
  await fs.copyAsync({ from: uri, to: destination });
  const savedPrevious = localStorageClient.getJson<string>(coverKey(month));
  const previous = savedPrevious ? resolveHeroArtworkUri(savedPrevious) : null;
  localStorageClient.setJson(coverKey(month), destination);
  await removeSavedPickerFile(uri);
  listeners.forEach(listener => listener());
  if (previous && previous !== destination && previous.startsWith(folder)) await fs.deleteAsync(previous, { idempotent: true }).catch(() => undefined);
}

// Shared with the tab-level wallpaper, which also paints beneath the tab bar.
let calendarBackdropVisible = true;
export function setCalendarBackdropVisible(visible: boolean) {
  calendarBackdropVisible = visible;
  listeners.forEach(listener => listener());
}
export function useCalendarBackdropVisible() {
  return useSyncExternalStore(subscribe, () => calendarBackdropVisible, () => true);
}
