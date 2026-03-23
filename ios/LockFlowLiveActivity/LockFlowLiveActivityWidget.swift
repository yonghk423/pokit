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
private struct LockFlowLiveActivityView: View {
  let context: ActivityViewContext<LockFlowLiveActivityAttributes>

  /// 잠금 화면 배너는 높이가 고정이라 위·아래가 잘리기 쉬움 — 패딩·간격·폰트를 보수적으로 맞춘다.
  private let lockScreenInsets = EdgeInsets(top: 14, leading: 14, bottom: 12, trailing: 14)

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
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
        Group {
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
      .padding(.top, 2)
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
