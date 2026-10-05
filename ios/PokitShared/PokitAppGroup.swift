import Foundation

/// App Group은 Xcode Capabilities 및 Apple Developer의 동일 식별자 등록이 필요합니다.
public enum PokitAppGroup {
  public static let identifier = "group.com.yonghee.pokit"
  public static let dayPlanJsonKey = "pokit_day_plan_widget_json"
  /// 홈 위젯 루틴 번들(후보 목록 + 기본키). 인스턴스별 선택은 App Intent 가 담당
  public static let pinnedRoutineJsonKey = "pokit_pinned_routine_widget_json"
  /// 책방 위젯 번들(도서 목록 + 기본키)
  public static let bookstoreWidgetJsonKey = "pokit_bookstore_widget_json"
  /// 노트 위젯 번들(페이지 목록 + 기본키)
  public static let noteWidgetJsonKey = "pokit_note_widget_json"
  /// 위젯 탭 → 앱 진입 시 적용할 planMode (한 번 읽으면 지움)
  public static let pendingPlanModeKey = "pokit_widget_pending_plan_mode"
  private static let legacyDayPlanJsonKey = "lockflow_day_plan_widget_json"

  public static func setPendingPlanMode(_ mode: String) {
    let trimmed = mode.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, let ud = UserDefaults(suiteName: identifier) else { return }
    ud.set(trimmed, forKey: pendingPlanModeKey)
    ud.synchronize()
  }

  public static func consumePendingPlanMode() -> String? {
    guard let ud = UserDefaults(suiteName: identifier) else { return nil }
    let value = (ud.string(forKey: pendingPlanModeKey) ?? "")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    ud.removeObject(forKey: pendingPlanModeKey)
    ud.synchronize()
    return value.isEmpty ? nil : value
  }

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

  public static func readPinnedRoutineJson(from ud: UserDefaults) -> String? {
    guard let value = ud.string(forKey: pinnedRoutineJsonKey), !value.isEmpty else {
      return nil
    }
    return value
  }

  public static func readBookstoreWidgetJson(from ud: UserDefaults) -> String? {
    guard let value = ud.string(forKey: bookstoreWidgetJsonKey), !value.isEmpty else {
      return nil
    }
    return value
  }

  public static func readNoteWidgetJson(from ud: UserDefaults) -> String? {
    guard let value = ud.string(forKey: noteWidgetJsonKey), !value.isEmpty else {
      return nil
    }
    return value
  }

  /// 홈 위젯 탭은 App Intent 재실행이 아니라 URL로 앱을 연다.
  /// (설정 Intent가 탭에서 멈추면 홈 화면이 흐려진 채 고정된다.)
  public enum WidgetOpenURL {
    public static let dayPlan = URL(string: "pokit://day-plan")!
    public static let bookstore = URL(string: "pokit://day-plan?planMode=reading")!
    public static let note = URL(string: "pokit://day-plan?planMode=dayNote")!
  }
}
