import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export const CITY_CALENDAR_THEMES = [
  { design: 'city-animation-01', themeId: '01-rush-hour-commute', title: '계단을 내려가는 아침', concept: '출근 계단마다 놓인 오늘의 날짜' },
  { design: 'city-animation-02', themeId: '02-office-presentation', title: '나의 발표', concept: '발표 보드에 차곡차곡 적는 한 달' },
  { design: 'city-animation-03', themeId: '03-spilled-coffee-report', title: '커피를 쏟은 아침', concept: '보고서 위에 다시 채워가는 하루' },
  { design: 'city-animation-04', themeId: '04-lunch-rooftop', title: '옥상의 점심', concept: '피크닉 매트에 담긴 한 달의 기록' },
  { design: 'city-animation-05', themeId: '05-proud-promotion', title: '축하받은 날', concept: '축하 게시판에 핀 날짜 카드' },
  { design: 'city-animation-06', themeId: '06-angry-email', title: '화난 메일', concept: '퇴근길 책상 위에 쌓이는 한 달' },
  { design: 'city-animation-07', themeId: '07-after-work-run', title: '퇴근 후 달리기', concept: '트랙을 따라 이어지는 날짜' },
  { design: 'city-animation-08', themeId: '08-missed-deadline', title: '마감의 밤', concept: '늦은 사무실의 유리 메모 보드' },
  { design: 'city-animation-09', themeId: '09-boxing-bag', title: '샌드백을 치며', concept: '체육관의 종이 기록판' },
  { design: 'city-animation-10', themeId: '10-basketball-shot', title: '농구 슛', concept: '코트 옆 전술 보드에 채우는 날들' },
  { design: 'city-animation-11', themeId: '11-swimming-laps', title: '수영 연습', concept: '수영장 타일 위에 새기는 한 달' },
  { design: 'city-animation-12', themeId: '12-cycling-hill', title: '언덕 자전거', concept: '언덕길 표지석에 남기는 날짜' },
  { design: 'city-animation-13', themeId: '13-yoga-balance', title: '요가 균형', concept: '스튜디오 수납 칸에 담은 기록' },
  { design: 'city-animation-14', themeId: '14-tennis-serve', title: '테니스 서브', concept: '코트 라인을 따라 정리한 한 달' },
  { design: 'city-animation-15', themeId: '15-soccer-dribble', title: '축구 드리블', concept: '경기장 전광판에 쌓이는 날들' },
  { design: 'city-animation-16', themeId: '16-dance-practice', title: '춤 연습', concept: '연습실 조명으로 밝히는 한 달' },
  { design: 'city-animation-17', themeId: '17-climbing-wall', title: '클라이밍', concept: '암벽 홀드 사이에 기록하는 날짜' },
  { design: 'city-animation-18', themeId: '18-jump-rope', title: '줄넘기', concept: '체육관 바닥 타일의 달력' },
  { design: 'city-animation-19', themeId: '19-rain-run', title: '빗속 달리기', concept: '빗방울 맺힌 야간 트랙의 한 달' },
  { design: 'city-animation-20', themeId: '20-badminton-rally', title: '배드민턴', concept: '코트 옆 밝은 기록 보드' },
  { design: 'city-animation-21', themeId: '21-couch-after-work', title: '퇴근 후 휴식', concept: '포근한 쿠션에 새기는 날짜' },
  { design: 'city-animation-22', themeId: '22-window-tea', title: '창가의 차 한잔', concept: '창가 유리에 비치는 한 달' },
  { design: 'city-animation-23', themeId: '23-laundry-day', title: '빨래하는 날', concept: '세탁실 타일 칸에 적는 기록' },
  { design: 'city-animation-24', themeId: '24-home-cooking', title: '저녁 준비', concept: '주방의 남색 타일 달력' },
  { design: 'city-animation-25', themeId: '25-lazy-morning', title: '느린 아침', concept: '침대 곁 이불 위에 놓인 한 달' },
  { design: 'city-animation-26', themeId: '26-couch-nap', title: '소파 낮잠', concept: '접힌 담요의 포근한 달력' },
  { design: 'city-animation-27', themeId: '27-houseplant-care', title: '식물 돌보기', concept: '햇살 드는 화분 선반의 기록' },
  { design: 'city-animation-28', themeId: '28-movie-night', title: '영화 보는 밤', concept: '극장 전광판에 비추는 날짜' },
  { design: 'city-animation-29', themeId: '29-bathroom-skincare', title: '스킨케어 시간', concept: '욕실 거울 옆 타일 달력' },
  { design: 'city-animation-30', themeId: '30-cat-on-lap', title: '고양이와 휴식', concept: '니트 담요의 부드러운 날짜 칸' },
  { design: 'city-animation-31', themeId: '31-frustrated-phone-call', title: '답답한 전화', concept: '오래된 교환대에 쌓이는 날들' },
  { design: 'city-animation-32', themeId: '32-sad-bus-stop', title: '비 오는 정류장', concept: '젖은 유리 너머로 보는 한 달' },
  { design: 'city-animation-33', themeId: '33-exam-results-joy', title: '합격의 순간', concept: '칠판에 남기는 기쁜 날짜들' },
  { design: 'city-animation-34', themeId: '34-interview-nerves', title: '면접 전 긴장', concept: '차분한 금속 패널에 새기는 한 달' },
  { design: 'city-animation-35', themeId: '35-breakup-evening', title: '이별의 저녁', concept: '편지지에 한 장씩 채우는 날' },
  { design: 'city-animation-36', themeId: '36-concert-happiness', title: '공연의 열기', concept: '빛나는 공연장 타일 달력' },
  { design: 'city-animation-37', themeId: '37-embarrassed-spill', title: '커피를 쏟은 날', concept: '카페 코스터마다 남기는 기록' },
  { design: 'city-animation-38', themeId: '38-holiday-loneliness', title: '여행지의 외로움', concept: '공항 안내판처럼 흐르는 날짜' },
  { design: 'city-animation-39', themeId: '39-birthday-surprise', title: '생일 축하', concept: '색색의 선물 태그로 모은 한 달' },
  { design: 'city-animation-40', themeId: '40-relief-after-cry', title: '울고 난 뒤의 안도', concept: '린넨 이불에 조용히 남기는 날' },
  { design: 'city-animation-41', themeId: '41-spring-blossom-bicycle', title: '봄꽃 자전거', concept: '꽃잎이 놓인 돌길 위의 한 달' },
  { design: 'city-animation-42', themeId: '42-spring-rain-puddle', title: '봄비 산책', concept: '빗물에 번지는 봄날의 날짜' },
  { design: 'city-animation-43', themeId: '43-spring-garden-planting', title: '봄날의 정원', concept: '모종 트레이에 자라나는 기록' },
  { design: 'city-animation-44', themeId: '44-summer-beach-walk', title: '여름 해변', concept: '해변 담요에 펼쳐 둔 달력' },
  { design: 'city-animation-45', themeId: '45-summer-hill-hike', title: '여름 언덕 산책', concept: '산책길 돌 표식에 담은 날짜' },
  { design: 'city-animation-46', themeId: '46-autumn-leaves', title: '가을 낙엽 길', concept: '낙엽 아래 놓인 종이 날짜 칸' },
  { design: 'city-animation-47', themeId: '47-autumn-market', title: '가을 시장', concept: '시장 바구니에 차곡차곡 담은 한 달' },
  { design: 'city-animation-48', themeId: '48-autumn-bus-shelter', title: '가을 버스 정류장', concept: '정류장 유리에 비친 가을 날짜' },
  { design: 'city-animation-49', themeId: '49-winter-snow-play', title: '첫눈의 장난', concept: '눈 내린 길 위에 적는 한 달' },
  { design: 'city-animation-50', themeId: '50-winter-bus-wait', title: '겨울 정류장', concept: '목도리의 니트 칸마다 담은 기록' },
] as const;
export type HeroCalendarDesign = 'clipboard' | 'bold' | 'grid' | 'photo' | 'illustration' | typeof CITY_CALENDAR_THEMES[number]['design'];
const KEY = 'pokit:calendar-design';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function readHeroCalendarDesign(): HeroCalendarDesign {
  const saved = localStorageClient.getJson<string>(KEY);
  return saved === 'clipboard' || saved === 'bold' || saved === 'photo' || CITY_CALENDAR_THEMES.some(theme => theme.design === saved) ? saved as HeroCalendarDesign : 'bold';
}
export function applyHeroCalendarDesign(design: HeroCalendarDesign) {
  localStorageClient.setJson(KEY, design);
  listeners.forEach(listener => listener());
}
export function useHeroCalendarDesign() {
  return useSyncExternalStore(subscribe, readHeroCalendarDesign, readHeroCalendarDesign);
}

const coverKey = (month: string) => `pokit:calendar-cover:${month}`;
export function useHeroCalendarCover(month: string) {
  const snapshot = () => localStorageClient.getJson<string>(coverKey(month)) ?? null;
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
  const previous = localStorageClient.getJson<string>(coverKey(month));
  localStorageClient.setJson(coverKey(month), destination);
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
