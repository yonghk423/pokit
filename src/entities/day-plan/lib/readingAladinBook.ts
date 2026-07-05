export type ReadingAladinBook = {
  itemId: number;
  link: string;
  coverUrl: string;
  author: string;
  /** 알라딘 ItemLookUp subInfo.itemPage */
  totalPages?: number;
};

function clampText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}

export function normalizeReadingAladinBook(input: unknown): ReadingAladinBook | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ReadingAladinBook>;
  const itemId =
    typeof raw.itemId === 'number' && Number.isFinite(raw.itemId) && raw.itemId > 0
      ? Math.round(raw.itemId)
      : null;
  const link = clampText(raw.link, 500);
  if (itemId == null || link.length === 0) return null;

  return {
    itemId,
    link,
    coverUrl: clampText(raw.coverUrl, 500),
    author: clampText(raw.author, 120),
    totalPages: toPositiveInt(raw.totalPages),
  };
}
