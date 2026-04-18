import Foundation
import WidgetKit

@objc(LockFlowWidgetSync)
class LockFlowWidgetSync: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func syncDayPlanJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: LockFlowAppGroup.identifier) else { return }
    ud.set(json, forKey: LockFlowAppGroup.dayPlanJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "LockFlowDayPlanWidget")
  }
}
