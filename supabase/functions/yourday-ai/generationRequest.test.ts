import { ACCENT_COLORS, generationRequest, validateStory } from './generationRequest';
const originalFormData = global.FormData;
class CapturedFormData {
  values = new Map<string, unknown>();
  images: { value: unknown; name?: string }[] = [];
  set(key: string, value: unknown) { this.values.set(key, value); }
  append(key: string, value: unknown, name?: string) { if (key === 'image[]') this.images.push({ value, name }); }
}
beforeEach(() => { global.FormData = CapturedFormData as never; });
afterEach(() => { global.FormData = originalFormData; });
it.each(['protagonist-3', 'protagonist-4'] as const)('pins %s to the approved painted reference for existing clients', styleId => {
  const wrongStyle = {} as Blob, identity = {} as Blob;
  const request = generationRequest('face', wrongStyle, identity, { text: 'A new day', source: 'character', styleId }) as unknown as CapturedFormData;
  expect(request.images[0].value).not.toBe(wrongStyle);
  expect(request.images[0].value).toEqual(expect.objectContaining({ type: 'image/jpeg' }));
  expect((request.images[0].value as Blob).size).toBeGreaterThan(10000);
  expect(request.images[1].value).toBe(identity);
  expect(request.images).toHaveLength(4);
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('APPROVED MATTE GOUACHE STYLE');
  expect(prompt).toContain('two or three value groups');
  expect(prompt).toContain('Do not render a realistic scene and merely overlay paper grain');
  expect(prompt).toContain('Image2 is the identity photograph only');
  expect(prompt).toContain('not a uniform sandy, dirty or mottled overlay');
});

it('replaces only the photo style reference, preserving photo content and framing', () => {
  const photo = {} as Blob, wrongStyle = {} as Blob;
  const request = generationRequest('photo', photo, wrongStyle, { text: 'Photo', source: 'photo', styleId: 'protagonist-4' }) as unknown as CapturedFormData;
  expect(request.images[0].value).toBe(photo);
  expect(request.images[1].value).not.toBe(wrongStyle);
  expect((request.images[1].value as Blob).type).toBe('image/jpeg');
  expect(request.images).toHaveLength(4);
  expect(request.values.get('prompt')).toContain('Preserve the original framing');
});
it('uses three painted samples for character generation without treating a style sample as a person photo', () => {
  const request = generationRequest('photo', {} as Blob, undefined, { text: '지각 했다!!!!', source: 'character', styleId: 'protagonist-4' }) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(3);
  expect(request.images.every(image => (image.value as Blob).type === 'image/jpeg')).toBe(true);
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('ALL three attached images are illustrations');
  expect(prompt).not.toContain('When Image2 is present it supplies person identity only');
  expect(prompt).toContain('clean large angular painted planes');
});
it('validates the selected style and carries the fifth palette and full silhouette into generation', () => {
  const story = validateStory({ text: '공항에서 기다렸다.', source: 'character', styleId: 'protagonist-5' })!;
  expect(story.styleId).toBe('protagonist-5');
  expect(() => validateStory({ text: 'Story', source: 'character', styleId: 'unknown' })).toThrow('invalid_request');
  const request = generationRequest('photo', {} as Blob, undefined, story) as unknown as CapturedFormData;
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('SELECTED STYLE protagonist-5');
  expect(prompt).toContain('ONE restrained muted rust/terracotta accent');
  expect(prompt).toContain('large flat solid black geometric shadows');
  expect(prompt).toContain('complete silhouette, head, both feet');
  expect(prompt).toContain('no more than 65%');
  expect(prompt).toContain('curvy hourglass figure');
  expect(prompt).toContain('fuller bust, defined waist and fuller hips');
  expect(prompt).toContain('adult female protagonist in her twenties');
});

