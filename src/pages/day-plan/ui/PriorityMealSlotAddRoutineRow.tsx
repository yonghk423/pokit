
import { useTranslation } from '@shared/lib/i18n';
import { SketchPaperButton } from '@shared/ui/sketch-paper-button';

type Props = {
  label?: string;
  ink: string;
  /** 호출부 호환용 (미사용) */
  line?: string;
  /** 호출부 호환용 (미사용) */
  isDark?: boolean;
  onPress: () => void;
};

/** 루틴 추가/더 추가 — 흰 종이와 연필 테두리 버튼 */
export function PriorityMealSlotAddRoutineRow({
  label,
  ink,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('dayPlan.confirmLink');

  return <SketchPaperButton label={resolvedLabel} onPress={onPress} ink={ink} labelSize={12} style={{ marginVertical: 5 }} />;
}
