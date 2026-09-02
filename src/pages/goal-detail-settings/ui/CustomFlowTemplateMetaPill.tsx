import { StyleSheet, View } from 'react-native';

import {
  resolveAppliedCustomFlowTemplateLabel,
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  dataConfig: unknown;
  ink: string;
  line: string;
};

export function CustomFlowTemplateMetaPill({ dataConfig, ink, line }: Props) {
  const { t } = useTranslation();
  const templateKey = resolveCustomFlowTemplateKey(dataConfig);
  const label = resolveAppliedCustomFlowTemplateLabel(templateKey);

  return (
    <View style={[styles.pill, { borderColor: line }]}>
      <ThemedText style={[styles.text, { color: ink }]}>
        {t('goalDetail.routineMode', { label })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
