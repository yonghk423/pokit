import { Alert } from 'react-native';

import { localStorageClient } from '@shared/lib/storage/localStorageClient';

const NOTICE_KEY = 'pokit:hero-photo-use-notice';
const NOTICE_VERSION = 1;

type NoticeCopy = {
  title: string;
  message: string;
  cancel: string;
  continue: string;
};

/** Records only that the notice was read, not age or verified parental consent. */
export async function requestHeroPhotoUseNotice(copy: NoticeCopy): Promise<boolean> {
  const acknowledgment = localStorageClient.getJson<{ version?: number }>(NOTICE_KEY);
  if (acknowledgment?.version === NOTICE_VERSION) return true;

  return new Promise(resolve => {
    Alert.alert(copy.title, copy.message, [
      { text: copy.cancel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: copy.continue,
        onPress: () => {
          localStorageClient.setJson(NOTICE_KEY, {
            version: NOTICE_VERSION,
            acknowledgedAt: new Date().toISOString(),
          });
          resolve(true);
        },
      },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
