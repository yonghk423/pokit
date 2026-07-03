import { compareAppVersions } from './compareAppVersions';

describe('compareAppVersions', () => {
  it('compares major.minor.patch', () => {
    expect(compareAppVersions('1.4.2', '1.4.1')).toBe(1);
    expect(compareAppVersions('1.4.2', '1.4.2')).toBe(0);
    expect(compareAppVersions('1.3.9', '1.4.0')).toBe(-1);
  });

  it('treats missing patch as zero', () => {
    expect(compareAppVersions('1.4', '1.4.0')).toBe(0);
    expect(compareAppVersions('2.0', '1.9.9')).toBe(1);
  });
});
