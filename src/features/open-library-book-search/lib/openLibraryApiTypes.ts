export type OpenLibrarySearchBookItem = {
  workKey: string;
  editionKey?: string;
  title: string;
  author: string;
  coverUrl: string;
  link: string;
  publishYear?: string;
};

export type OpenLibrarySearchResult = {
  totalResults: number;
  items: OpenLibrarySearchBookItem[];
};

export type OpenLibraryBookDetail = OpenLibrarySearchBookItem & {
  totalPages?: number;
  description: string;
};

export type OpenLibraryApiErrorCode = 'NETWORK' | 'INVALID_RESPONSE';

export class OpenLibraryApiError extends Error {
  readonly code: OpenLibraryApiErrorCode;

  constructor(code: OpenLibraryApiErrorCode, message: string) {
    super(message);
    this.name = 'OpenLibraryApiError';
    this.code = code;
  }
}
