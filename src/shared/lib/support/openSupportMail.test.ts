import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import { Alert, Linking, Share } from 'react-native';

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

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  Share: { share: jest.fn() },
}));

jest.mock('expo-mail-composer');
jest.mock('expo-clipboard');

import { openSupportMailComposer } from './openSupportMail';

const mockIsAvailableAsync = MailComposer.isAvailableAsync as jest.MockedFunction<
  typeof MailComposer.isAvailableAsync
>;
const mockComposeAsync = MailComposer.composeAsync as jest.MockedFunction<
  typeof MailComposer.composeAsync
>;
const mockSetStringAsync = Clipboard.setStringAsync as jest.MockedFunction<
  typeof Clipboard.setStringAsync
>;

describe('openSupportMailComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockComposeAsync.mockResolvedValue({ status: 'sent' });
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
    (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });
    mockSetStringAsync.mockResolvedValue(undefined);
  });

  it('falls back to mailto when composer is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    await openSupportMailComposer();
    expect(mockComposeAsync).not.toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
  });

  it('falls back to mailto when composer throws', async () => {
    mockIsAvailableAsync.mockRejectedValue(new Error('native'));
    await openSupportMailComposer();
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
  });

  it('shows alert fallback when mailto fails', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('no mail'));
    await openSupportMailComposer();
    expect(Alert.alert).toHaveBeenCalledWith(
      '메일을 바로 열 수 없어요',
      expect.any(String),
      expect.any(Array),
    );
  });

  it('shares support mail content from fallback alert', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('no mail'));

    await openSupportMailComposer();
    const buttons = (Alert.alert as jest.Mock).mock.calls[0]![2] as Array<{
      text: string;
      onPress?: () => void | Promise<void>;
    }>;
    const shareBtn = buttons.find((b) => b.text === '공유하기');
    await Promise.resolve(shareBtn?.onPress?.());
    expect(Share.share).toHaveBeenCalled();
  });

  it('shows copy failure alert when clipboard throws', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('no mail'));
    mockSetStringAsync.mockRejectedValue(new Error('no clipboard'));

    await openSupportMailComposer();
    const buttons = (Alert.alert as jest.Mock).mock.calls[0]![2] as Array<{
      text: string;
      onPress?: () => void | Promise<void>;
    }>;
    const copyBtn = buttons.find((b) => b.text === '주소 복사');
    await Promise.resolve(copyBtn?.onPress?.());
    await Promise.resolve();
    expect(Alert.alert).toHaveBeenCalledWith('복사 실패', expect.stringContaining('@'));
  });
});
