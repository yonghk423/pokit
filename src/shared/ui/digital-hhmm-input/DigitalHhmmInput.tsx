import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

export type DigitalHhmmInputProps = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  ink: string;
  muted: string;
  line: string;
  surface?: string;
  /** 오전/오후 선택 시 글자색 (기본: 밝은 전경) */
  selectedForeground?: string;
  disabled?: boolean;
  /** 분 스냅 간격. 기본 1분 */
  snapStepMinutes?: number;
  /** 접근성 라벨 접두 (예: 시작, 종료) */
  accessibilityLabelPrefix?: string;
};

type Meridiem = '오전' | '오후';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseHhmm(raw: string): { total: number } | null {
  const t = raw.trim();
  if (t === '24:00') return { total: 24 * 60 };
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { total: h * 60 + min };
}

function formatHhmm(total: number): string {
  if (total >= 24 * 60) return '24:00';
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${pad2(Math.floor(safe / 60))}:${pad2(safe % 60)}`;
}

function snapMinutes(total: number, step: number): number {
  if (total >= 24 * 60) return 24 * 60;
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 1;
  if (s <= 1) return Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const max = 23 * 60 + 55;
  return Math.max(0, Math.min(max, Math.round(total / s) * s));
}

function h24To12(h24: number): { ap: Meridiem; h12: number } {
  if (h24 === 24) return { ap: '오전', h12: 12 };
  const ap: Meridiem = h24 < 12 ? '오전' : '오후';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { ap, h12 };
}

function from12h(h12: number, min: number, ap: Meridiem): number {
  const h = h12 === 12 ? 0 : h12;
  const h24 = ap === '오후' ? h + 12 : h;
  return h24 * 60 + min;
}

function draftsFromValue(valueHhmm: string): { hour: string; min: string; ap: Meridiem } {
  const parsed = parseHhmm(valueHhmm);
  /** `24:00`은 편집 시 오전 12:00으로 취급(하루 끝 표기는 상위에서) */
  const total = parsed?.total === 24 * 60 ? 0 : (parsed?.total ?? 9 * 60);
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const { ap, h12 } = h24To12(h24);
  return { hour: pad2(h12), min: pad2(min), ap };
}

/**
 * 휠 대신 시·분 숫자 패드 + 오전/오후 토글로 `HH:mm`을 입력합니다.
 */
export function DigitalHhmmInput({
  valueHhmm,
  onChangeHhmm,
  ink,
  muted,
  line,
  surface = 'transparent',
  selectedForeground = '#FAFAFA',
  disabled = false,
  snapStepMinutes = 1,
  accessibilityLabelPrefix,
}: DigitalHhmmInputProps) {
  const synced = useMemo(() => draftsFromValue(valueHhmm), [valueHhmm]);
  const [hourDraft, setHourDraft] = useState(synced.hour);
  const [minDraft, setMinDraft] = useState(synced.min);
  const [ap, setAp] = useState<Meridiem>(synced.ap);
  const [focusedField, setFocusedField] = useState<'hour' | 'min' | null>(null);

  useEffect(() => {
    if (focusedField === 'hour') {
      setMinDraft(synced.min);
      setAp(synced.ap);
      return;
    }
    if (focusedField === 'min') {
      setHourDraft(synced.hour);
      setAp(synced.ap);
      return;
    }
    setHourDraft(synced.hour);
    setMinDraft(synced.min);
    setAp(synced.ap);
  }, [synced, focusedField]);

  const prefix = accessibilityLabelPrefix?.trim() || '시간';

  const commitParts = (
    next: { h12?: number; min?: number; ap?: Meridiem },
    options?: { snap?: boolean },
  ) => {
    const h12 = next.h12 ?? Math.min(12, Math.max(1, parseInt(hourDraft, 10) || 12));
    const min = next.min ?? Math.min(59, Math.max(0, parseInt(minDraft, 10) || 0));
    const meridiem = next.ap ?? ap;
    const raw = from12h(h12, min, meridiem);
    const total = options?.snap === false ? raw : snapMinutes(raw, snapStepMinutes);
    onChangeHhmm(formatHhmm(total));
  };

  const onHourChange = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 2);
    setHourDraft(d);
    if (d === '' || d === '0') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;
    if (d.length === 1 && n >= 1 && n <= 9) {
      commitParts({ h12: n }, { snap: false });
      return;
    }
    if (d.length === 2) {
      commitParts({ h12: Math.min(12, Math.max(1, n)) }, { snap: false });
    }
  };

  const onHourBlur = () => {
    const d = hourDraft.replace(/\D/g, '').slice(0, 2);
    if (d === '' || d === '0') {
      setHourDraft(synced.hour);
      return;
    }
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) {
      setHourDraft(synced.hour);
      return;
    }
    const h12 = Math.min(12, Math.max(1, n));
    setHourDraft(pad2(h12));
    commitParts({ h12 }, { snap: true });
  };

  const onMinChange = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 2);
    setMinDraft(d);
    if (d === '') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;
    if (d.length === 1) {
      commitParts({ min: n }, { snap: false });
      return;
    }
    commitParts({ min: Math.min(59, Math.max(0, n)) }, { snap: false });
  };

  const onMinBlur = () => {
    const d = minDraft.replace(/\D/g, '').slice(0, 2);
    if (d === '') {
      setMinDraft(synced.min);
      return;
    }
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) {
      setMinDraft(synced.min);
      return;
    }
    const min = Math.min(59, Math.max(0, n));
    const snapped = snapMinutes(
      from12h(Math.min(12, Math.max(1, parseInt(hourDraft, 10) || 12)), min, ap),
      snapStepMinutes,
    );
    const snappedMin = snapped % 60;
    setMinDraft(pad2(snappedMin));
    commitParts({ min: snappedMin }, { snap: true });
  };

  const setMeridiem = (next: Meridiem) => {
    if (disabled || next === ap) return;
    void Haptics.selectionAsync();
    setAp(next);
    commitParts({ ap: next }, { snap: true });
  };

  return (
    <View style={[styles.root, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={styles.meridiemRow}>
        {(['오전', '오후'] as const).map((label) => {
          const selected = ap === label;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${prefix} ${label}`}
              disabled={disabled}
              onPress={() => setMeridiem(label)}
              style={({ pressed }) => [
                styles.meridiemBtn,
                {
                  backgroundColor: selected ? ink : surface,
                  borderColor: line,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <ThemedText
                style={[styles.meridiemText, { color: selected ? selectedForeground : ink }]}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.fieldsRow, { borderColor: line, backgroundColor: surface }]}>
        <View style={styles.fieldCol}>
          <ThemedText style={[styles.fieldCaption, { color: muted }]}>시</ThemedText>
          <TextInput
            value={hourDraft}
            onChangeText={onHourChange}
            onFocus={() => setFocusedField('hour')}
            onBlur={() => {
              setFocusedField(null);
              onHourBlur();
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            editable={!disabled}
            accessibilityLabel={`${prefix} 시`}
            style={[styles.digitInput, { color: ink }]}
          />
        </View>
        <ThemedText style={[styles.colon, { color: ink }]}>:</ThemedText>
        <View style={styles.fieldCol}>
          <ThemedText style={[styles.fieldCaption, { color: muted }]}>분</ThemedText>
          <TextInput
            value={minDraft}
            onChangeText={onMinChange}
            onFocus={() => setFocusedField('min')}
            onBlur={() => {
              setFocusedField(null);
              onMinBlur();
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            editable={!disabled}
            accessibilityLabel={`${prefix} 분`}
            style={[styles.digitInput, { color: ink }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  meridiemRow: {
    flexDirection: 'row',
    gap: 6,
  },
  meridiemBtn: {
    flex: 1,
    minHeight: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  meridiemText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  fieldCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
  },
  fieldCaption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  digitInput: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    padding: 0,
    margin: 0,
    width: '100%',
    minHeight: 36,
  },
  colon: {
    fontSize: 26,
    fontWeight: '800',
    paddingBottom: 2,
    marginTop: 12,
  },
});
