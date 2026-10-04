import {
  AppUpdateAvailableModal,
  useAppUpdateAvailable,
} from '@features/app-update-available';

type Props = {
  appReady: boolean;
};

/**
 * 앱 버전 안내 호스트
 * 구버전 사용자 → 스토어 새 버전 유도
 */
export function AppUpdateNoticeHost({ appReady }: Props) {
  const updateAvailable = useAppUpdateAvailable(appReady);

  if (!updateAvailable.notice) return null;

  return (
    <AppUpdateAvailableModal
      visible={updateAvailable.visible}
      latestVersion={updateAvailable.notice.latestVersion}
      highlights={updateAvailable.notice.highlights}
      onUpdatePress={() => {
        void updateAvailable.openStore();
      }}
      onLaterPress={updateAvailable.dismissLater}
    />
  );
}
