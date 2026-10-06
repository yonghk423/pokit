import Foundation
import SwiftUI
import WidgetKit

// MARK: - JSON (RN `PersistedDayPlan` + widget payload)

struct DayPlanBlockJson: Decodable {
  let id: String
  let title: String
  let category: String
  let categoryKey: String?
  let startMinutes: Int
  let endMinutes: Int
  let order: Int
  let blockOrigin: String?
}

struct DayPlanQuickMemoJson: Decodable {
  let id: String
  let text: String
  let createdAt: Int?
  let isDone: Bool
}

struct DayPlanPriorityRoutineItemJson: Decodable {
  let categoryKey: String
  let iconName: String
  let isCompleted: Bool
}

struct DayPlanSnapshotJson: Decodable {
  let dateKey: String
  let blocks: [DayPlanBlockJson]
  let completedBlockIds: [String]
  let skippedBlockIds: [String]
  let priorityCategoryKeys: [String]?
  let completedFocusCategoryKeys: [String]?
  let priorityRoutineItems: [DayPlanPriorityRoutineItemJson]?
  let quickMemos: [DayPlanQuickMemoJson]?
  let quickMemoDraft: String?
  /// RN 로케일 — 홈 위젯 「빠른 메모」 섹션 제목
  let quickMemoSectionTitle: String?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
}

func loadDayPlanWidgetSnapshot() -> DayPlanSnapshotJson? {
  guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readDayPlanJson(from: ud),
        !raw.isEmpty,
        let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(DayPlanSnapshotJson.self, from: data)
}

private func sortedFlowBlocks(_ blocks: [DayPlanBlockJson]) -> [DayPlanBlockJson] {
  blocks
    .filter { ($0.blockOrigin ?? "flow") != "quickMemo" }
    .sorted { a, b in
      if a.startMinutes != b.startMinutes { return a.startMinutes < b.startMinutes }
      return a.order < b.order
    }
}

private func normalizedKeys(_ keys: [String]?) -> [String] {
  (keys ?? [])
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty }
}

/// 담기·데이플랜 카탈로그 SF Symbol 폴백 — RN `resolveCategoryCatalogIcon` 동기화 전 저장본·블록용
func dayPlanWidgetIconName(for categoryKey: String?) -> String {
  guard let key = categoryKey?.trimmingCharacters(in: .whitespacesAndNewlines), !key.isEmpty else {
    return "person.fill"
  }
  if key.hasPrefix("customFlow:") { return "person.fill" }
  switch key {
  case "water": return "drop.fill"
  case "medicine": return "cross.case.fill"
  case "vitamins": return "pill.fill"
  case "fasting": return "figure.stand"
  case "stretching": return "figure.run"
  case "straightenBack": return "figure.yoga"
  case "neckPosture": return "tortoise.fill"
  case "posture": return "figure.stand.line.dotted.figure.stand"
  case "meditation": return "brain.head.profile"
  case "workout": return "dumbbell.fill"
  case "walking": return "figure.walk"
  case "yoga": return "figure.mind.and.body"
  case "sleep": return "moon.fill"
  case "breathing": return "wind"
  case "skincare": return "sparkles"
  case "eyerest": return "eye"
  case "reading": return "book.closed.fill"
  case "study": return "graduationcap.fill"
  case "planning": return "calendar.badge.clock"
  case "writing": return "square.and.pencil"
  case "language": return "character.bubble"
  case "creative": return "paintpalette.fill"
  case "deepwork": return "brain"
  case "journal": return "book.closed.fill"
  case "pomodoro": return "timer"
  case "review": return "arrow.counterclockwise"
  case "news": return "newspaper.fill"
  case "organize": return "tray.and.arrow.down.fill"
  case "podcast": return "headphones"
  case "inbox": return "tray.2.fill"
  case "work": return "square.and.pencil"
  case "coding": return "chevron.left.forwardslash.chevron.right"
  case "other": return "person.fill"
  default: return "person.fill"
  }
}

struct DayPlanRoutineSectionModel {
  let title: String
  let count: Int
  let iconNames: [String]

  var countLabel: String { "\(count)개" }
  var isEmpty: Bool { count == 0 && iconNames.isEmpty }
}

struct DayPlanQuickMemoLineModel: Identifiable {
  let id: String
  let text: String
  let isDone: Bool
  let isDraft: Bool
}

struct DayPlanRoutineIconsModel {
  let headerTitle: String
  let count: Int
  let iconNames: [String]
  let emptyMessage: String?

