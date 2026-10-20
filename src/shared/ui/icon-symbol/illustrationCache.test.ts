import { headerIllustrationSources } from '../header-icon/sources';
import { Image } from 'expo-image';
import { getPreparedIllustration, prepareIllustrations } from './illustrationCache';
import { controlIllustrationSources } from './controlIllustrationSources';
import { routineIllustrationSources } from './routineIllustrationSources';

jest.mock('expo-image', () => ({ Image: { loadAsync: jest.fn() } }));

it('prepares each asset once, retains decoded references, and tolerates failures', async () => {
  const sources = [...new Set([...Object.values(headerIllustrationSources), ...Object.values(controlIllustrationSources), ...Object.values(routineIllustrationSources)])];
  const failed = sources[0];
  const refs = new Map(sources.map(source => [source, { nativeRef: source }]));
  jest.mocked(Image.loadAsync).mockImplementation(async source => {
    if (source === failed) throw new Error('unavailable asset');
    return refs.get(source as number) as never;
  });
  expect(getPreparedIllustration(sources[1])).toBe(sources[1]);
  const first = prepareIllustrations();
  expect(prepareIllustrations()).toBe(first);
  await first;
  expect(Image.loadAsync).toHaveBeenCalledTimes(sources.length);
  expect(getPreparedIllustration(sources[1])).toBe(refs.get(sources[1]));
  expect(getPreparedIllustration(failed)).toBe(failed);
  await prepareIllustrations();
  expect(Image.loadAsync).toHaveBeenCalledTimes(sources.length);
});
