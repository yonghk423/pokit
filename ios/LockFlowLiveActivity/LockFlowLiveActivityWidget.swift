import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

/// 잠금화면 Live Activity는 **읽기 전용** — 제어는 앱에서만. 전체 목록은 오늘 플로우 화면으로 연다.
@available(iOS 16.1, *)
private func lockFlowDayPlanURL() -> URL? {
  var components = URLComponents()
  components.scheme = "lockflow"
  components.host = "day-plan"
  return components.url
}

@available(iOS 16.1, *)
private func lockFlowFormatClock(_ totalSeconds: Int) -> String {
  let safe = max(0, totalSeconds)
  let minutes = safe / 60
  let seconds = safe % 60
  return String(format: "%02d:%02d", minutes, seconds)
}

@available(iOS 16.1, *)
private let liveGrayAccent = Color(red: 0.78, green: 0.78, blue: 0.82)

// MARK: - Reading helpers

@available(iOS 16.1, *)
private struct ReadingMetricItem {
  let value: String
  let label: String
  let big: Bool
}

@available(iOS 16.1, *)
private func lockFlowNormalizeReadingMetrics(_ metrics: [String]) -> [String] {
  var out: [String] = []
  for metric in metrics {
    if !["pages_read", "pages_left", "focus_level"].contains(metric) { continue }
    if out.contains(metric) { continue }
    out.append(metric)
    if out.count >= 3 { break }
  }
  return out
}

@available(iOS 16.1, *)
private func lockFlowReadingDerived(
  _ config: LockFlowLiveActivityAttributes.ContentState.ReadingDataConfig
) -> (startPage: Int, targetPage: Int, spanPages: Int, progressPct: Int) {
  let startPage = max(0, config.startPage)
  let targetPage = max(0, config.targetPage)
  let spanPages = max(0, targetPage - startPage)
  let progressPct: Int
  if targetPage == 0 {
    progressPct = 0
  } else {
    progressPct = max(0, min(100, Int(round((Double(spanPages) / Double(targetPage)) * 100.0))))
  }
  return (startPage, targetPage, spanPages, progressPct)
}

@available(iOS 16.1, *)
private func lockFlowReadingMetricItem(
  for key: String,
  config: LockFlowLiveActivityAttributes.ContentState.ReadingDataConfig
) -> ReadingMetricItem {
  let derived = lockFlowReadingDerived(config)
  switch key {
  case "pages_left":
    return ReadingMetricItem(
      value: "\(derived.targetPage)p",
      label: "목표 페이지",
      big: false
    )
  case "focus_level":
    return ReadingMetricItem(
      value: "\(derived.progressPct)%",
      label: "집중도",
      big: true
    )
  default:
    return ReadingMetricItem(
      value: "\(derived.startPage)p",
      label: "시작 페이지",
      big: true
    )
  }
}

// MARK: - Unified Lock Screen View

@available(iOS 16.1, *)
private struct LockFlowLiveActivityView: View {
  let context: ActivityViewContext<LockFlowLiveActivityAttributes>

  private var isReadingMode: Bool {
    context.state.categoryKey == "reading" && context.state.readingDataConfig != nil
  }

  /// 빠른 메모 저장 블록 — 카드형 잠금화면
  private var isQuickMemoMode: Bool {
    context.state.planMode == "quickMemo" && context.state.quickMemoLive != nil
  }

  /// RN `planMode: "priority"` + 합본 블록 페이로드 — 독서 LA와 무관
  private var isPriorityMode: Bool {
    context.state.planMode == "priority" && context.state.priorityLive != nil
  }

  private var isStandby: Bool {
    context.state.status == "standby"
  }

  private var isPaused: Bool {
    context.state.status == "paused"
  }

  private var isFinished: Bool {
    context.state.status == "finished"
  }

