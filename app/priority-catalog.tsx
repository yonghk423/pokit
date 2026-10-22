import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';

/** 레거시 「나만의 루틴」탭 → 루틴 탭 서브섹션으로 리다이렉트 */
export default function PriorityCatalogTabScreen() {
  if (!FEATURE_FLAGS.routinesManageTab) return <Redirect href="/(tabs)/day-plan" />;
  return <Redirect href={{ pathname: '/(tabs)/fixed-routines', params: { section: 'myRoutines' } }} />;
}
