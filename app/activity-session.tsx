import { ActivitySessionPage } from '@pages/activity-session';
import { AppAlertScreenBoundary } from '@shared/ui/app-alert';

export default function ActivitySessionScreen() {
  return (
    <AppAlertScreenBoundary>
      <ActivitySessionPage />
    </AppAlertScreenBoundary>
  );
}
