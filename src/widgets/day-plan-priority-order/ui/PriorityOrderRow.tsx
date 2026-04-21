import type { ComponentType } from 'react';

import type { PriorityOrderRowProps } from '../lib/types';
import { CreativePriorityOrderRow } from './categories/CreativePriorityOrderRow';
import { FastingPriorityOrderRow } from './categories/FastingPriorityOrderRow';
import { InboxPriorityOrderRow } from './categories/InboxPriorityOrderRow';
import { LanguagePriorityOrderRow } from './categories/LanguagePriorityOrderRow';
import { MedicinePriorityOrderRow } from './categories/MedicinePriorityOrderRow';
import { NeckPosturePriorityOrderRow } from './categories/NeckPosturePriorityOrderRow';
import { OtherPriorityOrderRow } from './categories/OtherPriorityOrderRow';
import { PlanningPriorityOrderRow } from './categories/PlanningPriorityOrderRow';
import { ReadingPriorityOrderRow } from './categories/ReadingPriorityOrderRow';
import { StraightenBackPriorityOrderRow } from './categories/StraightenBackPriorityOrderRow';
import { StretchingPriorityOrderRow } from './categories/StretchingPriorityOrderRow';
import { StudyPriorityOrderRow } from './categories/StudyPriorityOrderRow';
import { WaterPriorityOrderRow } from './categories/WaterPriorityOrderRow';
import { WorkPriorityOrderRow } from './categories/WorkPriorityOrderRow';
import { WritingPriorityOrderRow } from './categories/WritingPriorityOrderRow';
import { DefaultPriorityOrderRow } from './DefaultPriorityOrderRow';

const priorityOrderRowByCategoryKey: Record<string, ComponentType<PriorityOrderRowProps>> = {
  work: WorkPriorityOrderRow,
  reading: ReadingPriorityOrderRow,
  study: StudyPriorityOrderRow,
  stretching: StretchingPriorityOrderRow,
  straightenBack: StraightenBackPriorityOrderRow,
  neckPosture: NeckPosturePriorityOrderRow,
  planning: PlanningPriorityOrderRow,
  writing: WritingPriorityOrderRow,
  language: LanguagePriorityOrderRow,
  creative: CreativePriorityOrderRow,
  inbox: InboxPriorityOrderRow,
  fasting: FastingPriorityOrderRow,
  water: WaterPriorityOrderRow,
  medicine: MedicinePriorityOrderRow,
  other: OtherPriorityOrderRow,
};

/** 우선순위 목록 한 행 — 카테고리 키별 위젯으로 라우팅 (FSD: `widgets/day-plan-priority-order`) */
export function PriorityOrderRow(props: PriorityOrderRowProps) {
  const Row = priorityOrderRowByCategoryKey[props.categoryKey] ?? DefaultPriorityOrderRow;
  return <Row {...props} />;
}
