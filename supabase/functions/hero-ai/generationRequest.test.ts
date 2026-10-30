import { ACCENT_COLORS, generationRequest } from './generationRequest';
const originalFormData = global.FormData;
class CapturedFormData {
  values = new Map<string, unknown>();
  images: { value: unknown; name?: string }[] = [];
  set(key: string, value: unknown) { this.values.set(key, value); }
  append(key: string, value: unknown, name?: string) { if (key === 'image[]') this.images.push({ value, name }); }
}
beforeEach(() => { global.FormData = CapturedFormData as never; });
afterEach(() => { global.FormData = originalFormData; });
it('sends only the source in whole-photo mode even if an old client sends a person reference', () => {
  const source = {} as Blob;
  const oldReference = {} as Blob;
  const request = generationRequest('photo', source, oldReference) as unknown as CapturedFormData;
  expect(request.images).toEqual([{ value: source, name: 'source.jpg' }]);
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('If the source contains no people, the result must contain no people');
  expect(prompt).toContain('sole authority for content');
  expect(prompt).not.toContain('gentle simplified everyday manga face');
});
it('retains two separate images for face replacement only', () => {
  const source = {} as Blob;
  const reference = {} as Blob;
  const request = generationRequest('face', source, reference) as unknown as CapturedFormData;
  expect(request.images).toEqual([{ value: source, name: 'source.jpg' }, { value: reference, name: 'person-reference.jpg' }]);
  expect(request.values.get('prompt')).toContain('Change ONLY the protagonist face and hair');
  expect(() => generationRequest('face', source)).toThrow('invalid_image');
});

it('uses the diary to create a new scene with the default character instead of preserving the old background', () => {
  const request = generationRequest('photo', {} as Blob, undefined, { text: '비 오는 날 카페에서 책을 읽었다.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(1);
  expect(request.values.get('prompt')).toContain('NEW composition');
  expect(request.values.get('prompt')).toContain('비 오는 날 카페에서 책을 읽었다.');
  expect(request.values.get('prompt')).not.toContain('Change only the rendering style');
});
it('uses the saved face as identity while generating the scene from writing', () => {
  const request = generationRequest('face', {} as Blob, {} as Blob, { text: 'I walked beside the sea.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(2);
  expect(request.values.get('prompt')).toContain('person identity reference');
  expect(request.values.get('prompt')).not.toContain('Keep body, clothing, pose');
});
it('keeps photo composition even when writing describes a different scene', () => {
  const request = generationRequest('photo', {} as Blob, undefined, { text: 'I worked at a cafe with a laptop.', source: 'photo' }) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(1);
  expect(request.values.get('prompt')).toContain('PHOTO STYLE TRANSFER ONLY');
  expect(request.values.get('prompt')).toContain('sole authority for content');
  expect(request.values.get('prompt')).not.toContain('<diary>');
  expect(request.values.get('prompt')).not.toContain('I worked at a cafe with a laptop.');
  expect(request.values.get('prompt')).not.toContain('depicting the concrete events');
  expect(request.values.get('prompt')).not.toContain('female protagonist identity');
});

it.each([
  ['photo', undefined, { text: '가족들과 식사를 해서 행복하다', source: 'character' as const }],
  ['face', {} as Blob, { text: '친구들과 카페에 갔다', source: 'character' as const }],
  ['face', {} as Blob, undefined],
])('enforces one accent and no third parties in %s mode', (mode, reference, story) => {
  const request = generationRequest(mode, {} as Blob, reference, story) as unknown as CapturedFormData;
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('Use exactly ONE chromatic accent hue:');
  expect(prompt).toContain('The accent is REQUIRED');
  expect(prompt).toContain('exactly one small focal object');
  expect(prompt).toContain('NEVER depict third parties');
  expect(prompt).toContain('show the protagonist alone');
  expect(prompt).not.toContain('sparse olive accents');
  expect(prompt).not.toContain('preserve their number');
});

it('specifies fine reference-matched strokes instead of heavy contours', () => {
  const request = generationRequest('photo', {} as Blob, undefined, { text: 'Reading.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.values.get('prompt')).toContain('very fine, light, airy linework');
  expect(request.values.get('prompt')).toContain('closely match its line thickness');
  expect(request.values.get('prompt')).toContain('No heavy cross-hatching');
});

it.each([undefined, { text: '가족 사진', source: 'photo' as const }])('preserves every original person in photo mode with story %s', story => {
  const source = {} as Blob;
  const request = generationRequest('photo', source, undefined, story) as unknown as CapturedFormData;
  const prompt = request.values.get('prompt') as string;
  expect(request.images).toEqual([{ value: source, name: 'source.jpg' }]);
  expect(prompt).toContain('PRESERVE ALL ORIGINAL PEOPLE');
  expect(prompt).toContain('Preserve their number');
  expect(prompt).not.toContain('NEVER depict third parties');
  expect(prompt).not.toContain('Remove other people');
  expect(prompt).not.toContain('removal of third parties');
  expect(prompt).toContain('Use exactly ONE chromatic accent hue:');
});

it('preserves all photo subjects and sends the selected drawing as style only', () => {
  const photo = {} as Blob, style = {} as Blob;
  const request = generationRequest('photo', photo, style, { text: 'Friends.', source: 'photo' }) as unknown as CapturedFormData;
  expect(request.images).toEqual([{ value: photo, name: 'source.jpg' }, { value: style, name: 'style-reference.jpg' }]);
  expect(request.values.get('prompt')).toContain('PRESERVE ALL ORIGINAL PEOPLE');
  expect(request.values.get('prompt')).toContain('Image2 controls rendering style');
  expect(request.values.get('prompt')).not.toContain('NEVER depict third parties');
  expect(request.values.get('prompt')).toContain('Use exactly ONE chromatic accent hue');
});

it.each(['photo', 'face'])('locks text scenes to the actual selected style in %s transport mode', mode => {
  const style = {} as Blob, person = mode === 'face' ? {} as Blob : undefined;
  const request = generationRequest(mode, style, person, { text: 'A quiet walk.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.images[0].value).toBe(style);
  expect(request.values.get('prompt')).toContain('SELECTED PROTAGONIST1 STYLE LOCK');
  expect(request.values.get('prompt')).toContain('Image1 controls how everything is drawn');
  expect(request.values.get('prompt')).toContain('Image2 is present it supplies person identity only');
  expect(request.values.get('prompt')).toContain('NEVER depict third parties');
});

it('offers thirty distinct accent colors', () => {
  expect(ACCENT_COLORS).toHaveLength(30);
  expect(new Set(ACCENT_COLORS).size).toBe(30);
});
