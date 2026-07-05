export type AladinSearchBookItem = {
  itemId: number;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  link: string;
  pubDate: string;
};

export type AladinSearchResult = {
  totalResults: number;
  items: AladinSearchBookItem[];
};

export type AladinBookDetail = AladinSearchBookItem & {
  totalPages?: number;
  description: string;
};

export type AladinApiErrorCode = 'MISSING_KEY' | 'NETWORK' | 'INVALID_RESPONSE';

export class AladinApiError extends Error {
  readonly code: AladinApiErrorCode;

  constructor(code: AladinApiErrorCode, message: string) {
    super(message);
    this.name = 'AladinApiError';
    this.code = code;
  }
}
