/**
 * 퍼즐 히스토리 이미지 저장 크기 정책.
 * - 본문(펼침·상세): 긴 변 최대 1080 (폰 보드에 충분, 작으면 업스케일하지 않음)
 * - 벽·앨범 썸네일: 긴 변 240 (격자 칸 ~100px × 2~3x)
 */

export const PUZZLE_IMAGE_MAX_EDGE = 1080;
export const PUZZLE_THUMB_EDGE = 240;
export const PUZZLE_IMAGE_COMPRESS = 0.78;
export const PUZZLE_THUMB_COMPRESS = 0.65;

/** 표시 폭이 이하면 썸네일 URI를 우선 (벽 미니·중간 보드) */
export const PUZZLE_BOARD_THUMB_WIDTH_MAX = 360;

/**
 * 긴 변이 maxEdge를 넘을 때만 리사이즈할 width를 반환.
 * 정사각이면 width === height === maxEdge.
 * 이미 작으면 null (조작 불필요).
 */
export function puzzleImageDownscaleWidth(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number = PUZZLE_IMAGE_MAX_EDGE,
): number | null {
  const w = Math.max(0, Math.floor(sourceWidth));
  const h = Math.max(0, Math.floor(sourceHeight));
  if (w <= 0 || h <= 0) return maxEdge;
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return null;
  return Math.max(1, Math.round((w / edge) * maxEdge));
}

/** 보드 표시용 URI — 좁은 타일은 썸네일 */
export function resolvePuzzleBoardImageUri(
  imageUri: string,
  thumbnailUri: string | undefined,
  boardWidth: number,
): string {
  const full = imageUri.trim();
  const thumb = thumbnailUri?.trim();
  if (thumb && boardWidth > 0 && boardWidth <= PUZZLE_BOARD_THUMB_WIDTH_MAX) {
    return thumb;
  }
  return full;
}
