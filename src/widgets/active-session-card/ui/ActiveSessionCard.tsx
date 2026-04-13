import { View } from 'react-native';

import type { CategoryConfigsForActiveSession } from '@entities/day-plan';
import type { LockFlowLiveActivityChecklistRow } from '@features/live-activity-sync';

import { ChecklistSessionCard } from './ChecklistSessionCard';
import { ReadingSessionCard } from './ReadingSessionCard';
import {
  FastingSessionCard,
  MedicineSessionCard,
  MeditationSessionCard,
  OtherSessionCard,
  WaterSessionCard,
  WorkSessionCard,
  YogaSessionCard,
} from './standardCategorySessionCards';

type Props = {
  segment?: 'full' | 'categoryOnly' | 'checklistOnly';
  categoryKey: string | null;
  categoryConfigs: CategoryConfigsForActiveSession;
  title: string;
  remainingSec: number;
  progressPct: number;
  isPaused: boolean;
  isWaitingToStart?: boolean;
  waitRemainingSec?: number;
  checklistTitle: string;
  checklistCountLabel: string;
  checklistRows: LockFlowLiveActivityChecklistRow[];
  checklistSummaryLine1: string;
  checklistSummaryLine2: string;
};

export function ActiveSessionCard({
  segment = 'full',
  categoryKey,
  categoryConfigs,
  title,
  remainingSec,
  progressPct,
  isPaused,
  isWaitingToStart = false,
  waitRemainingSec = 0,
  checklistTitle,
  checklistCountLabel,
  checklistRows,
  checklistSummaryLine1,
  checklistSummaryLine2,
}: Props) {
  const showCategory = segment !== 'checklistOnly';
  const showChecklist = segment !== 'categoryOnly';

  const progress01 = progressPct / 100;
  const hero = {
    remainingSec,
    progress01,
    isPaused,
    isWaitingToStart,
    waitRemainingSec,
    flowTitle: title,
  };

  const categoryBody =
    showCategory && categoryKey ? (
      <>
        {categoryKey === 'reading' && categoryConfigs.reading ? (
          <ReadingSessionCard
            title={title}
            dataConfig={categoryConfigs.reading}
            remainingSec={remainingSec}
            progressPct={progressPct}
            isPaused={isPaused}
          />
        ) : null}
        {categoryKey === 'work' && categoryConfigs.work ? (
          <WorkSessionCard data={categoryConfigs.work} {...hero} />
        ) : null}
        {categoryKey === 'meditation' && categoryConfigs.meditation ? (
          <MeditationSessionCard data={categoryConfigs.meditation} {...hero} />
        ) : null}
        {categoryKey === 'yoga' && categoryConfigs.yoga ? (
          <YogaSessionCard data={categoryConfigs.yoga} {...hero} />
        ) : null}
        {categoryKey === 'fasting' && categoryConfigs.fasting ? (
          <FastingSessionCard data={categoryConfigs.fasting} {...hero} />
        ) : null}
        {categoryKey === 'water' && categoryConfigs.water ? (
          <WaterSessionCard data={categoryConfigs.water} {...hero} />
        ) : null}
        {categoryKey === 'medicine' && categoryConfigs.medicine ? (
          <MedicineSessionCard data={categoryConfigs.medicine} {...hero} />
        ) : null}
        {categoryKey === 'other' && categoryConfigs.other ? (
          <OtherSessionCard data={categoryConfigs.other} {...hero} />
        ) : null}
      </>
    ) : null;

  return (
    <View style={{ gap: 12 }}>
      {categoryBody}
      {showChecklist ? (
        <ChecklistSessionCard
          checklistTitle={checklistTitle}
          checklistCountLabel={checklistCountLabel}
          checklistRows={checklistRows}
          checklistSummaryLine1={checklistSummaryLine1}
          checklistSummaryLine2={checklistSummaryLine2}
        />
      ) : null}
    </View>
  );
}
