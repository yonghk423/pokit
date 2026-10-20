import { activeAlertScope, AppAlert, useAppAlertStore } from './index';

beforeEach(() => useAppAlertStore.setState({ queue: [], scopes: [] }));

it('waits for explicit confirmation before performing a destructive action and ignores duplicate taps', () => {
  const remove = jest.fn();
  AppAlert.alert('Delete', 'Cannot undo', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }]);
  const request = useAppAlertStore.getState().queue[0];
  expect(remove).not.toHaveBeenCalled();
  useAppAlertStore.getState().dismiss(request.id);
  expect(useAppAlertStore.getState().queue[0]).toBe(request);
  useAppAlertStore.getState().press(request.id, 1);
  useAppAlertStore.getState().press(request.id, 1);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(useAppAlertStore.getState().queue).toEqual([]);
});

it('keeps cancel callbacks and only invokes onDismiss for permitted backdrop/back dismissal', () => {
  const cancel = jest.fn();
  const onDismiss = jest.fn();
  AppAlert.alert('Confirm', '', [{ text: 'Cancel', style: 'cancel', onPress: cancel }], { cancelable: true, onDismiss });
  useAppAlertStore.getState().press(useAppAlertStore.getState().queue[0].id, 0);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(onDismiss).not.toHaveBeenCalled();
  AppAlert.alert('Notice', '', undefined, { cancelable: true, onDismiss });
  useAppAlertStore.getState().dismiss(useAppAlertStore.getState().queue[0].id);
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalledTimes(1);
});

it('preserves queued notices and follow-up alerts triggered by a button', () => {
  AppAlert.alert('First', '', [{ text: 'Next', onPress: () => AppAlert.alert('Follow-up') }]);
  AppAlert.alert('Already queued');
  const first = useAppAlertStore.getState().queue[0].id;
  useAppAlertStore.getState().press(first, 0);
  expect(useAppAlertStore.getState().queue.map((request) => request.title)).toEqual(['Already queued', 'Follow-up']);
  useAppAlertStore.getState().press(first, 0);
  expect(useAppAlertStore.getState().queue).toHaveLength(2);
  useAppAlertStore.getState().press(useAppAlertStore.getState().queue[0].id, 0);
  expect(useAppAlertStore.getState().queue[0].title).toBe('Follow-up');
});

it('routes alerts to the deepest native sheet and falls back when sheets close', () => {
  const state = useAppAlertStore.getState();
  state.registerScope({ id: 'sheet', depth: 1 });
  state.registerScope({ id: 'nested', depth: 2 });
  state.registerScope({ id: 'later-parent', depth: 1 });
  expect(activeAlertScope(useAppAlertStore.getState().scopes)).toBe('nested');
  state.releaseScope('nested');
  expect(activeAlertScope(useAppAlertStore.getState().scopes)).toBe('later-parent');
  state.releaseScope('sheet');
  state.releaseScope('later-parent');
  expect(activeAlertScope(useAppAlertStore.getState().scopes)).toBe('root');
});
