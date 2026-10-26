const mockLoadAsync = jest.fn();
jest.mock('expo-image', () => ({ Image: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) } }));
beforeEach(() => { jest.resetModules(); mockLoadAsync.mockReset(); });

it('shares one decoded bitmap across both illustrations and repeated tab visits', async () => {
  const image = { nativeImage: 'approved-rhythm-artwork' };
  mockLoadAsync.mockResolvedValue(image);
  const cache = jest.requireActual<typeof import('./mateArtworkCache')>('./mateArtworkCache');
  const preparing = cache.prepareRhythmArtwork();
  expect(cache.prepareRhythmArtwork()).toBe(preparing);
  await preparing;
  expect(cache.getPreparedRhythmArtwork()).toBe(image);
  await cache.prepareRhythmArtwork();
  expect(cache.getPreparedRhythmArtwork()).toBe(image);
  expect(mockLoadAsync).toHaveBeenCalledTimes(1);
});

it('keeps the bundled image usable after a failed warmup and allows retry', async () => {
  mockLoadAsync.mockRejectedValueOnce(new Error('asset unavailable'));
  const cache = jest.requireActual<typeof import('./mateArtworkCache')>('./mateArtworkCache');
  await cache.prepareRhythmArtwork();
  expect(cache.getPreparedRhythmArtwork()).toBe(cache.RHYTHM_ARTWORK_SOURCE);
  const image = { nativeImage: 'retried' };
  mockLoadAsync.mockResolvedValueOnce(image);
  await cache.prepareRhythmArtwork();
  expect(cache.getPreparedRhythmArtwork()).toBe(image);
  expect(mockLoadAsync).toHaveBeenCalledTimes(2);
});
