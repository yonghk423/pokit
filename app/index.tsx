import { Redirect } from 'expo-router';
import { useState } from 'react';

import { claimTutorialAutoOpen, loadServiceTutorial } from '@pages/welcome-intro';

/**
 * 루트(/)로 앱이 열릴 때는 바로 주인공(comic-day) 화면으로 진입한다.
 * 첫 실행 튜토리얼이 남아 있으면 오늘 화면을 거치지 않고 인트로부터 연다.
 * `pokit://activity-session?...` 같은 딥링크는 이 화면을 거치지 않고 해당 스크린이 연다.
 */
export default function RootIndex() {
  const [openIntro] = useState(() => !loadServiceTutorial().dismissed && claimTutorialAutoOpen());
  return <Redirect href={openIntro ? '/welcome-intro' : '/(tabs)/comic-day'} />;
}
