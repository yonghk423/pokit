import {
  getDisplayedAppVersionLabel,
  getSupportMailBody,
  getSupportMailSubject,
  SUPPORT_EMAIL,
} from './supportMailContent';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.1.8',
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.1.8' },
}));

jest.mock('expo-device', () => ({
  modelId: 'iPhone15,2',
  modelName: 'iPhone 15 Pro',
  manufacturer: 'Apple',
  osName: 'iOS',
  osVersion: '17.0',
}));

describe('supportMailContent', () => {
  it('exposes support email and subject', () => {
    expect(SUPPORT_EMAIL).toContain('@');
    expect(getSupportMailSubject()).toContain('POKIT');
  });

  it('builds body with device and version lines', () => {
    const body = getSupportMailBody();
    expect(body).toContain('문의 내용');
    expect(body).toContain('App 버전:');
    expect(getDisplayedAppVersionLabel()).toBe('1.1.8');
  });
});
