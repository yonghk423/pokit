import { useTranslation } from '@shared/lib/i18n';
import type { PostItInkColorId } from '@shared/lib/storage';
import { PostItColorGrid } from '@shared/ui/post-it-color-palette';
import { deskInkChoices } from '@shared/ui/stationery-desk/choices';

export function FountainPenColorPalette({ value, onChange, isDark }: {
  value: PostItInkColorId | null | undefined;
  onChange: (value: PostItInkColorId | null) => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  const label = t('dayPlan.routineInkColorLabel');
  return <PostItColorGrid label={label} clearLabel={label} choices={deskInkChoices(value, onChange)} onClear={() => onChange(null)} isDark={isDark} />;
}
