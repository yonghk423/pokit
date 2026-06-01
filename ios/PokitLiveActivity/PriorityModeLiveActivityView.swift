import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
enum PriorityModeLiveActivityView {
  private static let orange = Color(red: 0.78, green: 0.78, blue: 0.82)
  private static let headlineColor = Color(red: 0.10, green: 0.10, blue: 0.10)
  private static let mutedColor = headlineColor.opacity(0.55)

  @ViewBuilder
  static func lockScreenBody(
    context: ActivityViewContext<PokitLiveActivityAttributes>,
    compact: Bool
  ) -> some View {
    if let p = context.state.priorityLive {
      priorityContent(context: context, p: p, compact: compact)
    } else {
      EmptyView()
    }
  }

  @ViewBuilder
  static func lockScreenFallbackBody(
    context: ActivityViewContext<PokitLiveActivityAttributes>,
    compact: Bool
  ) -> some View {
    let rows = context.state.checklistRows
    let totalFromLabel = parseTotalCount(context.state.checklistCountLabel)
    let total = max(rows.count, totalFromLabel)
    let completedCount = rows.filter { $0.state == "completed" }.count
    let progress01 = total > 0 ? Double(completedCount) / Double(total) : 0

    let currentIndex = rows.firstIndex(where: { $0.state == "current" }) ?? 0
    let fallbackTitle = context.state.title.trimmingCharacters(in: .whitespacesAndNewlines)
    let activeTitle: String = {
      if rows.indices.contains(currentIndex) {
        let rowTitle = rows[currentIndex].title.trimmingCharacters(in: .whitespacesAndNewlines)
        if !rowTitle.isEmpty { return rowTitle }
      }
      return fallbackTitle.isEmpty ? "활성 플로우" : fallbackTitle
    }()

    let window = context.state.timeRangeLabel.trimmingCharacters(in: .whitespacesAndNewlines)
    let windowLabel = window.isEmpty ? context.state.checklistTitle : window

    let listRows = rows.enumerated().map { idx, row in
      PokitLiveActivityAttributes.ContentState.PriorityLiveContent.UpcomingRow(
        order: idx + 1,
        title: row.title,
        timeLabel: row.timeLabel
      )
    }

    let p = PokitLiveActivityAttributes.ContentState.PriorityLiveContent(
      windowLabel: windowLabel,
      activeTitle: activeTitle,
      activeOrder: min(max(1, currentIndex + 1), max(1, total)),
      totalTasks: max(1, total),
      progress01: progress01,
      /// 잠금화면은 `listRows` 전체만 쓴다. `upcoming`(현재 이후만)과 이중으로 쓰면 `priorityLockListSource`에서 꼬일 수 있음.
      upcoming: [],
      listRows: listRows
    )

    priorityContent(context: context, p: p, compact: compact)
  }

  private static func parseTotalCount(_ label: String) -> Int {
    let digits = label.filter(\.isNumber)
    return Int(digits) ?? 0
  }

  /// 잠금화면 리스트 소스 — 우선순위 단순화:
  /// 1) `p.listRows`가 있으면 **항상 전체** 사용 (RN·폴백 모두 여기에 전체를 넣는다)
  /// 2) 없으면 레거시 `p.upcoming`
  /// 3) 그것도 없으면 `context.state.checklistRows`를 그대로 매핑
  private static func priorityLockListSource(
    context: ActivityViewContext<PokitLiveActivityAttributes>,
    p: PokitLiveActivityAttributes.ContentState.PriorityLiveContent
  ) -> [PokitLiveActivityAttributes.ContentState.PriorityLiveContent.UpcomingRow] {
    if let rows = p.listRows, !rows.isEmpty {
      return rows
    }
    if !p.upcoming.isEmpty {
      return p.upcoming
    }
    return context.state.checklistRows.enumerated().map { idx, row in
      PokitLiveActivityAttributes.ContentState.PriorityLiveContent.UpcomingRow(
        order: idx + 1,
        title: row.title.trimmingCharacters(in: .whitespacesAndNewlines),
        timeLabel: row.timeLabel
      )
    }
  }