it('applies the selected fifth style to photos while preserving their original framing', () => {
  const request = generationRequest('photo', {} as Blob, {} as Blob, { text: 'Photo', source: 'photo', styleId: 'protagonist-5' }) as unknown as CapturedFormData;
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('SELECTED STYLE protagonist-5');
  expect(prompt).toContain('Preserve the original framing');
  expect(prompt).not.toContain('FINAL FRAMING REQUIREMENT');
  expect(prompt).not.toContain('CHARACTER BUILD');
});
it('pins protagonist-6 scene generation to its single approved painted style reference', () => {
  const story = validateStory({ text: '퇴근길 신호등 앞에서 잠시 멈췄다.', source: 'character', styleId: 'protagonist-6' })!;
  const request = generationRequest('photo', {} as Blob, undefined, story) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(1);
  expect(request.images[0].name).toBe('source.jpg');
  const reference = request.images[0].value as Blob;
  expect(reference.type).toBe('image/jpeg');
  expect(reference.size).toBeGreaterThan(10000);
  expect(request.values.get('prompt')).toContain('SELECTED STYLE protagonist-6');
  expect(request.values.get('prompt')).toContain('single approved protagonist-6 illustration');
  expect(request.values.get('prompt')).toContain('quiet matte painted planes');
  expect(request.values.get('prompt')).toContain('Image1 controls how everything is drawn');
  expect(request.values.get('prompt')).not.toContain('ALL three attached images');
  expect(request.values.get('prompt')).not.toContain('two or three value groups');
  expect(request.values.get('prompt')).not.toContain('ONE restrained muted rust/terracotta accent');
});
it('describes protagonist-6 face generation using only the style and identity images actually attached', () => {
  const identity = {} as Blob;
  const request = generationRequest('face', {} as Blob, identity, { text: 'A new day.', source: 'character', styleId: 'protagonist-6' }) as unknown as CapturedFormData;
  expect(request.images).toHaveLength(2);
  expect(request.images[0].value).not.toBe(identity);
  expect(request.images[1].value).toBe(identity);
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('Image1 is the single approved protagonist-6 illustration');
  expect(prompt).toContain('Image2 is the identity photograph only');
  expect(prompt).not.toContain('Images3–4');
});
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
])('preserves the selected palette and excludes third parties in %s mode', (mode, reference, story) => {
  const request = generationRequest(mode, {} as Blob, reference, story) as unknown as CapturedFormData;
  const prompt = request.values.get('prompt') as string;
  expect(prompt).toContain('REFERENCE PALETTE');
  expect(prompt).not.toContain('Use exactly ONE chromatic accent hue:');
  expect(prompt).toContain('preserve those characteristics');
  expect(prompt).toContain('NEVER depict third parties');
  expect(prompt).toContain('show the protagonist alone');
  expect(prompt).not.toContain('sparse olive accents');
  expect(prompt).not.toContain('preserve their number');
});

