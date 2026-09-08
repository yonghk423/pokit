import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  clamp01,
  formatHexInput,
  hexToHsv,
  hsvToHex,
  hueToHex,
  normalizeHexColor,
  type Hsv,
} from '@shared/lib/colorMath';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  value: string;
  onChange: (hex: string) => void;
  ink: string;
  muted: string;
  isDark: boolean;
  line?: string;
};

const SV_HEIGHT = 132;
const HUE_HEIGHT = 20;
const FIELD_SHADOW = 2;

function applySvFromPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  hue: number,
): string {
  const s = clamp01(x / Math.max(width, 1));
  const v = clamp01(1 - y / Math.max(height, 1));
  return hsvToHex({ h: hue, s, v });
}

function applyHueFromPoint(x: number, width: number, s: number, v: number): string {
  const h = clamp01(x / Math.max(width, 1)) * 360;
  return hsvToHex({ h, s, v });
}

export function HsvColorPicker({ value, onChange, ink, muted, isDark, line: _line }: Props) {
  const { t } = useTranslation();
  const normalizedValue = normalizeHexColor(value) ?? '#f97316';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalizedValue));
  const [hexDraft, setHexDraft] = useState(normalizedValue);
  const [svSize, setSvSize] = useState({ width: 1, height: SV_HEIGHT });
  const [hueWidth, setHueWidth] = useState(1);

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const valueRef = useRef(normalizedValue);
  valueRef.current = normalizedValue;
  const isInteractingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isInteractingRef.current) return;
    const next = normalizeHexColor(value);
    if (!next || next === valueRef.current) return;
    valueRef.current = next;
    setHsv(hexToHsv(next));
    setHexDraft(next);
  }, [value]);

  const emitColor = useCallback((nextHex: string) => {
    const normalized = normalizeHexColor(nextHex);
    if (!normalized) return;
    if (normalized === valueRef.current) {
      setHsv(hexToHsv(normalized));
      setHexDraft(normalized);
      return;
    }
    valueRef.current = normalized;
    setHsv(hexToHsv(normalized));
    setHexDraft(normalized);
    onChangeRef.current(normalized);
  }, []);

  const handleSvLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSvSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  const handleHueLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setHueWidth((prev) => (prev === width ? prev : width));
  }, []);

  const updateSvAt = useCallback(
    (x: number, y: number) => {
      emitColor(applySvFromPoint(x, y, svSize.width, svSize.height, hsvRef.current.h));
    },
    [emitColor, svSize.height, svSize.width],
  );

  const updateHueAt = useCallback(
    (x: number) => {
      const current = hsvRef.current;
      emitColor(applyHueFromPoint(x, hueWidth, current.s, current.v));
    },
    [emitColor, hueWidth],
  );

  const markInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
  }, []);

  const markInteractionEnd = useCallback(() => {
    isInteractingRef.current = false;
    void Haptics.selectionAsync();
  }, []);

  const svPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => {
          markInteractionStart();
          updateSvAt(event.x, event.y);
        })
        .onUpdate((event) => {
          updateSvAt(event.x, event.y);
        })
        .onEnd(() => {
          markInteractionEnd();
        })
        .onFinalize(() => {
          isInteractingRef.current = false;
        }),
    [markInteractionEnd, markInteractionStart, updateSvAt],
  );

  const huePan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => {
          markInteractionStart();
          updateHueAt(event.x);
        })
        .onUpdate((event) => {
          updateHueAt(event.x);
        })
        .onEnd(() => {
          markInteractionEnd();
        })
        .onFinalize(() => {
          isInteractingRef.current = false;
        }),
    [markInteractionEnd, markInteractionStart, updateHueAt],
  );

  const svCursor = {
    left: clamp01(hsv.s) * Math.max(svSize.width - 16, 0),
    top: clamp01(1 - hsv.v) * Math.max(svSize.height - 16, 0),
  };

  const hueCursorLeft = clamp01(hsv.h / 360) * Math.max(hueWidth - 16, 0);
  const hueColor = hueToHex(hsv.h);
  const inputBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const shadowInk = isDark ? RetroFlatColors.dark.solidShadow : '#000000';
  const applyFill = isDark
    ? RetroFlatColors.dark.primaryContainer
    : RetroFlatColors.light.primaryContainer;
  const applyLabel = isDark ? RetroFlatColors.dark.primaryOn : RetroFlatColors.light.primary;

  const applyHexDraft = () => {
    const normalized = normalizeHexColor(formatHexInput(hexDraft));
    if (!normalized) return;
    if (normalized === valueRef.current) return;
    valueRef.current = normalized;
    setHsv(hexToHsv(normalized));
    setHexDraft(normalized);
    onChangeRef.current(normalized);
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.root}>
      <View style={styles.hexRow}>
        <View
          style={[
            styles.fieldShell,
            { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.fieldShadow,
              {
                backgroundColor: shadowInk,
                transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
              },
            ]}
          />
          <View style={[styles.previewSwatch, { backgroundColor: hexDraft }]} />
        </View>
        <View
          style={[
            styles.hexInputShell,
            { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.fieldShadow,
              {
                backgroundColor: shadowInk,
                transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
              },
            ]}
          />
          <TextInput
            value={hexDraft}
            onChangeText={(text) => setHexDraft(formatHexInput(text))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            placeholder="#000000"
            placeholderTextColor={muted}
            style={[styles.hexInput, { color: ink, backgroundColor: inputBg }]}
            onSubmitEditing={applyHexDraft}
            returnKeyType="done"
          />
        </View>
        <View
          style={[
            styles.fieldShell,
            { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.fieldShadow,
              {
                backgroundColor: shadowInk,
                transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('appearance.applyHexA11y')}
            onPress={applyHexDraft}
            style={({ pressed }) => [
              styles.applyBtn,
              { backgroundColor: applyFill, opacity: pressed ? 0.88 : 1 },
            ]}>
            <ThemedText style={[styles.applyBtnText, { color: applyLabel }]}>
              {t('common.input')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.panelShell,
          { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.fieldShadow,
            {
              backgroundColor: shadowInk,
              transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
            },
          ]}
        />
        <GestureDetector gesture={svPan}>
          <View style={styles.svPanel} onLayout={handleSvLayout}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
              <Defs>
                <LinearGradient id="svHue" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#ffffff" />
                  <Stop offset="1" stopColor={hueColor} />
                </LinearGradient>
                <LinearGradient id="svValue" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#svHue)" />
              <Rect width="100%" height="100%" fill="url(#svValue)" />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.cursor,
                {
                  left: svCursor.left,
                  top: svCursor.top,
                  borderColor: hsv.v > 0.65 ? '#18181b' : '#fafafa',
                },
              ]}
            />
          </View>
        </GestureDetector>
      </View>

      <View
        style={[
          styles.panelShell,
          { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.fieldShadow,
            {
              backgroundColor: shadowInk,
              transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
            },
          ]}
        />
        <GestureDetector gesture={huePan}>
          <View style={styles.hueTrack} onLayout={handleHueLayout}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
              <Defs>
                <LinearGradient id="hueRainbow" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#ff0000" />
                  <Stop offset="0.17" stopColor="#ffff00" />
                  <Stop offset="0.33" stopColor="#00ff00" />
                  <Stop offset="0.5" stopColor="#00ffff" />
                  <Stop offset="0.67" stopColor="#0000ff" />
                  <Stop offset="0.83" stopColor="#ff00ff" />
                  <Stop offset="1" stopColor="#ff0000" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#hueRainbow)" />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.hueCursor,
                {
                  left: hueCursorLeft,
                  borderColor: ink,
                  backgroundColor: hueColor,
                },
              ]}
            />
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldShell: {
    position: 'relative',
  },
  hexInputShell: {
    position: 'relative',
    flex: 1,
  },
  panelShell: {
    position: 'relative',
  },
  fieldShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  previewSwatch: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 1,
  },
  hexInput: {
    width: '100%',
    minHeight: 40,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    zIndex: 1,
  },
  applyBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  svPanel: {
    height: SV_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    zIndex: 1,
  },
  hueTrack: {
    height: HUE_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    zIndex: 1,
  },
  cursor: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 0,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  hueCursor: {
    position: 'absolute',
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 0,
    borderWidth: 2,
  },
});
