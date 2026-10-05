import {
  DEFAULT_POST_IT_INK_COLOR_ID,
  DEFAULT_WIDGET_POST_IT_FACE_COLOR_ID,
  resolvePostItFaceColor,
  resolvePostItInkHex,
  resolvePostItInkMuted,
  type PostItFaceColorId,
  type PostItInkColorId,
} from '@shared/lib/storage';

export type WidgetPostItAppearance = {
  faceId: PostItFaceColorId;
  inkId: PostItInkColorId;
  faceHex: string;
  inkHex: string;
  mutedHex: string;
  underlineText: boolean;
};

/** 홈 위젯 포스트잇 면·글자색. 미지정 시 기본 면색·자동 글자색 */
export function resolveWidgetPostItAppearance(
  isDark = false,
  options?: { faceId?: PostItFaceColorId | null; inkId?: PostItInkColorId | null },
): WidgetPostItAppearance {
  const inkId = options?.inkId ?? DEFAULT_POST_IT_INK_COLOR_ID;
  const faceId = options?.faceId ?? DEFAULT_WIDGET_POST_IT_FACE_COLOR_ID;
  const faceHex = resolvePostItFaceColor(faceId, isDark);
  const inkHex = resolvePostItInkHex(inkId, faceId, isDark);
  const mutedHex = resolvePostItInkMuted(inkHex);
  return { faceId, inkId, faceHex, inkHex, mutedHex, underlineText: false };
}
