export const libraryBooksKey = 'pokit:library:books';
export type Placement = { x: number; y: number; angle: number };
export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  link?: string;
  review?: string;
  addedMonth?: string;
  aligned?: boolean;
  placement?: Placement;
  updatedAt?: number;
};
