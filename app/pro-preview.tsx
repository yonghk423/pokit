import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { ProPreviewPage } from '@pages/settings';

export default function ProPreviewRoute() {
  return FEATURE_FLAGS.proSubscriptions ? <ProPreviewPage /> : <Redirect href="/" />;
}
