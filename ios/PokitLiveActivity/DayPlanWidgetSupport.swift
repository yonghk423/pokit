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
        emptyMessage: "일정을 불러올 수 없어요"
      ),
      home: DayPlanHomeWidgetModel(
        emptyMessage: "일정을 불러올 수 없어요",
        today: empty,
        completed: DayPlanRoutineSectionModel(title: "완료", count: 0, iconNames: []),
        quickMemos: [],
        routineItems: []
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
    emptyMessage = "등록된 루틴이 없어요"
  } else {
    lockIcons = todaySection.iconNames + completedSection.iconNames
    lockCount = totalPlanned
    emptyMessage = nil
  }

  let homeEmptyMessage: String? = (totalPlanned == 0 && quickMemos.isEmpty) ? emptyMessage : nil

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
      routineItems: routineItems
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
        ]
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

/// `src/shared/config/retroFlat.ts` `RetroFlatColors.light` 와 동기
enum DayPlanWidgetPalette {
  static let cream = Color(red: 245 / 255, green: 242 / 255, blue: 235 / 255)
  static let ink = Color(red: 24 / 255, green: 26 / 255, blue: 46 / 255)
  static let muted = Color(red: 64 / 255, green: 72 / 255, blue: 72 / 255)
  static let iconBox = Color.black.opacity(0.06)
  /// 완료 아이콘·진행 바·완료 수치 — `primary` `#356668`
  static let completedTint = Color(red: 53 / 255, green: 102 / 255, blue: 104 / 255)
  /// 완료 루틴 아이콘 배경 — `primaryContainer` `#A8DADC`
  static let completedIconBox = Color(red: 168 / 255, green: 218 / 255, blue: 220 / 255)
  static let divider = Color.black.opacity(0.08)
}
