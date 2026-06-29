export type StoryRoutineArticle = {
  id: string;
  slug: string;
  url?: string;
  title: string;
  summary?: string;
  category?: string;
  categoryKey?: string;
  durationMinutes: number;
  steps?: string[];
  publishedAt?: string;
};

export type StoryRoutinePayload = {
  type: 'pokit_add_routine';
  version: number;
  source: string;
  article: StoryRoutineArticle;
  suggestedTargets?: ('today' | 'catalog')[];
  defaultTarget?: 'today' | 'catalog';
};

export function isStoryRoutinePayload(data: unknown): data is StoryRoutinePayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.type !== 'pokit_add_routine') return false;
  if (typeof d.version !== 'number') return false;

  const article = d.article;
  if (!article || typeof article !== 'object') return false;
  const a = article as Record<string, unknown>;

  return (
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    typeof a.title === 'string' &&
    a.title.length > 0 &&
    typeof a.durationMinutes === 'number' &&
    a.durationMinutes > 0
  );
}
