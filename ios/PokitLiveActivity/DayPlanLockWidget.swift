import SwiftUI
import WidgetKit

// MARK: - Lock Screen Views

private struct RoutineIconStrip: View {
  let iconNames: [String]
  let maxVisible: Int

  var body: some View {
    HStack(spacing: 3) {
      ForEach(Array(iconNames.prefix(maxVisible).enumerated()), id: \.offset) { _, name in
        Image(systemName: name)
          .font(.system(size: 9, weight: .semibold))
          .foregroundStyle(.primary)
          .frame(width: 14, height: 14)
          .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
              .fill(Color.primary.opacity(0.08))
          )
      }
      if iconNames.count > maxVisible {
        Text("…")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(.secondary)
          .frame(minWidth: 10)
      }
    }
  }
}

private struct DayPlanLockWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DayPlanWidgetEntry

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
    let m = entry.lockModel
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
        VStack(alignment: .leading, spacing: 3) {
          HStack(alignment: .firstTextBaseline) {
            Text(m.headerTitle)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(.secondary)
            Spacer(minLength: 4)
            Text(m.countLabel)
              .font(.caption2.weight(.bold))
              .foregroundStyle(.primary)
          }
          ViewThatFits(in: .horizontal) {
            RoutineIconStrip(iconNames: m.iconNames, maxVisible: 8)
            RoutineIconStrip(iconNames: m.iconNames, maxVisible: 6)
            RoutineIconStrip(iconNames: m.iconNames, maxVisible: 4)
            RoutineIconStrip(iconNames: m.iconNames, maxVisible: 3)
            RoutineIconStrip(iconNames: m.iconNames, maxVisible: 2)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
    }
  }

  private var accessoryInline: some View {
    Text(accessoryInlineString)
      .font(.caption2)
      .lineLimit(1)
  }

  private var accessoryInlineString: String {
    let m = entry.lockModel
    if let msg = m.emptyMessage {
      return "\(m.headerTitle) · \(msg)"
    }
    return "\(m.headerTitle) · \(m.countLabel)"
  }
}

struct DayPlanLockWidget: Widget {
  private let kind = "PokitDayPlanWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DayPlanWidgetProvider()) { entry in
      DayPlanLockWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("오늘 루틴")
    .description("오늘 루틴 아이콘과 개수를 보여 줍니다.")
    .supportedFamilies([.accessoryRectangular, .accessoryInline])
  }
}
