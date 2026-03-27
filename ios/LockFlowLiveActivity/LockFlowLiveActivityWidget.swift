import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
private func lockFlowSessionURL(
  blockId: String,
  action: String? = nil
) -> URL? {
  var components = URLComponents()
  components.scheme = "lockflow"
  components.host = "activity-session"

  var queryItems = [URLQueryItem(name: "blockId", value: blockId)]
  if let action {
    queryItems.append(URLQueryItem(name: "liveAction", value: action))
  }

  components.queryItems = queryItems
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

@available(iOS 16.1, *)
private struct LockFlowLiveActivityView: View {
  let context: ActivityViewContext<LockFlowLiveActivityAttributes>

  private var isReadingMode: Bool {
    context.state.categoryKey == "reading" && context.state.readingDataConfig != nil
  }

  /// 기본 모드용 (배너 세로 여유가 적어 독서 모드는 더 타이트한 인셋을 쓴다)
  private var lockScreenInsets: EdgeInsets {
    if isReadingMode {
      return EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
    }
    return EdgeInsets(top: 14, leading: 14, bottom: 12, trailing: 14)
  }

  @ViewBuilder
  private var timerText: some View {
    if let endsAt = context.state.endsAt, context.state.status == "active" {
      Text(timerInterval: Date()...endsAt, countsDown: true)
        .font(.system(size: 26, weight: .bold, design: .rounded))
        .monospacedDigit()
    } else if let paused = context.state.pausedRemainingSeconds {
      Text(lockFlowFormatClock(paused))
        .font(.system(size: 26, weight: .bold, design: .rounded))
        .monospacedDigit()
    } else {
      Text("--:--")
        .font(.system(size: 26, weight: .bold, design: .rounded))
        .monospacedDigit()
    }
  }

  /// 잠금화면 배너 높이 한계에 맞춘 컴팩트 타이머 (독서 카드 헤더 우측)
  @ViewBuilder
  private var timerTextCompact: some View {
    if let endsAt = context.state.endsAt, context.state.status == "active" {
      Text(timerInterval: Date()...endsAt, countsDown: true)
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    } else if let paused = context.state.pausedRemainingSeconds {
      Text(lockFlowFormatClock(paused))
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .monospacedDigit()
    } else {
      Text("--:--")
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .monospacedDigit()
    }
  }

  /// 독서 모드(컴팩트): 작은 기기/큰 폰트에서 잘림을 피하기 위한 폴백.
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
          Text("활성 플로우")
            .font(.system(size: 8, weight: .bold))
            .foregroundStyle(.white.opacity(0.58))
          Text(context.state.title.isEmpty ? "딥 리딩" : context.state.title)
            .font(.system(size: 13, weight: .heavy))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        timerTextCompact
          .foregroundStyle(.white)
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
          Capsule()
            .fill(Color.white.opacity(0.20))
          Capsule()
            .fill(Color.white)
            .frame(width: max(0, fillW))
        }
      }
      .frame(height: 4)

      lockScreenActionButtons(compact: true)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
    .background(
      RoundedRectangle(cornerRadius: 14)
        .fill(Color.black.opacity(0.38))
    )
  }

  /// 독서 모드(최대치): 시스템 허용 범위에서 가능한 한 큰 비주얼을 우선 시도.
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
          Text("활성 플로우")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(.white.opacity(0.62))
          Text(context.state.title.isEmpty ? "딥 리딩" : context.state.title)
            .font(.system(size: 15, weight: .heavy))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        timerTextCompact
          .foregroundStyle(.white)
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
          Capsule()
            .fill(Color.white.opacity(0.22))
          Capsule()
            .fill(Color.white)
            .frame(width: max(0, fillW))
        }
      }
      .frame(height: 6)

      lockScreenActionButtons(compact: false)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 11)
    .background(
      RoundedRectangle(cornerRadius: 16)
        .fill(Color.black.opacity(0.40))
    )
  }

  @ViewBuilder
  private func lockScreenActionButtons(compact: Bool) -> some View {
    let vPad: CGFloat = compact ? 5 : 7
    let font: Font = compact ? .caption2.weight(.semibold) : .caption.weight(.semibold)

    HStack(spacing: compact ? 6 : 8) {
      if let pauseURL = lockFlowSessionURL(
        blockId: context.attributes.blockId,
        action: "togglePause"
      ) {
        Link(destination: pauseURL) {
          Text(context.state.status == "paused" ? "계속" : "일시정지")
            .font(font)
            .frame(maxWidth: .infinity)
            .padding(.vertical, vPad)
            .background(Color.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
      }

      if let completeURL = lockFlowSessionURL(
        blockId: context.attributes.blockId,
        action: "complete"
      ) {
        Link(destination: completeURL) {
          Text("완료")
            .font(font)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, vPad)
            .background(Color.orange, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
      }
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: isReadingMode ? 0 : 8) {
      if isReadingMode, let reading = context.state.readingDataConfig {
        ViewThatFits(in: .vertical) {
          readingPreferredLockScreenBody(config: reading)
          readingCompactLockScreenBody(config: reading)
        }
      } else {
        Text(context.state.category.uppercased())
          .font(.system(size: 11, weight: .semibold))
          .foregroundStyle(.orange)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.top, 2)

        Text(context.state.title.isEmpty ? "\u{2003}" : context.state.title)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(.primary)
          .lineLimit(2)
          .minimumScaleFactor(0.82)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)

        HStack(alignment: .center, spacing: 8) {
          timerText
            .layoutPriority(1)

          if context.state.status == "paused" {
            Text("일시정지")
              .font(.caption2.weight(.semibold))
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(.orange.opacity(0.15), in: Capsule())
          }
        }

        Text(context.state.timeRangeLabel)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
          .minimumScaleFactor(0.85)

        lockScreenActionButtons(compact: false)
          .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(lockScreenInsets)
  }
}

@available(iOS 16.1, *)
struct LockFlowLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LockFlowLiveActivityAttributes.self) { context in
      LockFlowLiveActivityView(context: context)
        .activityBackgroundTint(Color(.systemBackground))
        .activitySystemActionForegroundColor(.orange)
        .widgetURL(lockFlowSessionURL(blockId: context.attributes.blockId))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.state.category)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.orange)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let endsAt = context.state.endsAt, context.state.status == "active" {
            Text(timerInterval: Date()...endsAt, countsDown: true)
              .monospacedDigit()
          } else if let paused = context.state.pausedRemainingSeconds {
            Text(lockFlowFormatClock(paused))
              .monospacedDigit()
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            Text(context.state.title.isEmpty ? "\u{2003}" : context.state.title)
              .font(.system(size: 15, weight: .semibold))
              .lineLimit(2)
              .minimumScaleFactor(0.85)
              .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 8) {
              if let pauseURL = lockFlowSessionURL(
                blockId: context.attributes.blockId,
                action: "togglePause"
              ) {
                Link(destination: pauseURL) {
                  Text(context.state.status == "paused" ? "계속" : "일시정지")
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
              }

              if let completeURL = lockFlowSessionURL(
                blockId: context.attributes.blockId,
                action: "complete"
              ) {
                Link(destination: completeURL) {
                  Text("완료")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(.orange, in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
              }
            }
          }
          .padding(.horizontal, 4)
          .padding(.bottom, 4)
        }
      } compactLeading: {
        Image(systemName: "lock.fill")
          .foregroundStyle(.orange)
      } compactTrailing: {
        if let endsAt = context.state.endsAt, context.state.status == "active" {
          Text(timerInterval: Date()...endsAt, countsDown: true)
            .monospacedDigit()
        } else if let paused = context.state.pausedRemainingSeconds {
          Text(lockFlowFormatClock(paused))
            .monospacedDigit()
        }
      } minimal: {
        Image(systemName: "timer")
      }
      .widgetURL(lockFlowSessionURL(blockId: context.attributes.blockId))
    }
  }
}

@available(iOS 16.1, *)
@main
struct LockFlowLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    LockFlowLiveActivityWidget()
  }
}
