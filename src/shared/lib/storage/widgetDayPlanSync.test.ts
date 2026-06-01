import { NativeModules, Platform } from 'react-native';

import { syncDayPlanToWidget } from './widgetDayPlanSync';

describe('syncDayPlanToWidget', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOs });
    delete (NativeModules as { PokitWidgetSync?: unknown }).PokitWidgetSync;
  });

  it('no-ops on non-ios platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const sync = jest.fn();
    NativeModules.PokitWidgetSync = { syncDayPlanJson: sync };
    syncDayPlanToWidget({
      dateKey: '2025-05-26',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    expect(sync).not.toHaveBeenCalled();
  });

  it('syncs json on ios when native module exists', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const sync = jest.fn();
    NativeModules.PokitWidgetSync = { syncDayPlanJson: sync };
    const snapshot = {
      dateKey: '2025-05-26',
      blocks: [{ id: 'b1' }],
      completedBlockIds: [],
      skippedBlockIds: [],
    };
    syncDayPlanToWidget(snapshot);
    expect(sync).toHaveBeenCalledWith(JSON.stringify(snapshot));
  });
});