  var countLabel: String { "\(count)개" }
}

struct DayPlanRoutineStatusItem: Identifiable {
  let categoryKey: String
  var id: String { categoryKey }
  let iconName: String
  let isCompleted: Bool
}

struct DayPlanHomeWidgetModel {
  let emptyMessage: String?
  let today: DayPlanRoutineSectionModel
  let completed: DayPlanRoutineSectionModel
  let quickMemos: [DayPlanQuickMemoLineModel]
  /// Small 위젯 — 담기 순서대로 완료 여부 포함
  let routineItems: [DayPlanRoutineStatusItem]
  let quickMemoSectionTitle: String

  var hasQuickMemos: Bool { !quickMemos.isEmpty }
  var pendingCount: Int { max(0, today.count - completed.count) }
}

private func buildQuickMemoLines(snapshot: DayPlanSnapshotJson) -> [DayPlanQuickMemoLineModel] {
  if let block = snapshot.blocks.first(where: { ($0.blockOrigin ?? "") == "quickMemo" }) {
    let blockLines = block.title
      .components(separatedBy: .newlines)
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    if !blockLines.isEmpty {
      return blockLines.prefix(2).enumerated().map { idx, line in
        DayPlanQuickMemoLineModel(id: "block-\(idx)", text: line, isDone: false, isDraft: false)
      }
    }
  }

  var lines: [DayPlanQuickMemoLineModel] = []

  for memo in snapshot.quickMemos ?? [] where !memo.isDone {
    let text = memo.text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { continue }
    lines.append(DayPlanQuickMemoLineModel(id: memo.id, text: text, isDone: false, isDraft: false))
    if lines.count >= 2 { return lines }
  }

  let draft = (snapshot.quickMemoDraft ?? "")
    .trimmingCharacters(in: .whitespacesAndNewlines)
  if !draft.isEmpty {
    let draftLines = draft
      .components(separatedBy: .newlines)
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    for (idx, line) in draftLines.prefix(2 - lines.count).enumerated() {
      lines.append(
        DayPlanQuickMemoLineModel(id: "draft-\(idx)", text: line, isDone: false, isDraft: true)
      )
    }
  }

  return lines
}

