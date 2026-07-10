export type ReadingOpenLibraryBook = {
  workKey: string;
  editionKey?: string;
  link: string;
  coverUrl: string;
  author: string;
  /** edition number_of_pages 또는 search median */
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

function normalizeEditionKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('/') ? trimmed : `/books/${trimmed.replace(/^\/books\//, '')}`;
}

export function normalizeReadingOpenLibraryBook(input: unknown): ReadingOpenLibraryBook | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ReadingOpenLibraryBook>;
  const workKey = clampText(raw.workKey, 120);
  const link = clampText(raw.link, 500);
  if (!workKey || link.length === 0) return null;

  return {
    workKey,
    editionKey: normalizeEditionKey(raw.editionKey),
    link,
    coverUrl: clampText(raw.coverUrl, 500),
    author: clampText(raw.author, 120),
    totalPages: toPositiveInt(raw.totalPages),
  };
}
