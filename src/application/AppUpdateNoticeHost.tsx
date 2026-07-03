import {
  AppUpdateAvailableModal,
  useAppUpdateAvailable,
} from '@features/app-update-available';
import { AppUpdateNoticeModal, useAppUpdateNotice } from '@features/app-update-notice';

type Props = {
  appReady: boolean;
};

/**
 * 앱 버전 안내 호스트
 * 1) 구버전 사용자 → 스토어 새 버전 유도
 * 2) 업데이트 직후 → 설치 완료 안내
 */
export function AppUpdateNoticeHost({ appReady }: Props) {
  const updateAvailable = useAppUpdateAvailable(appReady);
  const postUpdateEnabled = appReady && updateAvailable.resolved && !updateAvailable.visible;
  const postUpdate = useAppUpdateNotice(postUpdateEnabled);

  return (
    <>
      {updateAvailable.notice ? (
        <AppUpdateAvailableModal
          visible={updateAvailable.visible}
          latestVersion={updateAvailable.notice.latestVersion}
          highlights={updateAvailable.notice.highlights}
          onUpdatePress={() => {
            void updateAvailable.openStore();
          }}
          onLaterPress={updateAvailable.dismissLater}
        />
      ) : null}
      {postUpdate.notice ? (
        <AppUpdateNoticeModal
          visible={postUpdate.visible}
          version={postUpdate.notice.version}
          highlights={postUpdate.notice.highlights}
          onDismiss={postUpdate.dismiss}
        />
      ) : null}
    </>
  );
}
