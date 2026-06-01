import ActivityKit
import SwiftUI
import WidgetKit

/// 빠른 메모 — 잠금화면에서 본문 텍스트 우선(상태줄·장식 UI 없음).
@available(iOS 16.1, *)
enum QuickMemoModeLiveActivityView {
  private static let headlineColor = Color(red: 0.10, green: 0.10, blue: 0.10)
  private static let glassFill = Color.white.opacity(0.78)

  /// 잠금화면 Live Activity 슬롯 전체를 글래스 톤으로 채운다(검은 외곽 프레임 없음).
  static var lockScreenBackground: some View {
    glassFill
  }

  static let lockScreenContentInsets = EdgeInsets(top: 20, leading: 20, bottom: 20, trailing: 20)

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
    let bodySize: CGFloat = 19
    let labelSize: CGFloat = 11

    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 8) {
        RoundedRectangle(cornerRadius: 7, style: .continuous)
          .fill(headlineColor)
          .frame(width: 24, height: 24)
          .overlay(
            Image(systemName: "text.bubble.fill")
              .font(.system(size: 12, weight: .heavy))
              .foregroundStyle(.white)
          )

        Text("POKIT")
          .font(.system(size: labelSize, weight: .black))
          .foregroundStyle(headlineColor.opacity(0.60))
          .tracking(1.1)
          .lineLimit(1)
      }

      Text(q.bodyText)
        .font(.system(size: bodySize, weight: .bold))
        .foregroundStyle(headlineColor)
        .lineSpacing(1)
        .lineLimit(8)
        .minimumScaleFactor(0.80)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
