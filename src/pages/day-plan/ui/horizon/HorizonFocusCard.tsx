import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HorizonGoalDocument } from '@shared/lib/storage/horizonGoalBlocks';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../../lib/dayPlanPalette';
import { HorizonBlockEditor } from './HorizonBlockEditor';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  strategyEyebrow: string;
  document: HorizonGoalDocument;
  onChangeDocument: (doc: HorizonGoalDocument) => void;
  syncLabel?: string;
  footerExtra?: ReactNode;
  showCompleteButton?: boolean;
  completeLabel?: string;
  completeDisabled?: boolean;
  /** 완료 취소 등 보조 액션 — outline 스타일 */
  completeTone?: 'primary' | 'ghost';
  onCompletePress?: () => void;
};

export function HorizonFocusCard({
  c,
  isDark,
  strategyEyebrow,
  document,
  onChangeDocument,
  syncLabel,
  footerExtra,
  showCompleteButton = false,
  completeLabel = '완료',
  completeDisabled = false,
  completeTone = 'primary',
  onCompletePress,
}: Props) {
  const cardBg = isDark ? c.containerLowest : '#ffffff';
  const dotOverlay = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: isDark ? c.catBorderIdle : 'rgba(0,0,0,0.03)',
          shadowColor: c.shadow,
        },
      ]}>
      <View style={[styles.dotOverlay, { backgroundColor: dotOverlay }]} pointerEvents="none" />

      <View style={styles.editorWrap}>
        <HorizonBlockEditor
          c={c}
          isDark={isDark}
          strategyEyebrow={strategyEyebrow}
          document={document}
          onChangeDocument={onChangeDocument}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: isDark ? c.catBorderIdle : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, { backgroundColor: 'rgba(34,197,94,0.45)' }]} />
          <ThemedText style={[styles.syncText, { color: c.outline }]}>
            {syncLabel ?? '저장됨'}
          </ThemedText>
        </View>
        {showCompleteButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={completeLabel}
            accessibilityState={{ disabled: completeDisabled }}
            disabled={completeDisabled}
            onPress={onCompletePress}
            style={({ pressed }) => {
              const isGhost = completeTone === 'ghost' && !completeDisabled;
              const isIdle = completeDisabled;
              return [
                styles.completeBtn,
                {
                  backgroundColor: isIdle
                    ? isDark
                      ? 'rgba(255,255,255,0.08)'
                      : c.containerLow
                    : isGhost
                      ? isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#ffffff'
                      : PRIMARY,
                  borderColor: isIdle ? c.catBorderIdle : isGhost ? c.catBorderIdle : PRIMARY,
                  opacity: pressed && !completeDisabled ? 0.9 : 1,
                },
              ];
            }}>
            <ThemedText
              style={[
                styles.completeBtnText,
                {
                  color: completeDisabled
                    ? c.onVariant
                    : completeTone === 'ghost'
                      ? c.onSurface
                      : '#ffffff',
                },
              ]}>
              {completeLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {footerExtra}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 440,
    borderRadius: 40,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  dotOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  editorWrap: {
    flex: 1,
    minHeight: 340,
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  completeBtn: {
    minWidth: 88,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
