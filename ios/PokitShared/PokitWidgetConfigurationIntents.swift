import AppIntents
import Foundation
import WidgetKit

/// 위젯 인스턴스별 선택 Intent.
/// Edit Widget UI는 메인 앱 프로세스에서도 이 타입을 찾으므로
/// **앱 타깃 + 위젯 확장 타깃** 양쪽에 컴파일되어야 한다.

@available(iOS 17.0, *)
private func pokitWidgetEntityCollection<E: AppEntity>(
  _ entities: [E],
  section: LocalizedStringResource
) -> IntentItemCollection<E> {
  IntentItemCollection(
    sections: [
      IntentItemSection(section, items: entities.map { IntentItem($0) }),
    ]
  )
}

// MARK: - Pinned routine

@available(iOS 17.0, *)
public struct PinnedRoutineEntity: AppEntity, Hashable {
  public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "widget.routine.pick")
  public static var defaultQuery = PinnedRoutineEntityQuery()

  public var id: String
  public var title: String

  public init(id: String, title: String) {
    self.id = id
    self.title = title
  }

  public static func == (lhs: PinnedRoutineEntity, rhs: PinnedRoutineEntity) -> Bool {
    lhs.id == rhs.id
  }

  public func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  public var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)")
  }
}

@available(iOS 17.0, *)
public struct PinnedRoutineEntityQuery: EntityQuery {
  public init() {}

  public func entities(for identifiers: [PinnedRoutineEntity.ID]) async throws -> [PinnedRoutineEntity] {
    let all = Self.loadEntities()
    var byId: [String: PinnedRoutineEntity] = [:]
    for item in all where byId[item.id] == nil {
      byId[item.id] = item
    }
    return identifiers.map { id in
      byId[id] ?? PinnedRoutineEntity(id: id, title: PokitWidgetL10n.reselectRoutine)
    }
  }

  public func suggestedEntities() async throws -> IntentItemCollection<PinnedRoutineEntity> {
    pokitWidgetEntityCollection(Self.loadEntities(), section: "widget.routine.name")
  }

  public func defaultResult() async -> PinnedRoutineEntity? {
    let snapshot = Self.loadCatalog()
    let all = Self.loadEntities()
    if let fallback = snapshot.fallbackKey, let match = all.first(where: { $0.id == fallback }) {
      return match
    }
    return all.first
  }

  private static func loadCatalog() -> (fallbackKey: String?, rows: [(id: String, title: String)]) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
          let raw = PokitAppGroup.readPinnedRoutineJson(from: ud),
          let data = raw.data(using: .utf8)
    else {
      return (nil, [])
    }

    struct Row: Decodable {
      let categoryKey: String?
      let title: String?
    }
    struct Bundle: Decodable {
      let fallbackCategoryKey: String?
      let routines: [Row]?
    }
    struct Legacy: Decodable {
      let categoryKey: String?
      let title: String?
    }

