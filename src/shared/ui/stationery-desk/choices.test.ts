import { ROUTINE_ACCENT_PALETTE } from '@shared/lib/routineAccentPalette';
import { isPostItFaceColorId, savePostItFaceColorForGroup, loadPostItFaceColorIdForGroup, resolvePostItFaceColor, postItFaceUsesLightInk } from '@shared/lib/storage';
import { deskInkChoices, deskPaperChoices } from './choices';

it('clears a selected paper, applies another palette color, and keeps legacy selections editable', () => {
  const onChange = jest.fn();
  const selected = deskPaperChoices('softViolet', onChange, false);
  selected.find((choice) => choice.id === 'softViolet')!.onSelect();
  expect(onChange).toHaveBeenLastCalledWith(null);
  const next = selected.find((choice) => choice.id === 'paper-9b626b')!;
  next.onSelect();
  expect(onChange).toHaveBeenLastCalledWith(next.id);
  deskPaperChoices('paper-9b626b', onChange, false).find((choice) => choice.selected)!.onSelect();
  expect(onChange).toHaveBeenLastCalledWith(null);
});

it('offers the complete former icon palette as persistable paper colors', () => {
  const choices = deskPaperChoices(null, jest.fn(), false);
  expect(choices.map((choice) => choice.color.toLowerCase())).toEqual(ROUTINE_ACCENT_PALETTE);
  for (const choice of choices) {
    expect(isPostItFaceColorId(choice.id)).toBe(true);
    if (!isPostItFaceColorId(choice.id)) throw new Error('Unknown paper color');
    savePostItFaceColorForGroup('test-palette', choice.id);
    expect(loadPostItFaceColorIdForGroup('test-palette')).toBe(choice.id);
    expect(resolvePostItFaceColor(choice.id, false).toLowerCase()).toBe(choice.color.toLowerCase());
  }
  expect(resolvePostItFaceColor('mint', false)).toBe('#A8DADC');
  expect(postItFaceUsesLightInk('paper-111417')).toBe(true);
});

it('clears the selected pen to the default ink and allows choosing it again', () => {
  const onChange = jest.fn();
  deskInkChoices('vividBlue', onChange).find(choice => choice.id === 'vividBlue')!.onSelect();
  expect(onChange).toHaveBeenLastCalledWith(null);
  deskInkChoices(null, onChange).find(choice => choice.id === 'vividBlue')!.onSelect();
  expect(onChange).toHaveBeenLastCalledWith('vividBlue');
});
