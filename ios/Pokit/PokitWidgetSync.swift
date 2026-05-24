import Foundation
import WidgetKit

@objc(PokitWidgetSync)
class PokitWidgetSync: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func syncDayPlanJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.dayPlanJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitDayPlanWidget")
  }
}