    if let bundle = try? JSONDecoder().decode(Bundle.self, from: data) {
      let rows = (bundle.routines ?? []).compactMap { row -> (id: String, title: String)? in
        let id = (row.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let title = (row.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty, !title.isEmpty else { return nil }
        return (id, title)
      }
      let fallback = (bundle.fallbackCategoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      return (fallback.isEmpty ? nil : fallback, rows)
    }

    if let single = try? JSONDecoder().decode(Legacy.self, from: data) {
      let id = (single.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      let title = (single.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      guard !id.isEmpty, !title.isEmpty else { return (nil, []) }
      return (id, [(id, title)])
    }
    return (nil, [])
  }

  static func loadEntities() -> [PinnedRoutineEntity] {
    let rows = loadCatalog().rows
    if rows.isEmpty {
      return [PinnedRoutineEntity(id: "__empty__", title: PokitWidgetL10n.openAppThenReselect)]
    }
    return rows.map { PinnedRoutineEntity(id: $0.id, title: $0.title) }
  }
}

@available(iOS 17.0, *)
public struct PinnedRoutineOptionsProvider: DynamicOptionsProvider {
  public init() {}

  public func results() async throws -> IntentItemCollection<PinnedRoutineEntity> {
    pokitWidgetEntityCollection(PinnedRoutineEntityQuery.loadEntities(), section: "widget.routine.name")
  }
}

@available(iOS 17.0, *)
public struct SelectPinnedRoutineIntent: WidgetConfigurationIntent {
  public static var title: LocalizedStringResource = "widget.routine.name"
  public static var description = IntentDescription(stringLiteral: "widget.routine.intentDescription")
  public static var isDiscoverable: Bool { false }
  /// 위젯 탭은 `widgetURL`로만 앱을 연다. Intent 실행으로 열면 홈이 흐려진 채 멈출 수 있다.
  public static var openAppWhenRun: Bool { false }

  @Parameter(title: "widget.routine.pick", optionsProvider: PinnedRoutineOptionsProvider())
  public var routine: PinnedRoutineEntity?

  public init() {}

  public init(routine: PinnedRoutineEntity?) {
    self.routine = routine
  }

  public static var parameterSummary: some ParameterSummary {
    Summary {
      \.$routine
    }
  }
}

// MARK: - Bookstore

@available(iOS 17.0, *)
public struct BookstoreWidgetBookEntity: AppEntity, Hashable {
  public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "widget.bookstore.pick")
  public static var defaultQuery = BookstoreWidgetBookEntityQuery()

  public var id: String
  public var title: String
  public var subtitle: String

  public init(id: String, title: String, subtitle: String = "") {
    self.id = id
    self.title = title
    self.subtitle = subtitle
  }

  public static func == (lhs: BookstoreWidgetBookEntity, rhs: BookstoreWidgetBookEntity) -> Bool {
    lhs.id == rhs.id
  }

  public func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  public var displayRepresentation: DisplayRepresentation {
    let shown = title.trimmingCharacters(in: .whitespacesAndNewlines)
    let label = shown.isEmpty ? String(localized: "widget.bookstore.pick") : shown
    if subtitle.isEmpty {
      return DisplayRepresentation(title: "\(label)")
    }
    return DisplayRepresentation(title: "\(label)", subtitle: "\(subtitle)")
  }
}

@available(iOS 17.0, *)
public struct BookstoreWidgetBookEntityQuery: EntityQuery {
  public init() {}

  public func entities(for identifiers: [BookstoreWidgetBookEntity.ID]) async throws -> [BookstoreWidgetBookEntity] {
    let all = Self.loadEntities()
    var byId: [String: BookstoreWidgetBookEntity] = [:]
    for item in all where byId[item.id] == nil {
      byId[item.id] = item
    }
    return identifiers.map { id in
      byId[id] ?? BookstoreWidgetBookEntity(id: id, title: String(localized: "widget.bookstore.pickAgain"))
    }
  }

  public func suggestedEntities() async throws -> IntentItemCollection<BookstoreWidgetBookEntity> {
    pokitWidgetEntityCollection(Self.loadEntities(), section: "widget.bookstore.name")
  }

  public func defaultResult() async -> BookstoreWidgetBookEntity? {
    let catalog = Self.loadCatalog()
    let all = Self.loadEntities()
    if let fallback = catalog.fallbackId, let match = all.first(where: { $0.id == fallback }) {
      return match
    }
    return all.first
  }

  private static func loadCatalog() -> (fallbackId: String?, rows: [(id: String, title: String, subtitle: String)]) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
          let raw = PokitAppGroup.readBookstoreWidgetJson(from: ud),
          let data = raw.data(using: .utf8)
    else {
      return (nil, [])
    }
    struct Row: Decodable {
      let id: String?
      let title: String?
      let author: String?
      let statusLabel: String?
    }
    struct Bundle: Decodable {
      let fallbackBookId: String?
      let books: [Row]?
    }
    guard let bundle = try? JSONDecoder().decode(Bundle.self, from: data) else {
      return (nil, [])
    }
    var seenIds = Set<String>()
    var titleCounts: [String: Int] = [:]
    var rows: [(id: String, title: String, subtitle: String)] = []
    for row in bundle.books ?? [] {
      let id = (row.id ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      guard !id.isEmpty, !seenIds.contains(id) else { continue }
      seenIds.insert(id)
      var title = (row.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      if title.isEmpty { title = String(localized: "widget.bookstore.untitled") }
      let count = (titleCounts[title] ?? 0) + 1
      titleCounts[title] = count
      if count > 1 {
        title = "\(title) · \(count)"
      }
      let author = (row.author ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      let status = (row.statusLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      let subtitle = [status, author].filter { !$0.isEmpty }.joined(separator: " · ")
      rows.append((id, title, subtitle))
    }
    let fallback = (bundle.fallbackBookId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return (fallback.isEmpty ? nil : fallback, rows)
  }

  static func loadEntities() -> [BookstoreWidgetBookEntity] {
    loadCatalog().rows.map { BookstoreWidgetBookEntity(id: $0.id, title: $0.title, subtitle: $0.subtitle) }
  }
}

@available(iOS 17.0, *)
public struct BookstoreBookOptionsProvider: DynamicOptionsProvider {
  public init() {}

  public func results() async throws -> IntentItemCollection<BookstoreWidgetBookEntity> {
    pokitWidgetEntityCollection(BookstoreWidgetBookEntityQuery.loadEntities(), section: "widget.bookstore.name")
  }
}

@available(iOS 17.0, *)
public struct SelectBookstoreBookIntent: WidgetConfigurationIntent {
  public static var title: LocalizedStringResource = "widget.bookstore.name"
  public static var description = IntentDescription(stringLiteral: "widget.bookstore.intentDescription")
  public static var isDiscoverable: Bool { false }
  public static var openAppWhenRun: Bool { false }

  @Parameter(title: "widget.bookstore.pick", optionsProvider: BookstoreBookOptionsProvider())
  public var book: BookstoreWidgetBookEntity?

  public init() {}

  public init(book: BookstoreWidgetBookEntity?) {
    self.book = book
  }

  public static var parameterSummary: some ParameterSummary {
    Summary {
      \.$book
    }
  }
}

// MARK: - Note

@available(iOS 17.0, *)
public struct NoteWidgetPageEntity: AppEntity, Hashable {
  public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "widget.note.pick")
  public static var defaultQuery = NoteWidgetPageEntityQuery()

  public var id: String
  public var title: String
  public var subtitle: String

  public init(id: String, title: String, subtitle: String = "") {
    self.id = id
    self.title = title
    self.subtitle = subtitle
  }

  public static func == (lhs: NoteWidgetPageEntity, rhs: NoteWidgetPageEntity) -> Bool {
    lhs.id == rhs.id
  }

  public func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  public var displayRepresentation: DisplayRepresentation {
    let shown = title.trimmingCharacters(in: .whitespacesAndNewlines)
    let label = shown.isEmpty ? String(localized: "widget.note.pick") : shown
    if subtitle.isEmpty {
      return DisplayRepresentation(title: "\(label)")
    }
    return DisplayRepresentation(title: "\(label)", subtitle: "\(subtitle)")
  }
}

@available(iOS 17.0, *)
public struct NoteWidgetPageEntityQuery: EntityQuery {
  public init() {}

  public func entities(for identifiers: [NoteWidgetPageEntity.ID]) async throws -> [NoteWidgetPageEntity] {
    let all = Self.loadEntities()
    var byId: [String: NoteWidgetPageEntity] = [:]
    for item in all where byId[item.id] == nil {
      byId[item.id] = item
    }
    return identifiers.map { id in
      byId[id] ?? NoteWidgetPageEntity(id: id, title: PokitWidgetL10n.reselectNote)
    }
  }

  public func suggestedEntities() async throws -> IntentItemCollection<NoteWidgetPageEntity> {
    pokitWidgetEntityCollection(Self.loadEntities(), section: "widget.note.name")
  }

  public func defaultResult() async -> NoteWidgetPageEntity? {
    let catalog = Self.loadCatalog()
    let all = Self.loadEntities()
    if let fallback = catalog.fallbackId, let match = all.first(where: { $0.id == fallback }) {
      return match
    }
    return all.first
  }

  private static func loadCatalog() -> (fallbackId: String?, rows: [(id: String, title: String, subtitle: String)]) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
          let raw = PokitAppGroup.readNoteWidgetJson(from: ud),
          let data = raw.data(using: .utf8)
    else {
      return (nil, [])
    }
    struct Row: Decodable {
      let id: String?
      let title: String?
      let preview: String?
      let createdDateKey: String?
    }
    struct Bundle: Decodable {
      let fallbackPageId: String?
      let pages: [Row]?
    }
    guard let bundle = try? JSONDecoder().decode(Bundle.self, from: data) else {
      return (nil, [])
    }
    var seenIds = Set<String>()
    var rows: [(id: String, title: String, subtitle: String)] = []
    for (index, row) in (bundle.pages ?? []).enumerated() {
      let id = (row.id ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      guard !id.isEmpty, !seenIds.contains(id) else { continue }
      seenIds.insert(id)
      let dateKey = (row.createdDateKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      var title = (row.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      if title.isEmpty {
        title = Self.dateTitle(from: dateKey, fallbackIndex: index)
      }
      let preview = (row.preview ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      let subtitle = preview.isEmpty ? dateKey : preview
      rows.append((id, title, subtitle))
    }
    let fallback = (bundle.fallbackPageId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return (fallback.isEmpty ? nil : fallback, rows)
  }

  static func loadEntities() -> [NoteWidgetPageEntity] {
    let rows = loadCatalog().rows
    if rows.isEmpty {
      // 빈 목록이면 Edit Widget 피커가 멈추는 기기가 있어 안내 항목을 둔다.
      return [
        NoteWidgetPageEntity(
          id: "__empty__",
          title: PokitWidgetL10n.openAppThenReselect,
          subtitle: ""
        ),
      ]
    }
    return rows.map { NoteWidgetPageEntity(id: $0.id, title: $0.title, subtitle: $0.subtitle) }
  }

  private static func dateTitle(from dateKey: String, fallbackIndex: Int) -> String {
    let parts = dateKey.split(separator: "-")
    if parts.count == 3,
       let year = Int(parts[0]),
       let month = Int(parts[1]),
       let day = Int(parts[2]) {
      return PokitWidgetL10n.noteDateTitle(year: year, month: month, day: day)
    }
    return PokitWidgetL10n.noteIndexedTitle(fallbackIndex + 1)
  }
}

@available(iOS 17.0, *)
public struct NotePageOptionsProvider: DynamicOptionsProvider {
  public init() {}

  public func results() async throws -> IntentItemCollection<NoteWidgetPageEntity> {
    pokitWidgetEntityCollection(NoteWidgetPageEntityQuery.loadEntities(), section: "widget.note.name")
  }
}

@available(iOS 17.0, *)
public struct SelectNotePageIntent: WidgetConfigurationIntent {
  public static var title: LocalizedStringResource = "widget.note.name"
  public static var description = IntentDescription(stringLiteral: "widget.note.intentDescription")
  public static var isDiscoverable: Bool { false }
  /// 설정 Intent는 탭에서 실행하지 않는다 (홈 흐림 고정 방지). 탭은 OpenPokitDayNoteIntent.
  public static var openAppWhenRun: Bool { false }

  @Parameter(title: "widget.note.pick", optionsProvider: NotePageOptionsProvider())
  public var page: NoteWidgetPageEntity?

  public init() {}

  public init(page: NoteWidgetPageEntity?) {
    self.page = page
  }

  public static var parameterSummary: some ParameterSummary {
    Summary {
      \.$page
    }
  }
}

/// 노트 위젯 탭 전용 — 설정 Intent와 분리해 앱만 연다.
@available(iOS 17.0, *)
public struct OpenPokitDayNoteIntent: AppIntent {
  public static var title: LocalizedStringResource = "widget.note.pick"
  public static var description = IntentDescription(stringLiteral: "widget.note.openDescription")
  public static var openAppWhenRun: Bool { true }
  public static var isDiscoverable: Bool { false }

  public init() {}

  public func perform() async throws -> some IntentResult {
    PokitAppGroup.setPendingPlanMode("dayNote")
    return .result()
  }
}
