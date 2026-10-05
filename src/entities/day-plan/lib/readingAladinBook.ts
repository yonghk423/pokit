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

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^\d.]/g, '').trim());
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return undefined;
}

function toPositiveInt(value: unknown): number | undefined {
  return parsePositiveInt(value);
}

export function normalizeReadingAladinBook(input: unknown): ReadingAladinBook | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ReadingAladinBook>;
  const itemId = toPositiveInt(raw.itemId) ?? null;
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