  @ViewBuilder
  private static func priorityTimerBlock(
    context: ActivityViewContext<PokitLiveActivityAttributes>,
    isFinished: Bool,
    isPaused: Bool,
    isStandby: Bool,
    standbyStartCountdown: Bool,
    compact: Bool
  ) -> some View {
    let timerFont: Font = .system(
      size: compact ? 12 : 13,
      weight: .bold,
      design: .rounded
    )
    Group {
      if isFinished {
        Text("완료")
          .font(timerFont)
          .foregroundStyle(.white.opacity(0.58))
      } else if standbyStartCountdown, let startsAt = context.state.startsAt {
        Text(startsAt, style: .timer)
          .font(timerFont)
          .monospacedDigit()
          .foregroundStyle(.white.opacity(0.68))
      } else if let endsAt = context.state.endsAt, !isPaused {
        Text(endsAt, style: .timer)
          .font(timerFont)
          .monospacedDigit()
          .foregroundStyle(.white.opacity(0.68))
      } else if let paused = context.state.pausedRemainingSeconds {
        Text(formatClock(paused))
          .font(timerFont)
          .monospacedDigit()
          .foregroundStyle(.white.opacity(0.68))
      } else {
        Text("--:--")
          .font(timerFont)
          .monospacedDigit()
          .foregroundStyle(.white.opacity(0.68))
      }
    }
    .lineLimit(1)
    .minimumScaleFactor(0.65)
    .multilineTextAlignment(.trailing)
  }

  @ViewBuilder
  private static func priorityContent(
    context: ActivityViewContext<PokitLiveActivityAttributes>,
    p: PokitLiveActivityAttributes.ContentState.PriorityLiveContent,
    compact: Bool
  ) -> some View {
    let listSource = priorityLockListSource(context: context, p: p)
    /// 잠금화면 배너 허용 높이를 최대한 쓰고, 넘치면 `…` 말줄임을 붙인다.
    /// 숫자가 너무 작으면 내용이 적을 때도 일찍 말줄임됨 → 넉넉히 20.
    let maxListLines = 20
    let listTitleSize: CGFloat = 19
    let pokitLabelSize: CGFloat = 11

    let visibleRows = Array(listSource.prefix(maxListLines))
    let hasMore = listSource.count > visibleRows.count
    /// QuickMemo와 동일하게 `Text`의 줄바꿈·`lineSpacing`으로 intrinsic 세로 높이를 쌓는다.
    /// `ForEach` 한 줄 행만 두면 Live Activity가 얇은 intrinsic 높이로 잡는 경우가 많다.
    let listBodyFont = Font.system(size: listTitleSize, weight: .bold)
    let listLineSpacing: CGFloat = 2
    let listMultiline: String = {
      if visibleRows.isEmpty { return "" }
      /// 행별 시각은 헤더 `windowLabel`에 이미 있으므로 본문에서는 제목만 줄 단위로 쌓는다(퀵메모의 `\n`과 동일한 효과).
      var lines = visibleRows.map { row in
        row.title.trimmingCharacters(in: .whitespacesAndNewlines)
      }
      if hasMore { lines.append("…") }
      return lines.joined(separator: "\n")
    }()
    let window = p.windowLabel.trimmingCharacters(in: .whitespacesAndNewlines)

    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 8) {
        Image(systemName: "bag.fill")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(orange)
        Text("POKIT")
          .font(.system(size: pokitLabelSize, weight: .heavy))
          .foregroundStyle(headlineColor.opacity(0.60))
          .tracking(-0.2)
          .lineLimit(1)
      }

      if !window.isEmpty {
        Text(window)
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(mutedColor)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }

      if !listSource.isEmpty {
        Text(listMultiline)
          .font(listBodyFont)
          .foregroundStyle(headlineColor)
          .lineSpacing(listLineSpacing)
          .lineLimit(maxListLines + 1)
          .minimumScaleFactor(0.80)
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        Text(p.activeTitle)
          .font(listBodyFont)
          .foregroundStyle(headlineColor)
          .lineLimit(2)
          .minimumScaleFactor(0.80)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private static func formatClock(_ totalSeconds: Int) -> String {
    let safe = max(0, totalSeconds)
    let minutes = safe / 60
    let seconds = safe % 60
    return String(format: "%02d:%02d", minutes, seconds)
  }
}
