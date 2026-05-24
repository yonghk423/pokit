import ActivityKit
import SwiftUI
import WidgetKit

/// 빠른 메모 — 잠금화면에서 본문 텍스트 우선(상태줄·장식 UI 없음).
@available(iOS 16.1, *)
enum QuickMemoModeLiveActivityView {
  private static let accent = Color(red: 0.78, green: 0.78, blue: 0.82)

  @ViewBuilder
  static func lockScreenBody(
    context: ActivityViewContext<PokitLiveActivityAttributes>
  ) -> some View {
    if let q = context.state.quickMemoLive {
      quickMemoCard(q: q)
    } else {
      EmptyView()
    }
  }

  @ViewBuilder
  private static func quickMemoCard(
    q: PokitLiveActivityAttributes.ContentState.QuickMemoLiveContent
  ) -> some View {
    let headline: CGFloat = 17
    let label: CGFloat = 10

    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 6) {
        Image(systemName: "note.text")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(accent)
        Text("POKIT")
          .font(.system(size: label, weight: .heavy))
          .foregroundStyle(accent)
          .tracking(0.3)
          .lineLimit(1)
        Spacer(minLength: 0)
      }

      Text(q.bodyText)
        .font(.system(size: headline, weight: .semibold))
        .foregroundStyle(.white)
        .lineSpacing(2)
        /// 잠금 카드 세로 여유는 있는데 4~6줄에서 잘리던 것을 늘려 실제 영역을 쓴다(시스템 상한은 그대로).
        .lineLimit(18)
        .minimumScaleFactor(0.62)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
