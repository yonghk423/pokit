import SwiftUI
import WidgetKit

// MARK: - Home Screen Views

private struct HomeRoutineIconCell: View {
  let name: String
  let size: CGFloat
  let iconSize: CGFloat
  var completed: Bool = false

  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      Image(systemName: name)
        .font(.system(size: iconSize, weight: .semibold))
        .foregroundStyle(completed ? DayPlanWidgetPalette.completedTint : DayPlanWidgetPalette.ink)
        .frame(width: size, height: size)
        .background(
          RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
            .fill(completed ? DayPlanWidgetPalette.completedTint.opacity(0.12) : DayPlanWidgetPalette.iconBox)
        )

      if completed {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: max(7, iconSize * 0.68), weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.completedTint)
          .offset(x: 2, y: 2)
      }
    }
  }
}

private struct HomeIconGrid: View {
  let iconNames: [String]
  let columns: Int
  let cellSize: CGFloat
  let iconSize: CGFloat
  let maxVisible: Int
  var completed: Bool = false

  private var gridColumns: [GridItem] {
    Array(repeating: GridItem(.fixed(cellSize), spacing: 5), count: columns)
  }

  var body: some View {
    let visible = Array(iconNames.prefix(maxVisible))
    let hasMore = iconNames.count > maxVisible

    LazyVGrid(columns: gridColumns, alignment: .leading, spacing: 5) {
      ForEach(Array(visible.enumerated()), id: \.offset) { _, name in
        HomeRoutineIconCell(name: name, size: cellSize, iconSize: iconSize, completed: completed)
      }
      if hasMore {
        Text("…")
          .font(.system(size: iconSize, weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .frame(width: cellSize, height: cellSize)
      }
    }
  }
}

private struct HomeStatusIconGrid: View {
  let items: [DayPlanRoutineStatusItem]
  let columns: Int
  let cellSize: CGFloat
  let iconSize: CGFloat
  let maxVisible: Int

  private var gridColumns: [GridItem] {
    Array(repeating: GridItem(.fixed(cellSize), spacing: 4), count: columns)
  }

  var body: some View {
    let visible = Array(items.prefix(maxVisible))
    let hasMore = items.count > maxVisible

    LazyVGrid(columns: gridColumns, alignment: .leading, spacing: 4) {
      ForEach(Array(visible.enumerated()), id: \.offset) { _, item in
        HomeRoutineIconCell(
          name: item.iconName,
          size: cellSize,
          iconSize: iconSize,
          completed: item.isCompleted
        )
      }
      if hasMore {
        Text("…")
          .font(.system(size: iconSize, weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .frame(width: cellSize, height: cellSize)
      }
    }
  }
}

private struct HomeAdaptiveIconRow: View {
  let iconNames: [String]
  let cellSize: CGFloat
  let iconSize: CGFloat
  var completed: Bool = false
  private let spacing: CGFloat = 5

  var body: some View {
    GeometryReader { geo in
      let maxSlots = max(1, Int(floor((geo.size.width + spacing) / (cellSize + spacing))))
      let hasMore = iconNames.count > maxSlots
      let showCount = hasMore ? max(1, maxSlots - 1) : iconNames.count
      let visible = Array(iconNames.prefix(showCount))

      HStack(spacing: spacing) {
        ForEach(Array(visible.enumerated()), id: \.offset) { _, name in
          HomeRoutineIconCell(
            name: name,
            size: cellSize,
            iconSize: iconSize,
            completed: completed
          )
        }
        if hasMore {
          Text("…")
            .font(.system(size: iconSize + 1, weight: .bold))
            .foregroundStyle(DayPlanWidgetPalette.muted)
            .frame(width: cellSize, height: cellSize)
        }
        Spacer(minLength: 0)
      }
    }
    .frame(height: cellSize)
  }
}

private struct HomeSectionHeader: View {
  let title: String
  let count: Int
  var completed: Bool = false
  var compact: Bool = false

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Text(title)
        .font(.system(size: compact ? 11 : 12, weight: .bold))
        .foregroundStyle(DayPlanWidgetPalette.muted)
        .lineLimit(1)

      Spacer(minLength: 4)

      Text("\(count)개")
        .font(.system(size: compact ? 20 : 24, weight: .bold, design: .rounded))
        .foregroundStyle(completed ? DayPlanWidgetPalette.completedTint : DayPlanWidgetPalette.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
  }
}

private struct HomeProgressBar: View {
  let completed: Int
  let total: Int

  private var ratio: Double {
    guard total > 0 else { return 0 }
    return Double(completed) / Double(total)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule()
            .fill(DayPlanWidgetPalette.iconBox)
          Capsule()
            .fill(DayPlanWidgetPalette.completedTint)
            .frame(width: max(0, geo.size.width * ratio))
        }
      }
      .frame(height: 5)

      Text(total > 0 ? "\(completed)/\(total) 완료" : "루틴 없음")
        .font(.system(size: 10, weight: .semibold))
        .foregroundStyle(DayPlanWidgetPalette.muted)
        .lineLimit(1)
    }
  }
}

private struct HomeQuickMemoSection: View {
  let memos: [DayPlanQuickMemoLineModel]

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(spacing: 5) {
        Image(systemName: "text.bubble.fill")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.ink)
        Text("빠른 메모")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.muted)
      }

      ForEach(memos) { memo in
        HStack(alignment: .top, spacing: 5) {
          Circle()
            .fill(memo.isDraft ? DayPlanWidgetPalette.muted.opacity(0.45) : DayPlanWidgetPalette.ink)
            .frame(width: 4, height: 4)
            .padding(.top, 5)
          Text(memo.text)
            .font(.system(size: 12, weight: memo.isDraft ? .medium : .semibold))
            .foregroundStyle(memo.isDraft ? DayPlanWidgetPalette.muted : DayPlanWidgetPalette.ink)
            .italic(memo.isDraft)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
        }
      }
    }
  }
}

