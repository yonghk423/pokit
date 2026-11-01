import { clearPokitLocalStorage, localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HERO_CHARACTER_ORDER_KEY, moveHeroCharacter, readHeroCharacterOrder, saveHeroCharacterOrder } from './heroCharacterOrder';

beforeEach(async () => { await clearPokitLocalStorage(); });
it('persists a reordered list and keeps every available protagonist', () => {
  const initial = readHeroCharacterOrder();
  const next = moveHeroCharacter(initial, initial[0], 2);
  expect(next.slice(0, 3)).toEqual([initial[1], initial[2], initial[0]]);
  expect(initial[0]).not.toBe(next[0]);
  saveHeroCharacterOrder(next);
  expect(readHeroCharacterOrder()).toEqual(next);
  expect(moveHeroCharacter(next, next[2], -10)[0]).toBe(initial[0]);
  expect(moveHeroCharacter(initial, initial[0], 100).at(-1)).toBe(initial[0]);
});
it('repairs old or invalid saved order and appends newly available characters', () => {
  const initial = readHeroCharacterOrder();
  localStorageClient.setJson(HERO_CHARACTER_ORDER_KEY, [initial[2], 'removed', initial[2]]);
  expect(readHeroCharacterOrder()).toEqual([initial[2], ...initial.filter(id => id !== initial[2])]);
  localStorageClient.setJson(HERO_CHARACTER_ORDER_KEY, { invalid: true });
  expect(readHeroCharacterOrder()).toEqual(initial);
});
