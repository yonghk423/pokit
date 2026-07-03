import { detectAppUpdate } from './detectAppUpdate';

describe('detectAppUpdate', () => {
  it('detects first launch', () => {
    expect(detectAppUpdate('1.4.2', null)).toEqual({
      kind: 'first_launch',
      currentVersion: '1.4.2',
    });
  });

  it('detects upgrade', () => {
    expect(detectAppUpdate('1.4.2', '1.4.1')).toEqual({
      kind: 'updated',
      currentVersion: '1.4.2',
      previousVersion: '1.4.1',
    });
  });

  it('detects no change', () => {
    expect(detectAppUpdate('1.4.2', '1.4.2')).toEqual({
      kind: 'no_change',
      currentVersion: '1.4.2',
    });
  });

  it('detects downgrade without notice', () => {
    expect(detectAppUpdate('1.4.1', '1.4.2')).toEqual({
      kind: 'downgrade',
      currentVersion: '1.4.1',
    });
  });
});
