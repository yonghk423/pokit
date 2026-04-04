import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
private func priorityModeDayPlanURL() -> URL? {
  var components = URLComponents()
  components.scheme = "lockflow"
  components.host = "day-plan"
  return components.url
}

@available(iOS 16.1, *)
enum PriorityModeLiveActivityView {
  private static let orange = Color.orange

  @ViewBuilder
  static func lockScreenBody(
    context: ActivityViewContext<LockFlowLiveActivityAttributes>,
    compact: Bool
  ) -> some View {
    if let p = context.state.priorityLive {
      priorityContent(context: context, p: p, compact: compact)
    } else {
      EmptyView()
    }
  }

  @ViewBuilder
  private static func priorityTimerBlock(
    context: ActivityViewContext<LockFlowLiveActivityAttributes>,
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
    context: ActivityViewContext<LockFlowLiveActivityAttributes>,
    p: LockFlowLiveActivityAttributes.ContentState.PriorityLiveContent,
    compact: Bool
  ) -> some View {
    let isFinished = context.state.status == "finished"
    let isPaused = context.state.status == "paused"
    let isStandby = context.state.status == "standby"
    let standbyStartCountdown = isStandby && ((context.state.startsAt?.timeIntervalSinceNow ?? -1) > 0)
    let ringProgress = CGFloat(min(1, max(0, p.progress01)))

    let padH: CGFloat = compact ? 8 : 10
    let padV: CGFloat = compact ? 6 : 8
    let ringSize: CGFloat = compact ? 48 : 54
    let ringStroke: CGFloat = compact ? 3.5 : 4
    let playInner: CGFloat = compact ? 28 : 30
    let playIcon: CGFloat = compact ? 12 : 13
    let titleSize: CGFloat = compact ? 13 : 14
    let windowSize: CGFloat = compact ? 8 : 8.5

    VStack(alignment: .leading, spacing: compact ? 6 : 7) {
      HStack(alignment: .center, spacing: 6) {
        HStack(spacing: compact ? 4 : 5) {
          Image(systemName: "lock.open.fill")
            .font(.system(size: compact ? 11 : 12, weight: .semibold))
            .foregroundStyle(orange)
          Text("LockFlow")
            .font(.system(size: compact ? 12 : 12.5, weight: .heavy))
            .foregroundStyle(.white)
            .tracking(-0.2)
        }
        Spacer(minLength: 0)
        Text("우선순위 모드")
          .font(.system(size: compact ? 7.5 : 8.5, weight: .heavy))
          .foregroundStyle(orange)
          .padding(.horizontal, compact ? 6 : 8)
          .padding(.vertical, compact ? 3 : 3.5)
          .background(orange.opacity(0.12), in: Capsule())
      }

      /// 링 옆에는 제목만 넓게 — 타이머는 아래 행으로 내려 잘림 방지
      HStack(alignment: .top, spacing: compact ? 8 : 10) {
        ZStack {
          Circle()
            .stroke(Color.white.opacity(0.08), lineWidth: ringStroke)
          Circle()
            .trim(from: 0, to: ringProgress)
            .stroke(
              orange,
              style: StrokeStyle(lineWidth: ringStroke, lineCap: .round)
            )
            .rotationEffect(.degrees(-90))
          if let url = priorityModeDayPlanURL() {
            Link(destination: url) {
              Image(systemName: "play.fill")
                .font(.system(size: playIcon, weight: .bold))
                .foregroundStyle(.black.opacity(0.88))
                .frame(width: playInner, height: playInner)
                .background(.white, in: Circle())
                .shadow(color: .black.opacity(0.28), radius: 3, y: 1)
            }
            .buttonStyle(.plain)
          }
        }
        .frame(width: ringSize, height: ringSize)

        VStack(alignment: .leading, spacing: compact ? 2 : 3) {
          Text(p.windowLabel.uppercased())
            .font(.system(size: windowSize, weight: .heavy))
            .foregroundStyle(.white.opacity(0.40))
            .tracking(0.85)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
          Text(p.activeTitle)
            .font(.system(size: titleSize, weight: .bold))
            .foregroundStyle(.white)
            .lineLimit(3)
            .minimumScaleFactor(0.72)
            .fixedSize(horizontal: false, vertical: true)

          HStack(alignment: .center, spacing: 4) {
            Circle()
              .fill(orange)
              .frame(width: 4, height: 4)
            Text(
              isFinished ? "완료" : (isPaused ? "일시정지" : (isStandby ? "시작 대기" : "집중 중"))
            )
            .font(.system(size: compact ? 10 : 10.5, weight: .semibold))
            .foregroundStyle(orange.opacity(0.92))
            .lineLimit(1)
            Spacer(minLength: 4)
            priorityTimerBlock(
              context: context,
              isFinished: isFinished,
              isPaused: isPaused,
              isStandby: isStandby,
              standbyStartCountdown: standbyStartCountdown,
              compact: compact
            )
            .layoutPriority(1)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }

      Rectangle()
        .fill(Color.white.opacity(0.06))
        .frame(height: 1)

      VStack(alignment: .leading, spacing: compact ? 5 : 6) {
        ForEach(Array(p.upcoming.enumerated()), id: \.offset) { _, row in
          HStack(alignment: .center, spacing: 8) {
            Text("\(row.order)")
              .font(.system(size: compact ? 11 : 11.5, weight: .heavy))
              .foregroundStyle(.white.opacity(0.40))
              .frame(width: compact ? 22 : 24, height: compact ? 22 : 24)
              .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 6))
            VStack(alignment: .leading, spacing: 1) {
              Text(row.title)
                .font(.system(size: compact ? 11.5 : 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.90))
                .lineLimit(2)
                .minimumScaleFactor(0.8)
              Text(row.timeLabel.uppercased())
                .font(.system(size: 7.5, weight: .heavy))
                .foregroundStyle(.white.opacity(0.30))
                .tracking(0.6)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
              .font(.system(size: 9, weight: .semibold))
              .foregroundStyle(.white.opacity(0.14))
          }
        }
      }

      if let url = priorityModeDayPlanURL() {
        Link(destination: url) {
          Text("앱에서 보기")
            .font(.system(size: compact ? 10 : 10.5, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, compact ? 4 : 5)
            .background(Color.orange, in: RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, padH)
    .padding(.vertical, padV)
  }

  private static func formatClock(_ totalSeconds: Int) -> String {
    let safe = max(0, totalSeconds)
    let minutes = safe / 60
    let seconds = safe % 60
    return String(format: "%02d:%02d", minutes, seconds)
  }
}
