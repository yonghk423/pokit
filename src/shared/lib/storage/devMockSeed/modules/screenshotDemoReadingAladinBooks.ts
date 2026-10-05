/**
 * 스크린샷/목업 책방용 알라딘 실데이터.
 * ItemSearch → ItemLookUp으로 확인한 값 (cover는 coversum → cover 승격).
 */
export type ScreenshotDemoReadingAladinBook = {
  itemId: number;
  link: string;
  coverUrl: string;
  author: string;
  totalPages: number;
  /** 알라딘 원제(한국어). 로케일별 UI 제목은 copy 쪽에서 별도 관리 */
  aladinTitle: string;
};

/** 데미안 — 민음사 / 헤르만 헤세 */
export const SCREENSHOT_ALADIN_DEMIAN: ScreenshotDemoReadingAladinBook = {
  itemId: 260084,
  aladinTitle: '데미안',
  author: '헤르만 헤세 (지은이), 전영애 (옮긴이)',
  coverUrl: 'https://image.aladin.co.kr/product/26/0/cover/s452139198_1.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=260084',
  totalPages: 248,
};

/** 아주 작은 습관의 힘 (Atomic Habits) — 비즈니스북스 */
export const SCREENSHOT_ALADIN_ATOMIC_HABITS: ScreenshotDemoReadingAladinBook = {
  itemId: 379447436,
  aladinTitle: '아주 작은 습관의 힘 (50만 부 기념 스페셜 에디션) - 최고의 변화는 어떻게 만들어지는가',
  author: '제임스 클리어 (지은이), 이한이 (옮긴이)',
  coverUrl: 'https://image.aladin.co.kr/product/37944/74/cover/k672033454_3.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=379447436',
  totalPages: 360,
};

/** 사피엔스 — 김영사 */
export const SCREENSHOT_ALADIN_SAPIENS: ScreenshotDemoReadingAladinBook = {
  itemId: 314240466,
  aladinTitle: '사피엔스 - 유인원에서 사이보그까지, 인간 역사의 대담하고 위대한 질문',
  author: '유발 하라리 (지은이), 조현욱 (옮긴이), 이태수 (감수)',
  coverUrl: 'https://image.aladin.co.kr/product/31424/4/cover/k482832219_1.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=314240466',
  totalPages: 648,
};

/** 미드나잇 라이브러리 — 인플루엔셜 */
export const SCREENSHOT_ALADIN_MIDNIGHT_LIBRARY: ScreenshotDemoReadingAladinBook = {
  itemId: 269873776,
  aladinTitle: '미드나잇 라이브러리',
  author: '매트 헤이그 (지은이), 노진선 (옮긴이)',
  coverUrl: 'https://image.aladin.co.kr/product/26987/37/cover/s622931315_1.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=269873776',
  totalPages: 408,
};

/** 어린왕자 — 앱 시드와 동일 알라딘 에디션 */
export const SCREENSHOT_ALADIN_LITTLE_PRINCE: ScreenshotDemoReadingAladinBook = {
  itemId: 251847567,
  aladinTitle: '어린왕자 (소프트커버 에디션) - 개정판',
  author: '앙투안 드 생텍쥐페리 (지은이), 전성자 (옮긴이)',
  coverUrl: 'https://image.aladin.co.kr/product/25184/75/cover/8931021291_1.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=251847567',
  totalPages: 144,
};

/** 해리 포터와 마법사의 돌 1 — 문학수첩 */
export const SCREENSHOT_ALADIN_HARRY_POTTER: ScreenshotDemoReadingAladinBook = {
  itemId: 300101,
  aladinTitle: '해리 포터와 마법사의 돌 1',
  author: 'J.K. 롤링 (지은이), 김혜원 (옮긴이)',
  coverUrl: 'https://image.aladin.co.kr/product/30/1/cover/8983921485_1.jpg',
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=300101',
  totalPages: 295,
};

export const SCREENSHOT_DEMO_READING_ALADIN_BOOKS = [
  SCREENSHOT_ALADIN_DEMIAN,
  SCREENSHOT_ALADIN_ATOMIC_HABITS,
  SCREENSHOT_ALADIN_SAPIENS,
  SCREENSHOT_ALADIN_MIDNIGHT_LIBRARY,
  SCREENSHOT_ALADIN_LITTLE_PRINCE,
  SCREENSHOT_ALADIN_HARRY_POTTER,
] as const;

export function toReadingAladinPayload(book: ScreenshotDemoReadingAladinBook) {
  return {
    itemId: book.itemId,
    link: book.link,
    coverUrl: book.coverUrl,
    author: book.author,
    totalPages: book.totalPages,
  };
}
