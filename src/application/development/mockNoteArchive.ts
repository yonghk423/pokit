import { getDevelopmentStorageProfile, localStorageClient } from '@shared/lib/storage/localStorageClient';

/** Full-year, scrollable fixtures, exclusively in the selected mock profile. */
export function ensureMockNoteArchive(date: string): boolean {
  if (!__DEV__ || !getDevelopmentStorageProfile()) return false;
  const year = Number(date.slice(0, 4));
  if (!Number.isInteger(year)) return false;
  const marker = `pokit:mock-note-archive-v1:${year}`;
  if (localStorageClient.getItemRaw(marker)) return false;
  const paragraphs = [
    'The morning light fell across the kitchen table. I made coffee and took a few quiet minutes before looking at my phone. There was nothing urgent about this small moment, and that was exactly what I needed.',
    'On the way out, I noticed a tiny flower growing beside the steps. I have walked past this spot so many times without seeing it. Today I stopped, looked closely, and decided to take the longer route through the park.',
    'Work moved at its usual pace, with messages, little questions, and one task that took longer than expected. I wrote down what mattered, finished one thing at a time, and remembered to step outside for lunch.',
    'In the afternoon a friend sent a message about a book we both liked. We made a plan to meet soon. It felt good to have something simple to look forward to, without turning it into another item on a list.',
    'The walk home was cooler than I expected. I passed the bakery, listened to the traffic fading behind me, and watched the windows light up along the street. The day already felt different when I looked back at it.',
    'For dinner I cooked something familiar and put on an old playlist. After washing the dishes, I left the evening open. There was time to read, stretch, and enjoy a room with no particular plans in it.',
    'Before going to bed, I wrote down three things I wanted to remember: a kind conversation, a little progress, and the feeling of slowing down. Not every day needs a big story to be worth keeping.',
    'Tomorrow I would like to carry this same gentleness with me. I can begin again without rushing. For now, these pages are enough: a few ordinary details, saved so I can find them later.',
  ];
  for (const targetYear of [year, year - 1]) {
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${targetYear}-${String(month).padStart(2, '0')}`;
      const notes = [
        { key: `pokit:monthly-album-note:${monthKey}`, text: `A month of small moments — ${monthKey}\n\n${paragraphs.join('\n\n')}` },
        ...Array.from({ length: 12 }, (_, index) => ({
          key: `pokit:canvas-note:${monthKey}-${String(index * 2 + 1).padStart(2, '0')}`,
          text: `A quiet day — ${monthKey}-${String(index * 2 + 1).padStart(2, '0')}\n\n${[...paragraphs.slice(index % 4), ...paragraphs.slice(0, index % 4)].join('\n\n')}`,
        })),
      ];
      for (const note of notes) {
        // Preserve existing documents, including intentionally cleared mock notes.
        if (localStorageClient.getItemRaw(note.key) !== null || localStorageClient.getItemRaw(note.key + ':inline') !== null || localStorageClient.getItemRaw(note.key + ':illustrations') !== null) continue;
        localStorageClient.setItemRaw(note.key, note.text);
      }
    }
  }
  localStorageClient.setItemRaw(marker, 'seeded');
  return true;
}
