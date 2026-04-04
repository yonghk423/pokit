import ActivityKit
import SwiftUI
import WidgetKit

/// 빠른 메모 — 잠금화면에서 본문 텍스트 우선(상태줄·장식 UI 없음).
@available(iOS 16.1, *)
enum QuickMemoModeLiveActivityView {
  private static let orange = Color.orange

  @ViewBuilder
  static func lockScreenBody(
    context: ActivityViewContext<LockFlowLiveActivityAttributes>,
    compact: Bool
  ) -> some View {
    if let q = context.state.quickMemoLive {
      quickMemoCard(q: q, compact: compact)
    } else {
      EmptyView()
    }
  }

  @ViewBuilder
  private static func quickMemoCard(
    q: LockFlowLiveActivityAttributes.ContentState.QuickMemoLiveContent,
    compact: Bool
  ) -> some View {
    let headline: CGFloat = compact ? 15 : 17
    let label: CGFloat = compact ? 9 : 10

    VStack(alignment: .leading, spacing: compact ? 8 : 10) {
      HStack(alignment: .center, spacing: 6) {
        Image(systemName: "note.text")
          .font(.system(size: compact ? 12 : 14, weight: .semibold))
          .foregroundStyle(orange)
        Text("빠른 메모")
          .font(.system(size: label, weight: .heavy))
          .foregroundStyle(orange)
          .tracking(0.3)
          .lineLimit(1)
        Spacer(minLength: 0)
      }

      Text(q.bodyText)
        .font(.system(size: headline, weight: .semibold))
        .foregroundStyle(.white)
        .lineSpacing(3)
        .lineLimit(compact ? 4 : 6)
        .minimumScaleFactor(0.68)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
