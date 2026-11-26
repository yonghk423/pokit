import { libraryBooksKey, type Book } from '@entities/day-plan/lib/libraryBooks';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

const editions = [
  ['9780141439518', 'Pride and Prejudice', 'Jane Austen'],
  ['9780441172719', 'Dune', 'Frank Herbert'],
  ['9780393356182', 'The Overstory', 'Richard Powers'],
  ['9780062315007', 'The Alchemist', 'Paulo Coelho'],
  ['9781571313560', 'Braiding Sweetgrass', 'Robin Wall Kimmerer'],
  ['9780399588174', 'Educated', 'Tara Westover'],
  ['9780374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman'],
  ['9781616200466', 'The Drunken Botanist', 'Amy Stewart'],
  ['9780062225672', 'The Ocean at the End of the Lane', 'Neil Gaiman'],
  ['9780393327342', 'The Odyssey', 'Homer'],
  ['9780141439587', 'Emma', 'Jane Austen'],
  ['9780307474278', 'The Da Vinci Code', 'Dan Brown'],
  ['9780553293357', 'Foundation', 'Isaac Asimov'],
  ['9780307387899', 'The Road', 'Cormac McCarthy'],
  ['9780316769488', 'The Catcher in the Rye', 'J. D. Salinger'],
  ['9780143127741', 'The Body Keeps the Score', 'Bessel van der Kolk'],
  ['9780141439600', 'A Tale of Two Cities', 'Charles Dickens'],
  ['9780061120084', 'To Kill a Mockingbird', 'Harper Lee'],
  ['9780375842207', 'The Book Thief', 'Markus Zusak'],
  ['9780385490818', 'The Handmaid’s Tale', 'Margaret Atwood'],
  ['9780141439471', 'Frankenstein', 'Mary Shelley'],
  ['9780486282114', 'The Yellow Wallpaper and Other Stories', 'Charlotte Perkins Gilman'],
  ['9780141439846', 'Dracula', 'Bram Stoker'],
  ['9780141439549', 'Oliver Twist', 'Charles Dickens'],
  ['9780141439730', 'The Strange Case of Dr Jekyll and Mr Hyde and Other Tales of Terror', 'Robert Louis Stevenson'],
  ['9780345339683', 'The Hobbit', 'J. R. R. Tolkien'],
  ['9780141439556', 'Wuthering Heights', 'Emily Brontë'],
  ['9780307389732', 'The Girl with the Dragon Tattoo', 'Stieg Larsson'],
  ['9780525559474', 'The Midnight Library', 'Matt Haig'],
  ['9780062316097', 'Sapiens', 'Yuval Noah Harari'],
] as const;

export function seedEnglishBooks(date: string) {
  const marker = 'pokit:mock-english-books-v1';
  if (localStorageClient.getItemRaw(marker)) return;
  const existing = localStorageClient.getJson<Book[]>(libraryBooksKey) ?? [];
  const ids = new Set(existing.map(book => book.id));
  const samples = editions.map(([isbn, title, author], index) => {
    const month = new Date(date.slice(0, 7) + '-01T12:00:00Z');
    const monthsBack = index < 12 ? 0 : 1 + Math.floor((index - 12) / 6);
    month.setUTCMonth(month.getUTCMonth() - monthsBack);
    return { id: 'mock-book:' + isbn, title, author, addedMonth: month.toISOString().slice(0, 7),
      cover: 'https://covers.openlibrary.org/b/isbn/' + isbn + '-M.jpg?default=false' };
  });
  localStorageClient.setJson(libraryBooksKey, [...existing, ...samples.filter(book => !ids.has(book.id))]);
  localStorageClient.setItemRaw(marker, '1');
}
