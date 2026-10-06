import { useIsFocused } from '@react-navigation/native';
import { createElement, memo, useEffect, useRef, useState, type ComponentType } from 'react';
import { InteractionManager } from 'react-native';

/**
 * 탭이 안 보이는 동안 화면 트리를 다시 그리지 않는다.
 * 포커스 복귀는 전환 애니메이션이 끝난 뒤에만 반영해, 빠른 탭 이동이 JS에 막히지 않게 한다.
 */
export function freezeHeavyTabScreen<P extends object>(Component: ComponentType<P>) {
  function Gate(props: P) {
    const navFocused = useIsFocused();
    const [committed, setCommitted] = useState(navFocused);

    useEffect(() => {
      if (!navFocused) {
        setCommitted(false);
        return;
      }
      const task = InteractionManager.runAfterInteractions(() => {
        setCommitted(true);
      });
      return () => task.cancel();
    }, [navFocused]);

    return createElement(FrozenInner, {
      focused: committed,
      innerProps: props,
      Component,
    });
  }
  Gate.displayName = `FreezeOnBlur(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return Gate;
}

type FrozenInnerProps<P extends object> = {
  focused: boolean;
  innerProps: P;
  Component: ComponentType<P>;
};

const FrozenInner = memo(
  function FrozenInner<P extends object>({
    focused,
    innerProps,
    Component,
  }: FrozenInnerProps<P>) {
    const propsRef = useRef(innerProps);
    if (focused) propsRef.current = innerProps;
    return createElement(Component, focused ? innerProps : propsRef.current);
  },
  (prev, next) => {
    if (!next.focused) return true;
    return false;
  },
);
