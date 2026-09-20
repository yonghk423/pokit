import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTranslation, type AppLocale } from '@shared/lib/i18n';

import { DigitalHhmmInput } from '../digital-hhmm-input';
import { hhmmToPickerDate, pickerDateToHhmm } from './hhmmDateBridge';

export type NativeHhmmWheelPickerProps = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  /** 오전 12:00 → `24:00`(하루 끝). 하루 마무리 등 */
  mapMidnightToEndOfDay?: boolean;
  /** 분 스냅. iOS minuteInterval (1|2|3|4|5|6|10|12|15|20|30) */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  isDark?: boolean;
  /** iOS spinner 텍스트 색 */
  textColor?: string;
  accessibilityLabelPrefix?: string;
  disabled?: boolean;
  /** 웹 폴백 DigitalHhmmInput용 */
  ink?: string;
  muted?: string;
  line?: string;
  surface?: string;
};

function localeTagForPicker(locale: AppLocale): string {
  if (locale === 'ko') return 'ko-KR';
  if (locale === 'ja') return 'ja-JP';
  return 'en-US';
}

/**
 * iOS/Android 네이티브 시간 휠(`display="spinner"`).
 * 웹은 DigitalHhmmInput으로 폴백한다.
 *
 * value는 내부 Date로 유지해, 부모 리렌더·HH:mm 왕복이 휠을 다시 뛰게 만들지 않는다.
 */
export function NativeHhmmWheelPicker({
  valueHhmm,
  onChangeHhmm,
  mapMidnightToEndOfDay = false,
  minuteInterval = 1,
  isDark = false,
  textColor,
  accessibilityLabelPrefix,
  disabled = false,
  ink = '#111111',
  muted = '#666666',
  line = '#CCCCCC',
  surface,
}: NativeHhmmWheelPickerProps) {
  const { locale } = useTranslation();
  const [pickerValue, setPickerValue] = useState(() => hhmmToPickerDate(valueHhmm));
  const lastEmittedHhmmRef = useRef(valueHhmm.trim());
  const mapMidnightRef = useRef(mapMidnightToEndOfDay);
  mapMidnightRef.current = mapMidnightToEndOfDay;

  // 바깥에서 값이 바뀐 경우에만 휠을 맞춘다 (스크롤 중 자기 emit 왕복은 무시)
  useEffect(() => {
    const next = valueHhmm.trim();
    if (next === lastEmittedHhmmRef.current) return;
    lastEmittedHhmmRef.current = next;
    setPickerValue(hhmmToPickerDate(next));
  }, [valueHhmm]);

  if (Platform.OS === 'web') {
    return (
      <DigitalHhmmInput
        valueHhmm={valueHhmm}
        onChangeHhmm={onChangeHhmm}
        ink={ink}
        muted={muted}
        line={line}
        surface={surface}
        snapStepMinutes={minuteInterval}
        mapMidnightToEndOfDay={mapMidnightToEndOfDay}
        accessibilityLabelPrefix={accessibilityLabelPrefix}
        disabled={disabled}
      />
    );
  }

  const onChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (disabled) return;
    if (!date) return;
    setPickerValue(date);
    const next = pickerDateToHhmm(date, mapMidnightRef.current);
    lastEmittedHhmmRef.current = next;
    onChangeHhmm(next);
  };

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={
        accessibilityLabelPrefix
          ? `${accessibilityLabelPrefix} ${valueHhmm}`
          : undefined
      }>
      <DateTimePicker
        value={pickerValue}
        mode="time"
        display="spinner"
        // 오전/오후(오전·午後) 휠 — DigitalHhmmInput과 동일 UX
        is24Hour={false}
        minuteInterval={minuteInterval}
        locale={localeTagForPicker(locale)}
        themeVariant={isDark ? 'dark' : 'light'}
        textColor={textColor}
        onChange={onChange}
        disabled={disabled}
        style={styles.picker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    // 휠 높이 고정 — 레이아웃 측정 깜빡임 방지
    minHeight: Platform.OS === 'ios' ? 180 : 160,
  },
  picker: {
    alignSelf: 'stretch',
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : undefined,
  },
});
