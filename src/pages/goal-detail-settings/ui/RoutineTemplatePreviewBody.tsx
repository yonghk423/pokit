import {
  normalizeCustomFlowDetailConfig,
  type CustomFlowTemplateKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { FastingSettings } from '@pages/goal-detail-settings/ui/category/fasting';
import { HealthIntakeSettings } from '@pages/goal-detail-settings/ui/category/health-intake';
import { CustomFlowTemplateSessionBody, type TemplateSessionTheme } from '@widgets/custom-flow-template-session';

type Props = {
  templateKey: CustomFlowTemplateKey;
  config: unknown;
  onChange: (next: unknown) => void;
  theme: TemplateSessionTheme;
  previewMode?: boolean;
  rhythmTitle?: string;
  block?: DayPlanBlock;
  sessionProgress?: number;
};

/** 루틴 템플릿 미리보기·만들기 — 건강 섭취·체중조절은 목표 상세와 같은 설정 UI */
export function RoutineTemplatePreviewBody({
  templateKey,
  config,
  onChange,
  theme,
  previewMode = false,
  rhythmTitle = '',
  block,
  sessionProgress,
}: Props) {
  if (templateKey === 'healthIntake') {
    return (
      <HealthIntakeSettings
        rhythmTitle={rhythmTitle}
        categoryKey="healthIntake"
        dataConfig={config}
        onChangeDataConfig={onChange}
        hideTitleField
      />
    );
  }
  if (templateKey === 'fasting') {
    return (
      <FastingSettings
        rhythmTitle={rhythmTitle}
        categoryKey="fasting"
        dataConfig={config}
        onChangeDataConfig={onChange}
        hideTitleField
      />
    );
  }
  return (
    <CustomFlowTemplateSessionBody
      templateKey={templateKey}
      config={config}
      onChange={(next) => onChange(normalizeCustomFlowDetailConfig(templateKey, next))}
      previewMode={previewMode}
      theme={theme}
      block={block}
      sessionProgress={sessionProgress}
    />
  );
}
