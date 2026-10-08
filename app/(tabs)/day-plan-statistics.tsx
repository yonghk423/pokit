import { Redirect } from 'expo-router';

/** 레거시 딥링크 — 루틴 탭 안 히스토리 섹션으로 보낸다. */
export default function DayPlanStatisticsTab() {
  return <Redirect href="/(tabs)/fixed-routines?section=history" />;
}
