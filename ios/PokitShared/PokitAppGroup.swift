import Foundation

/// App Group은 Xcode Capabilities 및 Apple Developer의 동일 식별자 등록이 필요합니다.
public enum PokitAppGroup {
  public static let identifier = "group.com.yonghee.pokit"
  public static let dayPlanJsonKey = "pokit_day_plan_widget_json"
  private static let legacyDayPlanJsonKey = "lockflow_day_plan_widget_json"

  public static func readDayPlanJson(from ud: UserDefaults) -> String? {
    if let value = ud.string(forKey: dayPlanJsonKey), !value.isEmpty {
      return value
    }
    guard let legacy = ud.string(forKey: legacyDayPlanJsonKey), !legacy.isEmpty else {
      return nil
    }
    ud.set(legacy, forKey: dayPlanJsonKey)
    ud.synchronize()
    return legacy
  }
}
