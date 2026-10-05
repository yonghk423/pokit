import Foundation
import React
import WidgetKit

@objc(PokitWidgetSync)
class PokitWidgetSync: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func syncDayPlanJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.dayPlanJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitDayPlanWidget")
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitDayPlanHomeWidget")
  }

  @objc func syncPinnedRoutineJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.pinnedRoutineJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitPinnedRoutineWidget")
  }

  @objc func syncBookstoreWidgetJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.bookstoreWidgetJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitBookstoreWidget")
  }

  @objc func syncNoteWidgetJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.noteWidgetJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitNoteWidget")
  }

  /// 위젯 탭으로 남겨 둔 planMode를 한 번 읽고 지운다.
  @objc func consumePendingPlanMode(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    if let mode = PokitAppGroup.consumePendingPlanMode() {
      resolve(mode)
    } else {
      resolve(NSNull())
    }
  }
}
