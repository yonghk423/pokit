import Foundation
import SwiftUI
import WidgetKit

// MARK: - JSON (RN `PersistedDayPlan`와 필드명 맞춤)

private struct DayPlanBlockJson: Decodable {
  let id: String
  let title: String
  let category: String
  let startMinutes: Int
  let endMinutes: Int
  let order: Int
}

private struct DayPlanSnapshotJson: Decodable {
  let dateKey: String
  let blocks: [DayPlanBlockJson]
  let completedBlockIds: [String]
  let skippedBlockIds: [String]
}

private func loadSnapshot() -> DayPlanSnapshotJson? {
  guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readDayPlanJson(from: ud),
        !raw.isEmpty,
        let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(DayPlanSnapshotJson.self, from: data)
}

private func formatClock(_ minutes: Int) -> String {
  let safe = max(0, min(24 * 60 - 1, minutes))
  let h = safe / 60
  let m = safe % 60
  return String(format: "%d:%02d", h, m)
}

/// 시작 시각 → 제목 순(평등 목록, 예정/진행 구분 없음)
private func sortedBlocksChronologically(_ blocks: [DayPlanBlockJson]) -> [DayPlanBlockJson] {
  blocks.sorted { a, b in
    if a.startMinutes != b.startMinutes { return a.startMinutes < b.startMinutes }
    return a.order < b.order
  }
}

// MARK: - Flat rows (위젯 슬롯용 최소 모델)

private struct FlatRow: Identifiable {
  let id: String
  let title: String
  let timeLine: String
  let isCompleted: Bool
  let isSkipped: Bool
}

private struct FlatPlanModel {
  let headerTitle: String
  let countLabel: String
  let rows: [FlatRow]
  let emptyMessage: String?
}

private func buildFlatModel(snapshot: DayPlanSnapshotJson?) -> FlatPlanModel {
  guard let snapshot else {
    return FlatPlanModel(
      headerTitle: "POKIT",
      countLabel: "",
      rows: [],
      emptyMessage: "일정을 불러올 수 없어요"
    )
  }

  let blocks = sortedBlocksChronologically(snapshot.blocks)
  if blocks.isEmpty {
    return FlatPlanModel(
      headerTitle: "오늘",
      countLabel: "",
      rows: [],
      emptyMessage: "등록된 플로우가 없어요"
    )
  }

  let completed = Set(snapshot.completedBlockIds)
  let skipped = Set(snapshot.skippedBlockIds)

  let rows: [FlatRow] = blocks.map { b in
    let title = b.title.trimmingCharacters(in: .whitespacesAndNewlines)
    let displayTitle = title.isEmpty ? "플로우" : title
    return FlatRow(
      id: b.id,
      title: displayTitle,
      timeLine: formatClock(b.startMinutes),
      isCompleted: completed.contains(b.id),
      isSkipped: skipped.contains(b.id)
    )
  }

  return FlatPlanModel(
    headerTitle: "오늘 플로우",
    countLabel: "\(rows.count)개",
    rows: rows,
    emptyMessage: nil
  )
}

// MARK: - Timeline

private struct DayPlanEntry: TimelineEntry {
  let date: Date
  let model: FlatPlanModel
}

private struct DayPlanProvider: TimelineProvider {
  func placeholder(in context: Context) -> DayPlanEntry {
    let model = FlatPlanModel(
      headerTitle: "오늘 플로우",
      countLabel: "2개",
      rows: [
        FlatRow(id: "1", title: "독서", timeLine: "9:00", isCompleted: true, isSkipped: false),
        FlatRow(id: "2", title: "운동", timeLine: "16:30", isCompleted: false, isSkipped: false),
      ],
      emptyMessage: nil
    )
    return DayPlanEntry(date: Date(), model: model)
  }

  func getSnapshot(in context: Context, completion: @escaping (DayPlanEntry) -> Void) {
    let snap = loadSnapshot()
    completion(DayPlanEntry(date: Date(), model: buildFlatModel(snapshot: snap)))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DayPlanEntry>) -> Void) {
    let now = Date()
    let snap = loadSnapshot()
    let entry = DayPlanEntry(date: now, model: buildFlatModel(snapshot: snap))
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - Views

private struct DayPlanLockWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DayPlanEntry

  var body: some View {
    switch family {
    case .accessoryRectangular:
      accessoryRectangular
    case .accessoryInline:
      accessoryInline
    default:
      accessoryRectangular
    }
  }

  private var accessoryRectangular: some View {
    let m = entry.model
    return Group {
      if let msg = m.emptyMessage {
        VStack(alignment: .leading, spacing: 2) {
          Text(m.headerTitle)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
          Text(msg)
            .font(.caption.weight(.medium))
            .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      } else {
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Text(m.headerTitle)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(.secondary)
            Spacer(minLength: 4)
            Text(m.countLabel)
              .font(.caption2.weight(.bold))
              .foregroundStyle(.tertiary)
          }
          ForEach(m.rows.prefix(3)) { row in
            rowLine(row)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
    }
  }

  private func rowLine(_ row: FlatRow) -> some View {
    HStack(alignment: .center, spacing: 6) {
      Image(systemName: rowIcon(row))
        .font(.caption2)
        .foregroundStyle(rowTint(row))
        .frame(width: 14, alignment: .center)
      VStack(alignment: .leading, spacing: 0) {
        Text(row.title)
          .font(.caption.weight(.medium))
          .lineLimit(1)
          .strikethrough(row.isCompleted)
          .foregroundStyle(row.isCompleted ? .secondary : .primary)
        if row.isSkipped {
          Text("건너뜀 · \(row.timeLine)")
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .lineLimit(1)
        } else {
          Text(row.timeLine)
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .lineLimit(1)
        }
      }
      Spacer(minLength: 0)
    }
  }

  private func rowIcon(_ row: FlatRow) -> String {
    if row.isCompleted { return "checkmark.circle.fill" }
    if row.isSkipped { return "minus.circle" }
    return "circle"
  }

  private func rowTint(_ row: FlatRow) -> Color {
    if row.isCompleted { return .orange }
    if row.isSkipped { return .secondary }
    return .secondary
  }

  private var accessoryInline: some View {
    Text(accessoryInlineString)
      .font(.caption2)
      .lineLimit(1)
  }

  private var accessoryInlineString: String {
    let m = entry.model
    if let msg = m.emptyMessage {
      return "\(m.headerTitle) · \(msg)"
    }
    let first = m.rows.first
    let rest = max(0, m.rows.count - 1)
    if let f = first {
      let suffix = rest > 0 ? " 외 \(rest)개" : ""
      let state = f.isCompleted ? "완료" : (f.isSkipped ? "건너뜀" : f.timeLine)
      return "\(m.headerTitle) · \(f.title)\(suffix) · \(state)"
    }
    return m.headerTitle
  }
}

struct DayPlanLockWidget: Widget {
  private let kind = "PokitDayPlanWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DayPlanProvider()) { entry in
      DayPlanLockWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("오늘 플로우")
    .description("등록한 플로우를 같은 스타일의 목록으로 보여 줍니다. 완료·건너뜀은 앱에서 반영됩니다.")
    .supportedFamilies([.accessoryRectangular, .accessoryInline])
  }
}