private func normalizedPriorityRoutineItems(
  _ items: [DayPlanPriorityRoutineItemJson]?
) -> [DayPlanPriorityRoutineItemJson] {
  (items ?? [])
    .filter {
      !$0.categoryKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && !$0.iconName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

private func routineSectionsFromPayloadItems(
  _ items: [DayPlanPriorityRoutineItemJson]
) -> (
  routineItems: [DayPlanRoutineStatusItem],
  today: DayPlanRoutineSectionModel,
  completed: DayPlanRoutineSectionModel
) {
  let routineItems = items.map { item in
    DayPlanRoutineStatusItem(
      categoryKey: item.categoryKey,
      iconName: item.iconName,
      isCompleted: item.isCompleted
    )
  }
  let pending = items.filter { !$0.isCompleted }
  let done = items.filter { $0.isCompleted }
  return (
    routineItems: routineItems,
    today: DayPlanRoutineSectionModel(
      title: "오늘 루틴",
      count: items.count,
      iconNames: pending.map(\.iconName)
    ),
    completed: DayPlanRoutineSectionModel(
      title: "완료",
      count: done.count,
      iconNames: done.map(\.iconName)
    )
  )
}

func buildDayPlanWidgetModels(snapshot: DayPlanSnapshotJson?) -> (
  lock: DayPlanRoutineIconsModel,
  home: DayPlanHomeWidgetModel
) {
  guard let snapshot else {
    let empty = DayPlanRoutineSectionModel(title: "오늘 루틴", count: 0, iconNames: [])
    return (
      lock: DayPlanRoutineIconsModel(
        headerTitle: "오늘 루틴",
        count: 0,
        iconNames: [],
        emptyMessage: String(localized: "widget.today.loadError")
      ),
      home: DayPlanHomeWidgetModel(
        emptyMessage: String(localized: "widget.today.loadError"),
        today: empty,
        completed: DayPlanRoutineSectionModel(title: "완료", count: 0, iconNames: []),
        quickMemos: [],
        routineItems: [],
        quickMemoSectionTitle: "포스트잇"
      )
    )
  }

  let priorityKeys = normalizedKeys(snapshot.priorityCategoryKeys)
  let payloadRoutineItems = normalizedPriorityRoutineItems(snapshot.priorityRoutineItems)
  let completedFocusKeys = Set(normalizedKeys(snapshot.completedFocusCategoryKeys))
  let completedIds = Set(snapshot.completedBlockIds)
  let skippedIds = Set(snapshot.skippedBlockIds)
  let quickMemos = buildQuickMemoLines(snapshot: snapshot)

  let todaySection: DayPlanRoutineSectionModel
  let completedSection: DayPlanRoutineSectionModel
  let routineItems: [DayPlanRoutineStatusItem]

  if !payloadRoutineItems.isEmpty {
    let sections = routineSectionsFromPayloadItems(payloadRoutineItems)
    routineItems = sections.routineItems
    todaySection = sections.today
    completedSection = sections.completed
  } else if !priorityKeys.isEmpty {
    let pendingKeys = priorityKeys.filter { !completedFocusKeys.contains($0) }
    let doneKeys = priorityKeys.filter { completedFocusKeys.contains($0) }
    routineItems = priorityKeys.map { key in
      DayPlanRoutineStatusItem(
        categoryKey: key,
        iconName: dayPlanWidgetIconName(for: key),
        isCompleted: completedFocusKeys.contains(key)
      )
    }
    todaySection = DayPlanRoutineSectionModel(
      title: "오늘 루틴",
      count: priorityKeys.count,
      iconNames: pendingKeys.map { dayPlanWidgetIconName(for: $0) }
    )
    completedSection = DayPlanRoutineSectionModel(
      title: "완료",
      count: doneKeys.count,
      iconNames: doneKeys.map { dayPlanWidgetIconName(for: $0) }
    )
  } else {
    let blocks = sortedFlowBlocks(snapshot.blocks)
    let pending = blocks.filter { !completedIds.contains($0.id) && !skippedIds.contains($0.id) }
    let done = blocks.filter { completedIds.contains($0.id) }
    let totalCount = pending.count + done.count
    routineItems = blocks
      .filter { !skippedIds.contains($0.id) }
      .map { block in
      let categoryKey = block.categoryKey?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
        ? block.categoryKey!.trimmingCharacters(in: .whitespacesAndNewlines)
        : block.id
      return DayPlanRoutineStatusItem(
        categoryKey: categoryKey,
        iconName: dayPlanWidgetIconName(for: block.categoryKey),
        isCompleted: completedIds.contains(block.id)
      )
    }
    todaySection = DayPlanRoutineSectionModel(
      title: "오늘 루틴",
      count: totalCount,
      iconNames: pending.map { dayPlanWidgetIconName(for: $0.categoryKey) }
    )
    completedSection = DayPlanRoutineSectionModel(
      title: "완료",
      count: done.count,
      iconNames: done.map { dayPlanWidgetIconName(for: $0.categoryKey) }
    )
  }

  let totalPlanned = todaySection.count
  let lockIcons: [String]
  let lockCount: Int
  let emptyMessage: String?

  if !payloadRoutineItems.isEmpty {
    lockIcons = payloadRoutineItems.map(\.iconName)
    lockCount = payloadRoutineItems.count
    emptyMessage = nil
  } else if !priorityKeys.isEmpty {
    lockIcons = priorityKeys.map { dayPlanWidgetIconName(for: $0) }
    lockCount = priorityKeys.count
    emptyMessage = nil
  } else if totalPlanned == 0 {
    lockIcons = []
    lockCount = 0
    emptyMessage = String(localized: "widget.today.emptyRoutines")
  } else {
    lockIcons = todaySection.iconNames + completedSection.iconNames
    lockCount = totalPlanned
    emptyMessage = nil
  }

  let homeEmptyMessage: String? = (totalPlanned == 0 && quickMemos.isEmpty) ? emptyMessage : nil
  let quickMemoSectionTitle: String = {
    let trimmed = (snapshot.quickMemoSectionTitle ?? "")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "포스트잇" : trimmed
  }()

  return (
    lock: DayPlanRoutineIconsModel(
      headerTitle: "오늘 루틴",
      count: lockCount,
      iconNames: lockIcons,
      emptyMessage: emptyMessage
    ),
    home: DayPlanHomeWidgetModel(
      emptyMessage: homeEmptyMessage,
      today: todaySection,
      completed: completedSection,
      quickMemos: quickMemos,
      routineItems: routineItems,
      quickMemoSectionTitle: quickMemoSectionTitle
    )
  )
}

func buildDayPlanRoutineIconsModel(snapshot: DayPlanSnapshotJson?) -> DayPlanRoutineIconsModel {
  buildDayPlanWidgetModels(snapshot: snapshot).lock
}

struct DayPlanWidgetEntry: TimelineEntry {
  let date: Date
  let lockModel: DayPlanRoutineIconsModel
  let homeModel: DayPlanHomeWidgetModel
}

struct DayPlanWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> DayPlanWidgetEntry {
    DayPlanWidgetEntry(
      date: Date(),
      lockModel: DayPlanRoutineIconsModel(
        headerTitle: "오늘 루틴",
        count: 4,
        iconNames: ["brain", "drop.fill", "figure.run", "book.fill"],
        emptyMessage: nil
      ),
      homeModel: DayPlanHomeWidgetModel(
        emptyMessage: nil,
        today: DayPlanRoutineSectionModel(
          title: "오늘 루틴",
          count: 11,
          iconNames: ["figure.run", "book.fill", "calendar.badge.clock", "person.fill", "person.fill", "tortoise.fill"]
        ),
        completed: DayPlanRoutineSectionModel(
          title: "완료",
          count: 1,
          iconNames: ["book.fill"]
        ),
        quickMemos: [
          DayPlanQuickMemoLineModel(id: "m1", text: "장보기", isDone: false, isDraft: false),
        ],
        routineItems: [
          DayPlanRoutineStatusItem(categoryKey: "deepwork", iconName: "brain", isCompleted: true),
          DayPlanRoutineStatusItem(categoryKey: "water", iconName: "drop.fill", isCompleted: false),
          DayPlanRoutineStatusItem(categoryKey: "stretching", iconName: "figure.run", isCompleted: false),
        ],
        quickMemoSectionTitle: "포스트잇"
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (DayPlanWidgetEntry) -> Void) {
    let snap = loadDayPlanWidgetSnapshot()
    let models = buildDayPlanWidgetModels(snapshot: snap)
    completion(DayPlanWidgetEntry(date: Date(), lockModel: models.lock, homeModel: models.home))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DayPlanWidgetEntry>) -> Void) {
    let now = Date()
    let snap = loadDayPlanWidgetSnapshot()
    let models = buildDayPlanWidgetModels(snapshot: snap)
    let entry = DayPlanWidgetEntry(date: now, lockModel: models.lock, homeModel: models.home)
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

/// `#RRGGBB` / `#RGB` → SwiftUI Color
func dayPlanWidgetColor(hex: String?, fallback: Color) -> Color {
  guard var value = hex?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
    return fallback
  }
  if value.hasPrefix("#") { value.removeFirst() }
  if value.count == 3 {
    value = value.map { "\($0)\($0)" }.joined()
  }
  guard value.count == 6, let int = UInt64(value, radix: 16) else { return fallback }
  let r = Double((int >> 16) & 0xff) / 255
  let g = Double((int >> 8) & 0xff) / 255
  let b = Double(int & 0xff) / 255
  return Color(red: r, green: g, blue: b)
}

/// 홈 위젯 공용 포스트잇 팔레트 — RN `faceHex`/`inkHex` 로 갱신
enum DayPlanWidgetPalette {
  static let defaultFace = Color(red: 1, green: 229 / 255, blue: 102 / 255)
  private static let defaultInk = Color(red: 17 / 255, green: 17 / 255, blue: 17 / 255)

  private(set) static var face = defaultFace
  /// 하위 호환 — `face`와 동일
  static var cream: Color { face }

  /// `containerBackground` 등 — 정적 팔레트 적용 전에 읽어도 안전한 면색
  static func faceColor(hex: String?) -> Color {
    dayPlanWidgetColor(hex: hex, fallback: defaultFace)
  }

  /// 면색과 같이 엔트리 hex에서 바로 읽는 글자색 (정적 `ink`에만 의존하지 않음)
  static func inkColor(hex: String?) -> Color {
    dayPlanWidgetColor(hex: hex, fallback: defaultInk)
  }

  static func mutedColor(hex: String?, inkHex: String?) -> Color {
    let trimmed = (hex ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty {
      return dayPlanWidgetColor(hex: trimmed, fallback: inkColor(hex: inkHex).opacity(0.55))
    }
    return inkColor(hex: inkHex).opacity(0.55)
  }

  private(set) static var ink = defaultInk
  private(set) static var muted = Color.black.opacity(0.55)
  private(set) static var iconBox = Color.black.opacity(0.08)
  /// 체크·완료 강조 — 글자색(검정)과 동일
  private(set) static var completedTint = defaultInk
  private(set) static var completedIconBox = Color.black.opacity(0.10)
  private(set) static var divider = Color.black.opacity(0.12)

  static func apply(faceHex: String?, inkHex: String?, mutedHex: String?) {
    let nextFace = dayPlanWidgetColor(hex: faceHex, fallback: defaultFace)
    let nextInk = inkColor(hex: inkHex)
    face = nextFace
    ink = nextInk
    muted = mutedColor(hex: mutedHex, inkHex: inkHex)
    iconBox = nextInk.opacity(0.08)
    completedTint = nextInk
    completedIconBox = nextInk.opacity(0.12)
    divider = nextInk.opacity(0.14)
  }

  static func apply(from snapshot: DayPlanSnapshotJson?) {
    apply(faceHex: snapshot?.faceHex, inkHex: snapshot?.inkHex, mutedHex: snapshot?.mutedHex)
  }
}

// MARK: - Widget ink environment (정적 팔레트 대신 엔트리별 hex)

private struct PokitWidgetInkKey: EnvironmentKey {
  static let defaultValue = Color(red: 17 / 255, green: 17 / 255, blue: 17 / 255)
}

private struct PokitWidgetMutedKey: EnvironmentKey {
  static let defaultValue = Color.black.opacity(0.55)
}

private struct PokitWidgetCompletedTintKey: EnvironmentKey {
  static let defaultValue = Color(red: 17 / 255, green: 17 / 255, blue: 17 / 255)
}

private struct PokitWidgetIconBoxKey: EnvironmentKey {
  static let defaultValue = Color.black.opacity(0.08)
}

private struct PokitWidgetCompletedIconBoxKey: EnvironmentKey {
  static let defaultValue = Color.black.opacity(0.10)
}

extension EnvironmentValues {
  var pokitWidgetInk: Color {
    get { self[PokitWidgetInkKey.self] }
    set { self[PokitWidgetInkKey.self] = newValue }
  }

  var pokitWidgetMuted: Color {
    get { self[PokitWidgetMutedKey.self] }
    set { self[PokitWidgetMutedKey.self] = newValue }
  }

  var pokitWidgetCompletedTint: Color {
    get { self[PokitWidgetCompletedTintKey.self] }
    set { self[PokitWidgetCompletedTintKey.self] = newValue }
  }

  var pokitWidgetIconBox: Color {
    get { self[PokitWidgetIconBoxKey.self] }
    set { self[PokitWidgetIconBoxKey.self] = newValue }
  }

  var pokitWidgetCompletedIconBox: Color {
    get { self[PokitWidgetCompletedIconBoxKey.self] }
    set { self[PokitWidgetCompletedIconBoxKey.self] = newValue }
  }
}

extension View {
  /// 면색처럼 엔트리 `inkHex`/`mutedHex`를 뷰 트리에 주입
  func pokitWidgetInkEnvironment(faceHex: String?, inkHex: String?, mutedHex: String?) -> some View {
    let ink = DayPlanWidgetPalette.inkColor(hex: inkHex)
    let muted = DayPlanWidgetPalette.mutedColor(hex: mutedHex, inkHex: inkHex)
    DayPlanWidgetPalette.apply(faceHex: faceHex, inkHex: inkHex, mutedHex: mutedHex)
    return self
      .environment(\.pokitWidgetInk, ink)
      .environment(\.pokitWidgetMuted, muted)
      .environment(\.pokitWidgetCompletedTint, ink)
      .environment(\.pokitWidgetIconBox, ink.opacity(0.08))
      .environment(\.pokitWidgetCompletedIconBox, ink.opacity(0.12))
  }
}

/// 홈 위젯 공통 포스트잇 크롬 — 패딩만.
/// 면색은 `containerBackground` / `.background(face)` 한곳에서만 칠한다.
/// (여기서 또 `DayPlanWidgetPalette.face`를 칠하면 바깥·안쪽이 미묘하게 달라 보일 수 있음)
struct DayPlanPostItChrome<Content: View>: View {
  @Environment(\.widgetFamily) private var family
  private let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    let isSmall = family == .systemSmall
    content
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(.horizontal, isSmall ? 12 : 14)
      // 타이틀이 위 모서리에 붙지 않도록 상단 여백을 넉넉히
      .padding(.top, isSmall ? 22 : 24)
      .padding(.bottom, isSmall ? 12 : 14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
