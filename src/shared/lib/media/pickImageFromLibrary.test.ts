import {
  buildWorkStudyImageDestUri,
  resolveLocalImageExtension,
} from './pickImageFromLibrary';

describe('resolveLocalImageExtension', () => {
  it('keeps common image extensions', () => {
    expect(resolveLocalImageExtension('file:///tmp/photo.png')).toBe('png');
    expect(resolveLocalImageExtension('file:///tmp/photo.JPEG')).toBe('jpg');
    expect(resolveLocalImageExtension('file:///tmp/photo.heic?size=large')).toBe('heic');
  });

  it('falls back to jpg for unknown extensions', () => {
    expect(resolveLocalImageExtension('file:///tmp/photo')).toBe('jpg');
  });
});

describe('buildWorkStudyImageDestUri', () => {
  it('builds a destination path under work-study-images', () => {
    const dest = buildWorkStudyImageDestUri('file:///tmp/sample.png', 1_700_000_000_000);
    expect(dest).toContain('work-study-images/');
    expect(dest.endsWith('.png')).toBe(true);
  });
});