/// 메모가 있을 때 — 한 줄 라벨 + 가로 아이콘 (공간 절약)
private struct HomeCompactRoutineRow: View {
  let section: DayPlanRoutineSectionModel
  let completed: Bool

  var body: some View {
    HStack(alignment: .center, spacing: 8) {
      VStack(alignment: .leading, spacing: 1) {
        Text(section.title)
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .lineLimit(1)
        Text(section.countLabel)
          .font(.system(size: 17, weight: .bold, design: .rounded))
          .foregroundStyle(completed ? DayPlanWidgetPalette.completedTint : DayPlanWidgetPalette.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .frame(width: 52, alignment: .leading)

      if section.isEmpty {
        Text(completed ? "아직 없어요" : "없음")
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .lineLimit(1)
      } else {
        HomeAdaptiveIconRow(
          iconNames: section.iconNames,
          cellSize: 20,
          iconSize: 9,
          completed: completed
        )
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}

private struct DayPlanHomeWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DayPlanWidgetEntry

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        smallBody
      case .systemMedium:
        mediumBody
      default:
        smallBody
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(family == .systemSmall ? 12 : 14)
  }
}

extension DayPlanHomeWidgetEntryView {
  private var smallBody: some View {
    let home = entry.homeModel

    return Group {
      if let msg = home.emptyMessage {
        VStack(alignment: .leading, spacing: 4) {
          Text("오늘 루틴")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(DayPlanWidgetPalette.ink)
          Text(msg)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(DayPlanWidgetPalette.muted)
            .lineLimit(3)
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          HomeSectionHeader(
            title: "오늘 루틴",
            count: home.today.count,
            compact: true
          )

          Text(smallStatusCaption(home))
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(DayPlanWidgetPalette.muted)
            .lineLimit(1)

          Spacer(minLength: 0)

          HomeStatusIconGrid(
            items: home.routineItems,
            columns: 4,
            cellSize: 22,
            iconSize: 10,
            maxVisible: 8
          )

          Spacer(minLength: 0)
        }
      }
    }
  }

  private func smallStatusCaption(_ home: DayPlanHomeWidgetModel) -> String {
    let pending = home.pendingCount
    let done = home.completed.count
    if done > 0 && pending > 0 {
      return "완료 \(done) · 남음 \(pending)"
    }
    if done > 0 {
      return "완료 \(done)"
    }
    return "남음 \(pending)"
  }

  private var mediumBody: some View {
    let home = entry.homeModel

    return Group {
      if let msg = home.emptyMessage {
        Text(msg)
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .lineLimit(3)
      } else if home.hasQuickMemos {
        mediumBodyWithMemo(home)
      } else {
        mediumBodyNoMemo(home)
      }
    }
  }

  private func mediumBodyWithMemo(_ home: DayPlanHomeWidgetModel) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HomeCompactRoutineRow(section: home.today, completed: false)
        .padding(.bottom, 6)

      HomeCompactRoutineRow(section: home.completed, completed: true)
        .padding(.bottom, 6)

      Rectangle()
        .fill(DayPlanWidgetPalette.divider)
        .frame(height: 1)
        .padding(.bottom, 6)

      HomeQuickMemoSection(memos: home.quickMemos)

      Spacer(minLength: 0)
    }
  }

  private func mediumBodyNoMemo(_ home: DayPlanHomeWidgetModel) -> some View {
    let total = home.today.count

    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 10) {
        mediumNoMemoColumn(section: home.today, completed: false)
        mediumNoMemoColumn(section: home.completed, completed: true)
      }

      Spacer(minLength: 0)

      HomeProgressBar(completed: home.completed.count, total: total)
        .padding(.top, 8)
    }
  }

  private func mediumNoMemoColumn(section: DayPlanRoutineSectionModel, completed: Bool) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HomeSectionHeader(title: section.title, count: section.count, completed: completed, compact: true)

      if section.isEmpty {
        Text(completed ? "아직 없어요" : "없음")
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(DayPlanWidgetPalette.muted)
          .frame(maxWidth: .infinity, minHeight: 54, alignment: .topLeading)
      } else {
        HomeIconGrid(
          iconNames: section.iconNames,
          columns: 4,
          cellSize: 26,
          iconSize: 12,
          maxVisible: 8,
          completed: completed
        )
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
  }
}

