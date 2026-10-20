const mockLoadAsync = jest.fn();
jest.mock('expo-image', () => ({ Image: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) } }));

beforeEach(() => { jest.resetModules(); mockLoadAsync.mockReset(); });

it('prepares each texture once and retains decoded images across repeated openings', async () => {
  const pigment = { nativeImage: 'pigment' };
  const paper = { nativeImage: 'paper' };
  mockLoadAsync.mockResolvedValueOnce(pigment).mockResolvedValueOnce(paper);
  const cache = jest.requireActual<typeof import('./textureCache')>('./textureCache');
  const first = cache.prepareSurfaceTextures();
  expect(cache.prepareSurfaceTextures()).toBe(first);
  await first;
  expect(mockLoadAsync).toHaveBeenCalledTimes(2);
  expect(cache.getPreparedSurfaceTexture('pigment')).toBe(pigment);
  expect(cache.getPreparedSurfaceTexture('paper')).toBe(paper);
  await cache.prepareSurfaceTextures();
  expect(mockLoadAsync).toHaveBeenCalledTimes(2);
});

it('keeps a usable local fallback and retries a failed decode without reloading successful textures', async () => {
  mockLoadAsync.mockRejectedValueOnce(new Error('asset unavailable')).mockResolvedValueOnce({ nativeImage: 'paper' });
  const cache = jest.requireActual<typeof import('./textureCache')>('./textureCache');
  await cache.prepareSurfaceTextures();
  expect(cache.getPreparedSurfaceTexture('pigment')).toBe(cache.SURFACE_TEXTURE_SOURCES.pigment);
  const pigment = { nativeImage: 'pigment' };
  mockLoadAsync.mockResolvedValueOnce(pigment);
  await cache.prepareSurfaceTextures();
  expect(mockLoadAsync).toHaveBeenCalledTimes(3);
  expect(cache.getPreparedSurfaceTexture('pigment')).toBe(pigment);
});