it('specifies fine reference-matched strokes instead of heavy contours', () => {
  const request = generationRequest('photo', {} as Blob, undefined, { text: 'Reading.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.values.get('prompt')).toContain('A delicate ink reference must retain its light lines and open paper areas');
  expect(request.values.get('prompt')).toContain('line thickness, stroke density');
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
  expect(request.values.get('prompt')).toContain('REFERENCE PALETTE');
  expect(request.values.get('prompt')).not.toContain('Use exactly ONE chromatic accent hue');
});

it.each(['photo', 'face'])('locks text scenes to the actual selected style in %s transport mode', mode => {
  const style = {} as Blob, person = mode === 'face' ? {} as Blob : undefined;
  const request = generationRequest(mode, style, person, { text: 'A quiet walk.', source: 'character' }) as unknown as CapturedFormData;
  expect(request.images[0].value).toBe(style);
  expect(request.values.get('prompt')).toContain('SELECTED ILLUSTRATION STYLE LOCK');
  expect(request.values.get('prompt')).toContain('Image1 controls how everything is drawn');
  expect(request.values.get('prompt')).toContain('When a separate person identity photograph is supplied it supplies identity only');
  expect(request.values.get('prompt')).toContain('NEVER depict third parties');
});

it('offers thirty distinct accent colors', () => {
  expect(ACCENT_COLORS).toHaveLength(30);
  expect(new Set(ACCENT_COLORS).size).toBe(30);
});


it('retains the title through server validation and includes a general scene brief alongside the diary', () => {
  const story = validateStory({ title: ' 하이록수 ', text: '대회가 얼마 안 남았다. 잘할 수 있을까', source: 'character' });
  expect(story?.title).toBe('하이록수');
  const request = generationRequest('face', {} as Blob, {} as Blob, story, 'Prepare for a fitness race by running in a gym.') as unknown as CapturedFormData;
  expect(request.values.get('prompt')).toContain('하이록수');
  expect(request.values.get('prompt')).toContain('running in a gym');
  expect(request.values.get('prompt')).not.toContain('TERMINOLOGY CONTEXT');
  expect(request.values.get('prompt')).toContain('WIDE FULL-BODY COMPOSITION');
  expect(request.values.get('prompt')).toContain('head to feet');
});
it('applies event inference to general diary writing but preserves photo framing', () => {
  const story = { title: '클라이밍', text: '처음이라 긴장했다', source: 'character' as const };
  const request = generationRequest('photo', {} as Blob, undefined, validateStory(story)) as unknown as CapturedFormData;
  expect(request.values.get('prompt')).toContain('EVENT-FIRST SCENE INTERPRETATION');
  expect(request.values.get('prompt')).toContain('클라이밍');
  expect(request.values.get('prompt')).not.toContain('TERMINOLOGY CONTEXT');
  const photo = generationRequest('photo', {} as Blob, undefined, { ...story, source: 'photo' }) as unknown as CapturedFormData;
  expect(photo.values.get('prompt')).not.toContain('WIDE FULL-BODY COMPOSITION');
  expect(photo.values.get('prompt')).not.toContain('EVENT-FIRST SCENE INTERPRETATION');
  expect(photo.values.get('prompt')).toContain('Preserve the original framing');
});
it('accepts legacy stories and rejects invalid optional titles', () => {
  expect(validateStory({ text: '산책', source: 'character' })).toEqual({ text: '산책', source: 'character' });
  expect(() => validateStory({ title: {}, text: '산책', source: 'character' })).toThrow('invalid_request');
  expect(() => validateStory({ title: 'a'.repeat(81), text: '산책', source: 'character' })).toThrow('invalid_request');
});

it.each([
  ['photo', undefined, { text: 'Walk.', source: 'character' as const }],
  ['face', {} as Blob, { text: 'Walk.', source: 'character' as const }],
  ['photo', {} as Blob, { text: 'Friends.', source: 'photo' as const }],
  ['face', {} as Blob, undefined],
])('does not override a selected colored illustration in %s mode', (mode, reference, story) => {
  const form = generationRequest(mode, {} as Blob, reference, story) as unknown as CapturedFormData;
  const prompt = form.values.get('prompt') as string;
  expect(prompt).toContain('A colorful painted reference must remain colorful and painted');
  expect(prompt).toContain('palette and color coverage');
  expect(prompt).not.toContain('SINGLE ACCENT COLOR:');
  expect(prompt).not.toContain('Ignore other colors in the input images');
  expect(prompt).not.toContain('monochrome black ink rendering');
  expect(prompt).not.toContain('PROTAGONIST1');
});

it('accepts a title-only text illustration while rejecting blank drafts', () => {
  expect(validateStory({ title: ' 겨울에는 귤이지 ', text: '', source: 'character' })).toEqual({ title: '겨울에는 귤이지', text: '', source: 'character' });
  expect(() => validateStory({ title: ' ', text: ' ', source: 'character' })).toThrow('invalid_request');
  expect(validateStory({ title: '겨울에는 귤이지', text: '', source: 'photo' })).toEqual({ title: '겨울에는 귤이지', text: '', source: 'photo' });
  expect(() => validateStory({ title: ' ', text: ' ', source: 'photo' })).toThrow('invalid_request');
});
