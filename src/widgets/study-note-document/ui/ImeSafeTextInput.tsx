import { forwardRef, useEffect, useRef, useState, type ComponentProps } from 'react';
import { TextInput } from 'react-native';

type Props = Omit<ComponentProps<typeof TextInput>, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * 한글 IME 조합 중 controlled value 재주입으로 자모가 분리되는 문제를 막기 위해,
 * 포커스 동안은 로컬 draft만 갱신하고 blur 시 부모에 반영한다.
 */
export const ImeSafeTextInput = forwardRef<TextInput, Props>(function ImeSafeTextInput(
  { value, onChangeText, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!focused) {
      draftRef.current = value;
      setDraft(value);
    }
  }, [value, focused]);

  return (
    <TextInput
      ref={ref}
      value={focused ? draft : value}
      onChangeText={(text) => {
        draftRef.current = text;
        setDraft(text);
      }}
      onFocus={(event) => {
        setFocused(true);
        draftRef.current = value;
        setDraft(value);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        const next = draftRef.current;
        if (next !== valueRef.current) {
          onChangeText(next);
        }
        onBlur?.(event);
      }}
      {...rest}
    />
  );
});