struct DayPlanHomeWidget: Widget {
  private let kind = "PokitDayPlanHomeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DayPlanWidgetProvider()) { entry in
      if #available(iOSApplicationExtension 17.0, *) {
        DayPlanHomeWidgetEntryView(entry: entry)
          .containerBackground(for: .widget) {
            DayPlanWidgetPalette.cream
          }
      } else {
        DayPlanHomeWidgetEntryView(entry: entry)
          .background(DayPlanWidgetPalette.cream)
      }
    }
    .configurationDisplayName("오늘 루틴")
    .description("홈 화면에서 오늘·완료 루틴과 빠른 메모를 확인해요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

#if DEBUG
@available(iOS 17.0, *)
#Preview("Small", as: .systemSmall) {
  DayPlanHomeWidget()
} timeline: {
  DayPlanWidgetEntry(
    date: Date(),
    lockModel: DayPlanRoutineIconsModel(
      headerTitle: "오늘 루틴",
      count: 11,
      iconNames: ["brain", "drop.fill", "figure.run", "book.fill", "moon.fill", "dumbbell.fill", "wind", "pill.fill"],
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
        count: 5,
        iconNames: ["brain", "book.closed.fill", "square.and.pencil", "drop.fill", "brain.head.profile"]
      ),
      quickMemos: [],
      routineItems: [
        DayPlanRoutineStatusItem(iconName: "brain", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "book.closed.fill", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "square.and.pencil", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "drop.fill", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "brain.head.profile", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "figure.run", isCompleted: false),
        DayPlanRoutineStatusItem(iconName: "book.fill", isCompleted: false),
        DayPlanRoutineStatusItem(iconName: "calendar.badge.clock", isCompleted: false),
      ]
    )
  )
}

@available(iOS 17.0, *)
#Preview("Medium · no memo", as: .systemMedium) {
  DayPlanHomeWidget()
} timeline: {
  DayPlanWidgetEntry(
    date: Date(),
    lockModel: DayPlanRoutineIconsModel(
      headerTitle: "오늘 루틴",
      count: 11,
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
        count: 5,
        iconNames: ["brain", "book.closed.fill", "square.and.pencil", "drop.fill", "brain.head.profile"]
      ),
      quickMemos: [],
      routineItems: [
        DayPlanRoutineStatusItem(iconName: "brain", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "book.closed.fill", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "square.and.pencil", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "drop.fill", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "brain.head.profile", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "figure.run", isCompleted: false),
        DayPlanRoutineStatusItem(iconName: "book.fill", isCompleted: false),
      ]
    )
  )
}

@available(iOS 17.0, *)
#Preview("Medium · memo", as: .systemMedium) {
  DayPlanHomeWidget()
} timeline: {
  DayPlanWidgetEntry(
    date: Date(),
    lockModel: DayPlanRoutineIconsModel(
      headerTitle: "오늘 루틴",
      count: 7,
      iconNames: ["brain", "drop.fill", "figure.run", "book.fill"],
      emptyMessage: nil
    ),
    homeModel: DayPlanHomeWidgetModel(
      emptyMessage: nil,
      today: DayPlanRoutineSectionModel(
        title: "오늘 루틴",
        count: 11,
        iconNames: ["brain", "drop.fill", "figure.run", "moon.fill", "dumbbell.fill", "eye"]
      ),
      completed: DayPlanRoutineSectionModel(
        title: "완료",
        count: 2,
        iconNames: ["book.fill", "wind", "pill.fill"]
      ),
      quickMemos: [
        DayPlanQuickMemoLineModel(id: "m1", text: "저녁에 장보기", isDone: false, isDraft: false),
        DayPlanQuickMemoLineModel(id: "m2", text: "친구에게 연락", isDone: false, isDraft: true),
      ],
      routineItems: [
        DayPlanRoutineStatusItem(iconName: "book.fill", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "wind", isCompleted: true),
        DayPlanRoutineStatusItem(iconName: "brain", isCompleted: false),
        DayPlanRoutineStatusItem(iconName: "drop.fill", isCompleted: false),
      ]
    )
  )
}

@available(iOS 17.0, *)
#Preview("Empty", as: .systemSmall) {
  DayPlanHomeWidget()
} timeline: {
  DayPlanWidgetEntry(
    date: Date(),
    lockModel: DayPlanRoutineIconsModel(
      headerTitle: "오늘 루틴",
      count: 0,
      iconNames: [],
      emptyMessage: "등록된 루틴이 없어요"
    ),
    homeModel: DayPlanHomeWidgetModel(
      emptyMessage: "등록된 루틴이 없어요",
      today: DayPlanRoutineSectionModel(title: "오늘 루틴", count: 0, iconNames: []),
      completed: DayPlanRoutineSectionModel(title: "완료", count: 0, iconNames: []),
      quickMemos: [],
      routineItems: []
    )
  )
}
#endif
