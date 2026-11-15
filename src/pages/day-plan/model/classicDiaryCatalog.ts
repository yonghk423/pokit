import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
export const classicDiaryCatalog = [
  { id: 'classic-frame', category: 'frame', get title() { return translateUiText("클래식 사진틀"); }, titleEn: 'Classic Photo frame', preview: require('../../../../assets/textures/polaroid-stock-v1.png') },
  { id: 'classic-tab', category: 'tab', get title() { return translateUiText("클래식 탭 장식"); }, titleEn: 'Classic Tab decor', preview: require('../../../../assets/classic-diary/classic-tab-3d-v2.webp') },
  { id: 'classic-date', category: 'date', get title() { return translateUiText("종이 날짜 라벨"); }, titleEn: 'Paper Date label', preview: require('../../../../assets/classic-diary/classic-date-paper-v3.webp') },
  { id: 'classic-mark', category: 'mark', get title() { return translateUiText("클래식 책갈피"); }, titleEn: 'Classic Bookmark', preview: require('../../../../assets/classic-diary/classic-mark-3d.webp') },
  { id: 'classic-memo', category: 'memo', get title() { return translateUiText("클래식 메모지"); }, titleEn: 'Classic Memo paper', preview: require('../../../../assets/classic-diary/classic-memo-3d.webp') },
  { id: 'classic-corner', category: 'corner', get title() { return translateUiText("클래식 사진 코너"); }, titleEn: 'Classic Photo corner', preview: require('../../../../assets/classic-diary/classic-corner-3d.webp') },
  { id: 'classic-pin', category: 'pin', get title() { return translateUiText("클래식 황동 핀"); }, titleEn: 'Classic Brass pin', preview: require('../../../../assets/classic-diary/classic-pin-3d.webp') },
  { id: 'classic-charm', category: 'charm', get title() { return translateUiText("클래식 별 참"); }, titleEn: 'Classic Star charm', preview: require('../../../../assets/classic-diary/classic-charm-3d.webp') },
  { id: 'classic-pocket', category: 'pocket', get title() { return translateUiText("클래식 포켓"); }, titleEn: 'Classic Pocket', preview: require('../../../../assets/classic-diary/classic-pocket-3d.webp') },
] as const;
