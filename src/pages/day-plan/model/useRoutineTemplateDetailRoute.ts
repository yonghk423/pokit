import { useLocalSearchParams } from 'expo-router';

import { isCustomFlowTemplateKey, type CustomFlowTemplateKey } from '@entities/day-plan';

type Params = {
  templateKey?: string;
};

function pickParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export function useRoutineTemplateDetailRoute(): {
  templateKey: CustomFlowTemplateKey | null;
} {
  const params = useLocalSearchParams<Params>();
  const raw = pickParam(params.templateKey);
  return {
    templateKey: raw && isCustomFlowTemplateKey(raw) ? raw : null,
  };
}
