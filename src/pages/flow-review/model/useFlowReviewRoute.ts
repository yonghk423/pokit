import { useLocalSearchParams } from 'expo-router';

type Params = {
  startBlockId?: string;
  blockIds?: string;
};

function pickParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

function parseBlockIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const t = raw.trim();
  if (!t) return [];

  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  return t
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function useFlowReviewRoute(): {
  startBlockId: string | undefined;
  blockIds: string[];
} {
  const params = useLocalSearchParams<Params>();
  return {
    startBlockId: pickParam(params.startBlockId),
    blockIds: parseBlockIds(pickParam(params.blockIds)),
  };
}