  /// RN `active` upsert 전이라도 벽시계 기준 시작 시각이 지났으면 종료 시각 타이머로 표시한다.
  private var standbyShowsStartCountdownOnly: Bool {
    guard isStandby, let s = context.state.startsAt else { return false }
    return s > Date()
  }

  /// 통합 타이머: standby(시작 전만) → startsAt 카운트다운, 그 외 실행 구간 → endsAt 카운트다운
  @ViewBuilder
  private func unifiedTimerText(fontSize: CGFloat, weight: Font.Weight = .bold) -> some View {
    if isFinished {
      Text("완료")
        .font(.system(size: fontSize, weight: weight, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    } else if standbyShowsStartCountdownOnly, let startsAt = context.state.startsAt {
      Text(startsAt, style: .timer)
        .font(.system(size: fontSize, weight: weight, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    } else if let endsAt = context.state.endsAt, !isPaused {
      Text(endsAt, style: .timer)
        .font(.system(size: fontSize, weight: weight, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    } else if let paused = context.state.pausedRemainingSeconds {
      Text(lockFlowFormatClock(paused))
        .font(.system(size: fontSize, weight: weight, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
    } else {
      Text("--:--")
        .font(.system(size: fontSize, weight: weight, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
    }
  }

  /// 상단 상태 라벨
  @ViewBuilder
  private func statusLabel() -> some View {
    HStack(spacing: 6) {
      Image(systemName: "lock.fill")
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(liveGrayAccent)

      Text(context.state.category.uppercased())
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(liveGrayAccent)
        .lineLimit(1)
    }
  }

  /// 타이머 힌트 라벨
  private var timerHint: String {
    if isFinished { return "수고하셨어요" }
    if standbyShowsStartCountdownOnly { return "곧 시작" }
    if isPaused { return "일시정지됨" }
    return "남은 시간"
  }

  @ViewBuilder
  private func lockScreenOpenAppButton(compact _: Bool) -> some View {
    EmptyView()
  }

  private func checklistIconName(
    _ row: LockFlowLiveActivityAttributes.ContentState.ChecklistRow
  ) -> String {
    switch row.state {
    case "completed":
      return "checkmark.circle.fill"
    case "skipped":
      return "minus.circle"
    case "current":
      return "circle.inset.filled"
    default:
      return "circle"
    }
  }

  private func checklistIconTint(
    _ row: LockFlowLiveActivityAttributes.ContentState.ChecklistRow
  ) -> Color {
    switch row.state {
    case "completed", "current":
      return liveGrayAccent
    default:
      return .white.opacity(0.34)
    }
  }

  private func checklistStateLabel(
    _ row: LockFlowLiveActivityAttributes.ContentState.ChecklistRow
  ) -> String {
    switch row.state {
    case "completed":
      return "완료"
    case "skipped":
      return "건너뜀"
    case "current":
      return "진행 중"
    default:
      return "다음 예정"
    }
  }

  private func checklistMetaTint(
    _ row: LockFlowLiveActivityAttributes.ContentState.ChecklistRow
  ) -> Color {
    switch row.state {
    case "current":
      return liveGrayAccent
    case "completed":
      return Color.white.opacity(0.34)
    default:
      return Color.white.opacity(0.42)
    }
  }

  @ViewBuilder
  private func checklistRow(
    _ row: LockFlowLiveActivityAttributes.ContentState.ChecklistRow,
    compact: Bool
  ) -> some View {
    let isCompleted = row.state == "completed"
    let isCurrent = row.state == "current"
    let iconBox: CGFloat = compact ? 23 : 26
    let iconSize: CGFloat = compact ? 13 : 15
    let titleSize: CGFloat = compact ? 12 : 13
    let metaSize: CGFloat = compact ? 9 : 10
    /// 활성 행만 패딩을 주면 아이콘 열이 오른쪽으로 밀려 보인다 → 모든 행 동일 수평 패딩.
    let rowHPad: CGFloat = compact ? 6 : 8

    HStack(alignment: .center, spacing: compact ? 8 : 10) {
      Image(systemName: checklistIconName(row))
        .font(.system(size: iconSize, weight: .semibold))
        .foregroundStyle(checklistIconTint(row))
        .frame(width: iconBox, height: iconBox)
        .background(
          RoundedRectangle(cornerRadius: iconBox / 2)
            .fill(isCurrent ? Color.white.opacity(0.08) : Color.white.opacity(0.04))
        )
        .overlay(
          RoundedRectangle(cornerRadius: iconBox / 2)
            .stroke(isCurrent ? liveGrayAccent.opacity(0.38) : Color.white.opacity(0.08), lineWidth: 1)
        )

      VStack(alignment: .leading, spacing: compact ? 1 : 2) {
        Text(row.title)
          .font(.system(size: titleSize, weight: isCurrent ? .semibold : .medium))
          .foregroundStyle(isCompleted ? .white.opacity(0.48) : .white)
          .lineLimit(1)
          .minimumScaleFactor(0.85)
          .strikethrough(isCompleted)

        HStack(alignment: .center, spacing: 4) {
          if isCurrent {
            Image(systemName: "clock")
              .font(.system(size: compact ? 8 : 9, weight: .semibold))
              .foregroundStyle(liveGrayAccent)
          }
          Text("\(row.timeLabel) • \(checklistStateLabel(row))")
            .font(.system(size: metaSize, weight: .bold))
            .foregroundStyle(checklistMetaTint(row))
            .lineLimit(1)
            .minimumScaleFactor(0.85)
        }
      }

      Spacer(minLength: 0)

      Image(systemName: isCurrent ? "play.fill" : "chevron.right")
        .font(.system(size: isCurrent ? (compact ? 11 : 12) : (compact ? 10 : 11), weight: .semibold))
        .foregroundStyle(isCurrent ? liveGrayAccent : Color.white.opacity(0.12))
    }
    .padding(.horizontal, rowHPad)
    .padding(.vertical, isCurrent ? (compact ? 4 : 5) : 0)
    .background(
      RoundedRectangle(cornerRadius: compact ? 10 : 12)
        .fill(isCurrent ? Color.white.opacity(0.06) : .clear)
    )
    .overlay(
      RoundedRectangle(cornerRadius: compact ? 10 : 12)
        .stroke(isCurrent ? Color.white.opacity(0.10) : .clear, lineWidth: 1)
    )
  }

  private var checklistTotalCount: Int {
    let digits = context.state.checklistCountLabel.filter(\.isNumber)
    if let parsed = Int(digits), parsed > 0 { return parsed }
    return context.state.checklistRows.count
  }

  @ViewBuilder
  private func checklistFooterLink(hiddenCount _: Int, compact _: Bool) -> some View {
    EmptyView()
  }

  // MARK: - Reading layouts (unchanged, always "active" style)

  @ViewBuilder
  private func readingCompactLockScreenBody(
    config: LockFlowLiveActivityAttributes.ContentState.ReadingDataConfig
  ) -> some View {
    let metrics = lockFlowNormalizeReadingMetrics(config.selectedMetrics)
    let progressPct = lockFlowReadingDerived(config).progressPct

    VStack(alignment: .leading, spacing: 5) {
      HStack(alignment: .center, spacing: 7) {
        Image(systemName: "book.fill")
          .font(.system(size: 11, weight: .semibold))
          .foregroundStyle(.white)
          .frame(width: 24, height: 24)
          .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 8))

        VStack(alignment: .leading, spacing: 0) {
          Text(isStandby ? "시작 대기" : "활성 플로우")
            .font(.system(size: 8, weight: .bold))
            .foregroundStyle(.white.opacity(0.58))
          Text(context.state.title.isEmpty ? "딥 리딩" : context.state.title)
            .font(.system(size: 13, weight: .heavy))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        unifiedTimerText(fontSize: 17, weight: .bold)
          .foregroundStyle(.white)
          .frame(minWidth: 52, alignment: .trailing)
      }

      if !metrics.isEmpty {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          ForEach(Array(metrics.enumerated()), id: \.offset) { _, key in
            let item = lockFlowReadingMetricItem(for: key, config: config)
            VStack(alignment: .leading, spacing: 1) {
              Text(item.value)
                .font(.system(size: item.big ? 20 : 17, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
              Text(item.label)
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.white.opacity(0.58))
                .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
      }

      GeometryReader { proxy in
        let trackW = max(0, proxy.size.width)
        let fillW = trackW * (CGFloat(progressPct) / 100.0)
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.20))
          Capsule().fill(Color.white).frame(width: max(0, fillW))
        }
      }
      .frame(height: 4)

      lockScreenOpenAppButton(compact: true)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
  }

  @ViewBuilder
  private func readingPreferredLockScreenBody(
    config: LockFlowLiveActivityAttributes.ContentState.ReadingDataConfig
  ) -> some View {
    let metrics = lockFlowNormalizeReadingMetrics(config.selectedMetrics)
    let progressPct = lockFlowReadingDerived(config).progressPct

    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .top, spacing: 10) {
        Image(systemName: "book.fill")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(.white)
          .frame(width: 30, height: 30)
          .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 9))

        VStack(alignment: .leading, spacing: 1) {
          Text(isStandby ? "시작 대기" : "활성 플로우")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(.white.opacity(0.62))
          Text(context.state.title.isEmpty ? "딥 리딩" : context.state.title)
            .font(.system(size: 15, weight: .heavy))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        unifiedTimerText(fontSize: 17, weight: .bold)
          .foregroundStyle(.white)
          .frame(minWidth: 52, alignment: .trailing)
      }

      if !metrics.isEmpty {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
          ForEach(Array(metrics.enumerated()), id: \.offset) { _, key in
            let item = lockFlowReadingMetricItem(for: key, config: config)
            VStack(alignment: .leading, spacing: 2) {
              Text(item.value)
                .font(.system(size: item.big ? 26 : 22, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
              Text(item.label)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white.opacity(0.62))
                .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
      }

      GeometryReader { proxy in
        let trackW = max(0, proxy.size.width)
        let fillW = trackW * (CGFloat(progressPct) / 100.0)
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.22))
          Capsule().fill(Color.white).frame(width: max(0, fillW))
        }
      }
      .frame(height: 6)

      lockScreenOpenAppButton(compact: false)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 11)
  }

  // MARK: - Unified default layout

  @ViewBuilder
  private func defaultPreferredLockScreenBody() -> some View {
    let rows = Array(context.state.checklistRows.prefix(4))
    let hiddenCount = max(0, checklistTotalCount - rows.count)

    VStack(alignment: .leading, spacing: 9) {
      HStack(alignment: .center, spacing: 8) {
        Circle()
          .fill(liveGrayAccent)
          .frame(width: 8, height: 8)
        Text(context.state.checklistTitle.uppercased())
          .font(.system(size: 10, weight: .heavy))
          .foregroundStyle(liveGrayAccent)
          .lineLimit(1)
        Spacer()
        Text(context.state.checklistCountLabel.uppercased())
          .font(.system(size: 9, weight: .bold))
          .foregroundStyle(.white.opacity(0.40))
          .tracking(1.4)
      }

      if rows.isEmpty {
        Text(context.state.title.isEmpty ? "표시할 플로우가 없어요" : context.state.title)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(.white)
          .lineLimit(2)
      } else {
        ForEach(rows, id: \.blockId) { row in
          checklistRow(row, compact: false)
        }
      }

      checklistFooterLink(hiddenCount: hiddenCount, compact: false)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
  }

  @ViewBuilder
  private func defaultCompactLockScreenBody() -> some View {
    let rows = Array(context.state.checklistRows.prefix(3))
    let hiddenCount = max(0, checklistTotalCount - rows.count)

    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .center, spacing: 6) {
        Circle()
          .fill(liveGrayAccent)
          .frame(width: 7, height: 7)
        Text(context.state.checklistTitle.uppercased())
          .font(.system(size: 9, weight: .heavy))
          .foregroundStyle(liveGrayAccent)
          .lineLimit(1)
        Spacer()
        Text(context.state.checklistCountLabel.uppercased())
          .font(.system(size: 8, weight: .bold))
          .foregroundStyle(.white.opacity(0.38))
          .tracking(1.1)
      }

      if rows.isEmpty {
        Text(context.state.title.isEmpty ? "표시할 플로우가 없어요" : context.state.title)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(.white)
          .lineLimit(2)
      } else {
        ForEach(rows, id: \.blockId) { row in
          checklistRow(row, compact: true)
        }
      }

      checklistFooterLink(hiddenCount: hiddenCount, compact: true)
    }
    .padding(.horizontal, 9)
    .padding(.vertical, 8)
  }

  @ViewBuilder
  private func defaultLockScreenBody() -> some View {
    ViewThatFits(in: .vertical) {
      defaultPreferredLockScreenBody()
      defaultCompactLockScreenBody()
    }
  }

  @ViewBuilder
  private func priorityLockScreenBody() -> some View {
    ViewThatFits(in: .vertical) {
      PriorityModeLiveActivityView.lockScreenBody(context: context, compact: false)
      PriorityModeLiveActivityView.lockScreenBody(context: context, compact: true)
    }
  }

  @ViewBuilder
  private func priorityFallbackLockScreenBody() -> some View {
    ViewThatFits(in: .vertical) {
      PriorityModeLiveActivityView.lockScreenFallbackBody(context: context, compact: false)
      PriorityModeLiveActivityView.lockScreenFallbackBody(context: context, compact: true)
    }
  }

  @ViewBuilder
  private func quickMemoLockScreenBody() -> some View {
    /// ViewThatFits + compact(4줄) 폴백이 카드 높이는 남는데 본문만 일찍 말줄임되는 경우가 있어 단일 레이아웃만 사용한다.
    QuickMemoModeLiveActivityView.lockScreenBody(context: context)
  }

  // MARK: - Body

  var body: some View {
    /// 시스템이 주는 Live Activity 영역은 이미 둥근 카드 형태다.
    /// 안쪽에 또 `RoundedRectangle` 배경을 두면 가장자리에 배경이 비쳐 "투명 링"처럼 보인다.
    /// → 배경은 이 뷰 전체를 한 번에 채우고, 내용만 안쪽 패딩으로 배치한다.
    ZStack(alignment: .topLeading) {
      Color.black.opacity(0.94)

      Group {
        if isQuickMemoMode {
          quickMemoLockScreenBody()
        } else if isPriorityMode {
          priorityLockScreenBody()
        } else {
          priorityFallbackLockScreenBody()
        }
      }
      /// 빠른 메모: 안쪽 카드 없이 부모 `Color.black`만 쓰므로, 여기 패딩이 화면과 본문 사이 유일한 여백이다.
      .padding(
        isQuickMemoMode
          ? EdgeInsets(top: 10, leading: 12, bottom: 10, trailing: 12)
          : EdgeInsets(top: 8, leading: 10, bottom: 8, trailing: 10)
      )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Dynamic Island (unified)

@available(iOS 16.1, *)
private func islandCountdownText(
  startsAt: Date?,
  endsAt: Date?,
  isFinished: Bool,
  isPaused: Bool,
  pausedRemainingSeconds: Int?,
  font: Font = .caption.weight(.semibold)
) -> some View {
  Group {
    if isFinished {
      Text("완료")
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
    } else if let startsAt, isPaused == false, endsAt == nil || (startsAt.timeIntervalSinceNow > 0) {
      Text(startsAt, style: .timer)
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.5)
    } else if let endsAt, !isPaused {
      Text(endsAt, style: .timer)
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.5)
    } else if let paused = pausedRemainingSeconds {
      Text(lockFlowFormatClock(paused))
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
    } else {
      Text("--:--")
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
    }
  }
}

@available(iOS 16.1, *)
struct LockFlowLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LockFlowLiveActivityAttributes.self) { context in
      LockFlowLiveActivityView(context: context)
        // 내용 뷰가 `ZStack`으로 영역 전체를 불투명하게 채움 — 여기는 이중 틴트만 막는다.
        .activityBackgroundTint(.clear)
        .activitySystemActionForegroundColor(liveGrayAccent)
        .widgetURL(nil)
    } dynamicIsland: { context in
      if context.state.planMode == "quickMemo", let q = context.state.quickMemoLive {
        let isFinished = context.state.status == "finished"
        let previewLine = q.bodyText.split(separator: "\n", omittingEmptySubsequences: false)
          .map(String.init)
          .first { !$0.trimmingCharacters(in: .whitespaces).isEmpty } ?? q.bodyText
        /// 컴팩트 trailing 은 체크리스트의 `1개`·중요도의 타이머처럼 **짧은 고정 라벨**만 사용한다.
        /// 본문 미리보기를 넣으면 intrinsic 폭이 커져 다이내믹 아일랜드 알약이 화면에 가깝게 늘어난다.
        let compactTrailingLabel: String = {
          if isFinished { return "완료" }
          switch context.state.status {
          case "paused":
            return "멈춤"
          case "standby":
            return "대기"
          default:
            return "메모"
          }
        }()
        /// 확장 상단: leading / trailing 을 나누면 양끝 정렬로 가운데 검은 빈 영역이 커짐 → 한 덩어리로만 배치.
        let expandedTopPreview: String = {
          let t = previewLine.trimmingCharacters(in: .whitespacesAndNewlines)
          if t.isEmpty { return "메모" }
          if t.count <= 18 { return t }
          return String(t.prefix(18)) + "…"
        }()

        return DynamicIsland {
          DynamicIslandExpandedRegion(.leading) {
            HStack(alignment: .center, spacing: 6) {
              Image(systemName: "note.text")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(liveGrayAccent)
              VStack(alignment: .leading, spacing: 1) {
                Text("빠른 메모")
                  .font(.caption2.weight(.bold))
                  .foregroundStyle(liveGrayAccent)
                  .lineLimit(1)
                Text(expandedTopPreview)
                  .font(.caption2.weight(.semibold))
                  .foregroundStyle(Color.secondary)
                  .lineLimit(1)
                  .truncationMode(.tail)
              }
              .frame(maxWidth: 118, alignment: .leading)
            }
            .fixedSize(horizontal: true, vertical: false)
          }
          DynamicIslandExpandedRegion(.bottom) {
            VStack(alignment: .leading, spacing: 6) {
              Text(q.bodyText)
                .font(.caption.weight(.semibold))
                .lineLimit(5)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity, alignment: .leading)

            }
            .padding(.horizontal, 6)
            .padding(.bottom, 4)
          }
        } compactLeading: {
          Image(systemName: isFinished ? "checkmark" : "note.text")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(liveGrayAccent)
        } compactTrailing: {
          Text(compactTrailingLabel)
            .font(.caption2.weight(.bold))
            .foregroundStyle(isFinished ? Color.secondary : liveGrayAccent)
            .lineLimit(1)
        } minimal: {
          Image(systemName: isFinished ? "checkmark" : "note.text")
            .foregroundStyle(liveGrayAccent)
        }
        .widgetURL(nil)
      }

      let fallbackPriorityLive: LockFlowLiveActivityAttributes.ContentState.PriorityLiveContent = {
        let rows = context.state.checklistRows
        let totalFromLabel = Int(context.state.checklistCountLabel.filter(\.isNumber)) ?? 0
        let totalTasks = max(1, max(rows.count, totalFromLabel))
        let completed = rows.filter { $0.state == "completed" }.count
        let progress01 = totalTasks > 0 ? Double(completed) / Double(totalTasks) : 0
        let currentIndex = rows.firstIndex(where: { $0.state == "current" }) ?? 0
        let activeTitle: String = {
          if rows.indices.contains(currentIndex) {
            let title = rows[currentIndex].title.trimmingCharacters(in: .whitespacesAndNewlines)
            if !title.isEmpty { return title }
          }
          let fallback = context.state.title.trimmingCharacters(in: .whitespacesAndNewlines)
          return fallback.isEmpty ? "활성 플로우" : fallback
        }()
        let windowRaw = context.state.timeRangeLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        let windowLabel = windowRaw.isEmpty ? context.state.checklistTitle : windowRaw
        let upcoming = Array(rows.enumerated().prefix(3)).map { idx, row in
          LockFlowLiveActivityAttributes.ContentState.PriorityLiveContent.UpcomingRow(
            order: idx + 1,
            title: row.title,
            timeLabel: row.timeLabel
          )
        }
        return LockFlowLiveActivityAttributes.ContentState.PriorityLiveContent(
          windowLabel: windowLabel,
          activeTitle: activeTitle,
          activeOrder: min(max(1, currentIndex + 1), totalTasks),
          totalTasks: totalTasks,
          progress01: progress01,
          upcoming: upcoming
        )
      }()

      if context.state.planMode != "quickMemo" {
        let p = context.state.priorityLive ?? fallbackPriorityLive
        let isStandby = context.state.status == "standby"
        let isFinished = context.state.status == "finished"
        let isPaused = context.state.status == "paused"
        let standbyStartCountdown = isStandby && ((context.state.startsAt?.timeIntervalSinceNow ?? -1) > 0)

        return DynamicIsland {
          DynamicIslandExpandedRegion(.leading) {
            HStack(spacing: 8) {
              Image(systemName: "list.number")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(liveGrayAccent)
              Text(p.windowLabel)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(liveGrayAccent)
                .lineLimit(1)
            }
          }
          DynamicIslandExpandedRegion(.trailing) {
            VStack(alignment: .trailing, spacing: 2) {
              Text(isFinished ? "완료" : "\(p.activeOrder)/\(max(1, p.totalTasks))")
                .font(.caption2.weight(.bold))
                .foregroundStyle(isFinished ? Color.secondary : liveGrayAccent)
                .lineLimit(1)
              Text(context.state.timeRangeLabel)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Color.secondary)
                .lineLimit(1)
            }
          }
          DynamicIslandExpandedRegion(.bottom) {
            VStack(alignment: .leading, spacing: 8) {
              Text(p.activeTitle)
                .font(.system(size: 15, weight: .semibold))
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, alignment: .leading)

              if !p.upcoming.isEmpty {
                ForEach(Array(p.upcoming.prefix(2).enumerated()), id: \.offset) { _, row in
                  HStack(alignment: .center, spacing: 10) {
                    Text("\(row.order)")
                      .font(.caption2.weight(.bold))
                      .foregroundStyle(liveGrayAccent)
                      .frame(width: 18, alignment: .center)
                    Text(row.title)
                      .font(.caption.weight(.semibold))
                      .foregroundStyle(Color.white)
                      .lineLimit(1)
                    Spacer(minLength: 0)
                    Text(row.timeLabel)
                      .font(.caption2.weight(.bold))
                      .foregroundStyle(Color.secondary)
                      .lineLimit(1)
                  }
                }
              }

              if isFinished {
                Text("플로우가 완료되었습니다")
                  .font(.caption.weight(.semibold))
                  .foregroundStyle(.secondary)
              }

            }
            .padding(.horizontal, 6)
            .padding(.bottom, 4)
          }
        } compactLeading: {
          Image(systemName: "list.number")
            .foregroundStyle(liveGrayAccent)
        } compactTrailing: {
          islandCountdownText(
            startsAt: context.state.startsAt,
            endsAt: context.state.endsAt,
            isFinished: isFinished,
            isPaused: isPaused,
            pausedRemainingSeconds: context.state.pausedRemainingSeconds,
            font: .caption2.weight(.bold)
          )
          .foregroundStyle(isFinished ? Color.secondary : liveGrayAccent)
        } minimal: {
          Image(systemName: isFinished ? "checkmark" : (standbyStartCountdown ? "clock" : "list.number"))
            .foregroundStyle(liveGrayAccent)
        }
        .widgetURL(nil)
      }

      let isStandby = context.state.status == "standby"
      let isFinished = context.state.status == "finished"
      let standbyStartCountdown = isStandby && ((context.state.startsAt?.timeIntervalSinceNow ?? -1) > 0)

      let rows = context.state.checklistRows
      let currentRow = rows.first(where: { $0.state == "current" }) ?? rows.first

      func rowIconName(_ state: String) -> String {
        switch state {
        case "completed":
          return "checkmark.circle.fill"
        case "skipped":
          return "minus.circle"
        case "current":
          return "circle.inset.filled"
        default:
          return "circle"
        }
      }

      func rowIconTint(_ state: String) -> Color {
        switch state {
        case "completed":
          return liveGrayAccent
        case "current":
          return liveGrayAccent
        case "skipped":
          return .secondary
        default:
          return .secondary
        }
      }

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            Circle()
              .fill(liveGrayAccent)
              .frame(width: 8, height: 8)
            Text(context.state.checklistTitle)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(liveGrayAccent)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Text(isFinished ? "완료" : context.state.checklistCountLabel)
              .font(.caption2.weight(.bold))
              .foregroundStyle(isFinished ? Color.secondary : liveGrayAccent)
              .lineLimit(1)
            Text(context.state.timeRangeLabel)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(Color.secondary)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            if rows.isEmpty {
              Text(context.state.title.isEmpty ? "\u{2003}" : context.state.title)
                .font(.system(size: 15, weight: .semibold))
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
              ForEach(Array(rows.prefix(2)), id: \.blockId) { row in
                HStack(alignment: .center, spacing: 10) {
                  Image(systemName: rowIconName(row.state))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(rowIconTint(row.state))
                    .frame(width: 18, alignment: .center)

                  Text(row.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(row.state == "completed" ? Color.secondary : Color.white)
                    .lineLimit(1)
                    .strikethrough(row.state == "completed")

                  Spacer(minLength: 0)

                  Text(row.state == "skipped" ? "건너뜀 · \(row.timeLabel)" : row.timeLabel)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(row.state == "current" ? liveGrayAccent : Color.secondary)
                    .lineLimit(1)
                }
              }
            }

            if isFinished {
              Text("플로우가 완료되었습니다")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            }

          }
          .padding(.horizontal, 6)
          .padding(.bottom, 4)
        }
      } compactLeading: {
        if let r = currentRow {
          Image(systemName: rowIconName(r.state))
            .foregroundStyle(rowIconTint(r.state))
        } else {
          Image(systemName: "lock.fill")
            .foregroundStyle(liveGrayAccent)
        }
      } compactTrailing: {
        Text(isFinished ? "완료" : context.state.checklistCountLabel)
          .font(.caption2.weight(.bold))
          .foregroundStyle(isFinished ? Color.secondary : liveGrayAccent)
      } minimal: {
        Image(systemName: isFinished ? "checkmark" : (standbyStartCountdown ? "clock" : "lock.fill"))
      }
      .widgetURL(nil)
    }
  }
}

@available(iOS 16.1, *)
@main
struct LockFlowLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    LockFlowLiveActivityWidget()
    DayPlanLockWidget()
  }
}
