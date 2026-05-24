import { Redirect } from 'expo-router';

/**
 * 루트(/)로 앱이 열릴 때는 바로 새 플로우(day-plan) 화면으로 진입한다.
 * `pokit://activity-session?...` 같은 딥링크는 이 화면을 거치지 않고 해당 스크린이 연다.
 */
export default function RootIndex() {
  return <Redirect href="/day-plan" />;
}
