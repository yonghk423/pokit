import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { InteractionManager, Text } from 'react-native';
import { InitialDeckSurface } from './InitialDeckSurface';

describe('InitialDeckSurface', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((callback: any) => {
      callback();
      return { cancel: jest.fn(), then: jest.fn(), done: jest.fn() } as any;
    });
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('mounts content behind a skeleton and waits for measured, settled layout', () => {
    let screen!: ReactTestRenderer;
    act(() => { screen = create(<InitialDeckSurface kind="mate" backgroundColor="#fff" isDark={false}><Text>content</Text></InitialDeckSurface>); });
    const root = screen.root.findAll(node => typeof node.props.onLayout === 'function')[0];
    expect(screen.root.findByProps({ testID: 'initial-deck-skeleton' })).toBeTruthy();
    act(() => { jest.advanceTimersByTime(500); });
    expect(screen.root.findByProps({ testID: 'initial-deck-skeleton' })).toBeTruthy();
    act(() => root.props.onLayout({ nativeEvent: { layout: { width: 390, height: 700 } } }));
    act(() => { jest.advanceTimersByTime(100); });
    act(() => root.props.onLayout({ nativeEvent: { layout: { width: 390, height: 650 } } }));
    act(() => { jest.advanceTimersByTime(100); });
    expect(screen.root.findByProps({ testID: 'initial-deck-skeleton' })).toBeTruthy();
    act(() => { jest.runAllTimers(); });
    expect(screen.root.findAllByProps({ testID: 'initial-deck-skeleton' })).toHaveLength(0);
    expect(screen.root.findByType(Text).props.children).toBe('content');
    act(() => root.props.onLayout({ nativeEvent: { layout: { width: 390, height: 600 } } }));
    expect(screen.root.findAllByProps({ testID: 'initial-deck-skeleton' })).toHaveLength(0);
  });
});
