import { Alert } from 'react-native';

import { localStorageClient } from '@shared/lib/storage/localStorageClient';

import { requestHeroPhotoUseNotice } from './heroPhotoUseNotice';

jest.mock('@shared/lib/storage/localStorageClient', () => ({
  localStorageClient: { getJson: jest.fn(), setJson: jest.fn() },
}));

const copy = { title: 'Photo notice', message: 'Read before choosing a photo.', cancel: 'Cancel', continue: 'Continue' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(localStorageClient.getJson).mockReturnValue(null);
});

afterEach(() => jest.restoreAllMocks());

it('does not treat cancellation or dismissal as acknowledgment', async () => {
  for (const dismiss of [false, true]) {
    const pending = requestHeroPhotoUseNotice(copy);
    const call = jest.mocked(Alert.alert).mock.calls.at(-1)!;
    if (dismiss) call[3]?.onDismiss?.();
    else call[2]?.[0].onPress?.();
    await expect(pending).resolves.toBe(false);
  }
  expect(localStorageClient.setJson).not.toHaveBeenCalled();
});

it('remembers an explicit acknowledgment without recording age or parental consent', async () => {
  const pending = requestHeroPhotoUseNotice(copy);
  jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress?.();
  await expect(pending).resolves.toBe(true);
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:hero-photo-use-notice', {
    version: 1,
    acknowledgedAt: expect.any(String),
  });
});

it('does not show the notice again for the acknowledged version', async () => {
  jest.mocked(localStorageClient.getJson).mockReturnValue({ version: 1 });
  await expect(requestHeroPhotoUseNotice(copy)).resolves.toBe(true);
  expect(Alert.alert).not.toHaveBeenCalled();
});
