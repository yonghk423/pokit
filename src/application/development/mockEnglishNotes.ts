import { readIndependentNotes, saveIndependentNotes, type CalendarNote } from '@pages/day-plan/model/calendarNotes';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

const marker = 'pokit:mock-english-independent-notes-v1';

export function seedEnglishNotes(date: string) {
  if (localStorageClient.getItemRaw(marker)) return;
  const updatedAt = new Date(date + 'T09:00:00').getTime();
  const samples: CalendarNote[] = [
    {
      id: 'mock-note:picnic', updatedAt,
      text: 'A picnic by the river\n\nMeet June by the old footbridge at noon. She’s bringing her camera. I promised sandwiches and something sweet.',
      todos: [
        { id: 'picnic-blanket', text: 'Pack the blue picnic blanket', completed: true },
        { id: 'picnic-peaches', text: 'Pick up peaches at the market', completed: false },
        { id: 'picnic-map', text: 'Send June the meeting spot', completed: false },
      ],
    },
    {
      id: 'mock-note:bookshop', updatedAt: updatedAt - 86400000,
      text: 'The bookshop on Maple Street\n\nThere’s a little shelf by the till where people leave handwritten reviews. Go back for the mystery June recommended.',
    },
    {
      id: 'mock-note:recipe', updatedAt: updatedAt - 172800000,
      text: 'Mum’s lemon cake\n\nRub the zest into the sugar first. Mum says you’ll know it’s ready when the whole kitchen smells like lemons.',
      todos: [{ id: 'cake-tin', text: 'Ask Mum what size tin she uses', completed: false }],
    },
  ];
  const existing = readIndependentNotes();
  const ids = new Set(existing.map(note => note.id));
  saveIndependentNotes([...existing, ...samples.filter(note => !ids.has(note.id))]);
  localStorageClient.setItemRaw(marker, 'seeded');
}
