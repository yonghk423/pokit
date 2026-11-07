import { scaleTypeSize } from './appFontSize';

export const DIARY_DATE_FONT_SIZE = 17;
export const DIARY_BODY_FONT_SIZE = 17;

/** Shared by the native editor and its settings preview, including system scaling. */
export function resolveDiaryEditorTypography(appScale: number, fontScale: number) {
  const fontSize = Math.round(scaleTypeSize(DIARY_BODY_FONT_SIZE, appScale) * fontScale);
  const lineHeight = Math.ceil(scaleTypeSize(32, appScale) * fontScale);
  const titleSize = Math.round(scaleTypeSize(26, appScale) * fontScale);
  return { fontSize, lineHeight, titleSize, titleLineHeight: Math.ceil(titleSize * 1.55) };
}
