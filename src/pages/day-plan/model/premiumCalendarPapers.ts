export const premiumPapers = {
  'silver-ring': { name: 'Silver Ring', description: '은색 링과 금속 프레임', paper: '#F4F3EF', edge: '#A8AAAC' },
  'mint-glass': { name: 'Mint Glass', description: '민트빛 유리 프레임', paper: '#DDF2E5', edge: '#9CCCB3' },
  'leather-folio': { name: 'Leather Folio', description: '버건디 가죽 커버', paper: '#F4EADB', edge: '#683638' },
  'soft-mint': { name: 'Soft Mint', description: '쿨 그레이와 민트 포인트', paper: '#E6EAF1', edge: '#BCC6D2' },
  'mint-planner': { name: 'Navy Planner', description: '메모를 담는 네이비 플래너', paper: '#172B46', edge: '#415A78' },
  'spiral-plan': { name: 'Spiral Plan', description: '검은 스프링 월간 플래너', paper: '#F6F5F0', edge: '#424441' },
  'kraft-clip': { name: 'Kraft Clip', description: '집게로 묶은 크라프트 월간 달력', paper: '#EEE1CB', edge: '#957C5F' },
  'ivory-paper': { name: 'Ivory Paper', description: '단정한 아이보리 종이 월간 달력', paper: '#F8EFE5', edge: '#E1CFC2' },
  'berry-purple': { name: 'Berry Purple', description: '자주색 배경의 라운드 월간 달력', paper: '#B32F7C', edge: '#D383AE' },
  'cobalt-blue': { name: 'Cobalt Blue', description: '코발트블루 배경의 라운드 월간 달력', paper: '#0047AB', edge: '#7696D2' },
  'emerald': { name: 'Emerald', description: '에메랄드 그린 배경의 라운드 월간 달력', paper: '#007A59', edge: '#79C8AD' },
} as const;
export type PremiumPaper = keyof typeof premiumPapers;
export function isPremiumPaper(value: unknown): value is PremiumPaper {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(premiumPapers, value);
}
export const premiumCalendarItems = (Object.keys(premiumPapers) as PremiumPaper[]).map(id => ({ id, ...premiumPapers[id] }));

export function isRaisedCalendar(design: string) {
  return design === 'berry-purple' || design === 'cobalt-blue' || design === 'emerald';
}
