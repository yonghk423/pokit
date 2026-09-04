import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { resolveDailyQuote } from '@shared/lib/daily-quote';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  dateKey: string;
  isDark?: boolean;
};

/** 날짜(금/4) 옆 — 일일 명언 + 복사·공유 */
export function DailyQuoteCard({ dateKey, isDark = false }: Props) {
  const { t, locale } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const quote = useMemo(() => resolveDailyQuote(dateKey, locale), [dateKey, locale]);
  const [copied, setCopied] = useState(false);

  const shareMessage = useMemo(() => {
    return `${quote.text}\n— ${quote.author}\n\nPOKIT`;
  }, [quote.author, quote.text]);

  const handleCopy = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(shareMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [shareMessage]);

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: shareMessage });
    } catch {
      /* cancelled */
    }
  }, [shareMessage]);

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <ThemedText
          style={[styles.kicker, { color: tone.textMuted }, cityPopFont('700')]}
          lightColor={tone.textMuted}
          darkColor={tone.textMuted}>
          {t('dayPlan.dailyQuote.kicker')}
        </ThemedText>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              copied ? t('dayPlan.dailyQuote.copiedA11y') : t('dayPlan.dailyQuote.copyA11y')
            }
            hitSlop={8}
            onPress={() => {
              void handleCopy();
            }}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.55 }]}>
            <IconSymbol
              name={copied ? 'checkmark' : 'doc.on.doc'}
              size={12}
              color={copied ? tone.text : tone.textMuted}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.dailyQuote.shareA11y')}
            hitSlop={8}
            onPress={() => {
              void handleShare();
            }}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.55 }]}>
            <IconSymbol name="square.and.arrow.up" size={12} color={tone.textMuted} />
          </Pressable>
        </View>
      </View>
      <ThemedText
        style={[styles.body, { color: tone.text }, cityPopFont('600')]}
        lightColor={tone.text}
        darkColor={tone.text}
        numberOfLines={3}>
        {quote.text}
      </ThemedText>
      <ThemedText
        style={[styles.author, { color: tone.textMuted }, cityPopFont('500')]}
        lightColor={tone.textMuted}
        darkColor={tone.textMuted}
        numberOfLines={1}>
        — {quote.author}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingRight: 2,
    paddingVertical: 4,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  actionBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  author: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: -0.1,
  },
});
