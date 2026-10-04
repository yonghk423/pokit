import ActivityKit
import SwiftUI
import WidgetKit

/// 빠른 메모 — 잠금화면에서 본문 텍스트 우선(상태줄·장식 UI 없음).
@available(iOS 16.1, *)
enum QuickMemoModeLiveActivityView {
  private static let defaultHeadline = Color(red: 0.10, green: 0.10, blue: 0.10)
  private static let defaultGlassFill = Color.white.opacity(0.78)

  /// 잠금화면 Live Activity 슬롯 배경 (페이로드 면색 또는 기본 글래스).
  static func lockScreenBackground(
    for q: PokitLiveActivityAttributes.ContentState.QuickMemoLiveContent?
  ) -> Color {
    guard let hex = q?.faceHex?.trimmingCharacters(in: .whitespacesAndNewlines),
          !hex.isEmpty,
          let color = Color(pokitHex: hex)
    else {
      return defaultGlassFill
    }
    return color.opacity(0.94)
  }

  /// 본문만 안쪽 여백 — 면색은 슬롯 edge-to-edge로 채운다.
  static let lockScreenContentInsets = EdgeInsets(top: 14, leading: 16, bottom: 14, trailing: 16)

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
    let bodySize: CGFloat = 10
    let ink: Color = {
      if let hex = q.inkHex?.trimmingCharacters(in: .whitespacesAndNewlines),
         !hex.isEmpty,
         let color = Color(pokitHex: hex)
      {
        return color
      }
      return q.usesLightInk == true ? Color.white : defaultHeadline
    }()

    Text(q.bodyText)
      .font(.system(size: bodySize, weight: .semibold))
      .foregroundStyle(ink)
      .lineSpacing(1)
      .lineLimit(8)
      .minimumScaleFactor(0.80)
      .multilineTextAlignment(.leading)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

private extension Color {
  /// `#RRGGBB` 또는 `RRGGBB`
  init?(pokitHex: String) {
    var hex = pokitHex.trimmingCharacters(in: .whitespacesAndNewlines)
    if hex.hasPrefix("#") { hex.removeFirst() }
    guard hex.count == 6, let value = UInt32(hex, radix: 16) else { return nil }
    let r = Double((value >> 16) & 0xFF) / 255
    let g = Double((value >> 8) & 0xFF) / 255
    let b = Double(value & 0xFF) / 255
    self = Color(red: r, green: g, blue: b)
  }
}
