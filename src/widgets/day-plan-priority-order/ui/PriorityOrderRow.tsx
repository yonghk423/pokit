import type { ComponentType } from 'react';

import {
  isCustomFlowCategoryKey,
  resolvePriorityRoutineCategoryKey,
} from '@entities/day-plan';

import type { PriorityOrderRowProps } from '../lib/types';
import { FastingPriorityOrderRow } from './categories/FastingPriorityOrderRow';
import { MedicinePriorityOrderRow } from './categories/MedicinePriorityOrderRow';
import { OtherPriorityOrderRow } from './categories/OtherPriorityOrderRow';
import { ReadingPriorityOrderRow } from './categories/ReadingPriorityOrderRow';
import { WaterPriorityOrderRow } from './categories/WaterPriorityOrderRow';
import { WorkPriorityOrderRow } from './categories/WorkPriorityOrderRow';
import { DefaultPriorityOrderRow } from './DefaultPriorityOrderRow';

const priorityOrderRowByCategoryKey: Record<string, ComponentType<PriorityOrderRowProps>> = {
  work: WorkPriorityOrderRow,
  reading: ReadingPriorityOrderRow,
  fasting: FastingPriorityOrderRow,
  healthIntake: WaterPriorityOrderRow,
  water: WaterPriorityOrderRow,
  medicine: MedicinePriorityOrderRow,
  other: OtherPriorityOrderRow,
};

/** 우선순위 목록 한 행 — 카테고리 키별 위젯으로 라우팅 (FSD: `widgets/day-plan-priority-order`) */
export function PriorityOrderRow(props: PriorityOrderRowProps) {
  const categoryKey = resolvePriorityRoutineCategoryKey(props.categoryKey);
  const Row =
    priorityOrderRowByCategoryKey[categoryKey] ??
    (isCustomFlowCategoryKey(categoryKey)
      ? OtherPriorityOrderRow
      : DefaultPriorityOrderRow);
  return <Row {...props} />;
}
