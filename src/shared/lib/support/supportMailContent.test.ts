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

describe('supportMailContent platform branches', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
    jest.dontMock('expo-device');
  });

  it('formats android device line', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android', Version: 34 },
    }));
    jest.doMock('expo-device', () => ({
      manufacturer: 'Google',
      modelName: 'Pixel 8',
      osName: 'Android',
      osVersion: '14',
    }));
    jest.doMock('expo-application', () => ({ nativeApplicationVersion: '1.1.8' }));
    jest.doMock('expo-constants', () => ({ expoConfig: { version: '1.1.8' } }));

    const { getSupportMailBody } = require('./supportMailContent');
    expect(getSupportMailBody()).toContain('기기: Google Pixel 8');
  });

  it('falls back to model id when ios name is missing', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios', Version: '17.0' },
    }));
    jest.doMock('expo-device', () => ({
      modelId: 'iPhone16,1',
      modelName: null,
      osName: 'iOS',
      osVersion: '17.0',
    }));
    jest.doMock('expo-application', () => ({ nativeApplicationVersion: null }));
    jest.doMock('expo-constants', () => ({ expoConfig: { version: '1.1.8' } }));

    const { getSupportMailBody } = require('./supportMailContent');
    expect(getSupportMailBody()).toContain('기기: iPhone16,1');
    expect(getSupportMailBody()).toContain('App 버전: 1.1.8');
  });
});
