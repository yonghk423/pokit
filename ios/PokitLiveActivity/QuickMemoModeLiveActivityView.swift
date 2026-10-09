import ActivityKit
import ImageIO
import SwiftUI
import UIKit
import WidgetKit

/// 빠른 메모 — 잠금화면에서 본문·체크·사진·캘린더.
@available(iOS 16.1, *)
enum QuickMemoModeLiveActivityView {
  private static let defaultHeadline = Color(red: 0.10, green: 0.10, blue: 0.10)
  private static let defaultGlassFill = Color.white.opacity(0.78)
  private static let defaultFontSize: CGFloat = 28

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
  static let lockScreenContentInsets = EdgeInsets(top: 10, leading: 12, bottom: 10, trailing: 12)

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
    let bodySize = resolvedFontSize(q.fontSizePt)
    let ink: Color = {
      if let hex = q.inkHex?.trimmingCharacters(in: .whitespacesAndNewlines),
         !hex.isEmpty,
         let color = Color(pokitHex: hex)
      {
        return color
      }
      return q.usesLightInk == true ? Color.white : defaultHeadline
    }()
    let showCalendar = q.showCalendar == true
    let photo = loadAppGroupImage(relativePath: q.photoRelativePath)

    HStack(alignment: .top, spacing: 10) {
      if let photo {
        // iOS 18+ Live Activity는 기본 accent 렌더로 사진을 단색 실루엣(회색 네모)처럼 그릴 수 있음
        photoView(photo)
          .frame(width: 56, height: 56, alignment: .center)
          .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
      }

      Text(q.bodyText)
        .font(.system(size: bodySize, weight: .semibold))
        .foregroundStyle(ink)
        .lineSpacing(1)
        .lineLimit(8)
        .minimumScaleFactor(0.45)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

      if showCalendar {
        miniCalendar(dateKey: q.calendarDateKey, ink: ink)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private static func resolvedFontSize(_ value: Double?) -> CGFloat {
    let allowed: Set<CGFloat> = [24, 28, 32, 36]
    guard let value else { return defaultFontSize }
    let pt = CGFloat(value)
    return allowed.contains(pt) ? pt : defaultFontSize
  }

  @ViewBuilder
  private static func photoView(_ photo: UIImage) -> some View {
    // widgetAccentedRenderingMode는 Image에만 있음 — resizable 직후, View로 지워지기 전에 적용
    if #available(iOS 18.0, *) {
      Image(uiImage: photo)
        .resizable()
        .widgetAccentedRenderingMode(.fullColor)
        .scaledToFit()
    } else {
      Image(uiImage: photo)
        .resizable()
        .renderingMode(.original)
        .scaledToFit()
    }
  }

  /// 잠금화면 사진 슬롯(56pt). 이보다 큰 원본은 시스템이 회색 칸으로만 그린다.
  private static let photoSlotPoints: CGFloat = 56
  private static let photoPixelScale: CGFloat = 3

  private static func loadAppGroupImage(relativePath: String?) -> UIImage? {
    let relative = (relativePath ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !relative.isEmpty else { return nil }
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: PokitAppGroup.identifier
      )
    else {
      return nil
    }
    let url = container.appendingPathComponent(relative)
    guard FileManager.default.fileExists(atPath: url.path) else { return nil }
    return thumbnailForLiveActivity(at: url)
  }

  /// 긴 변을 슬롯의 3x 픽셀 이하로 줄이고, 포인트 크기도 슬롯을 넘지 않게 한다.
  private static func thumbnailForLiveActivity(at url: URL) -> UIImage? {
    let maxPixel = photoSlotPoints * photoPixelScale
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: maxPixel,
      kCGImageSourceShouldCacheImmediately: true,
    ]
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
      return nil
    }
    return UIImage(cgImage: cgImage, scale: photoPixelScale, orientation: .up)
  }

  @ViewBuilder
  private static func miniCalendar(dateKey: String?, ink: Color) -> some View {
    let cal = Calendar.current
    let day = parseDateKey(dateKey) ?? Date()
    let comps = cal.dateComponents([.year, .month, .day], from: day)
    let year = comps.year ?? 0
    let month = comps.month ?? 1
    let today = comps.day ?? 1
    let firstOfMonth = cal.date(from: DateComponents(year: year, month: month, day: 1)) ?? day
    let weekdayIndex = cal.component(.weekday, from: firstOfMonth) // 1=Sun
    let leadingBlanks = (weekdayIndex + 5) % 7 // Mon-first
    let daysInMonth = cal.range(of: .day, in: .month, for: firstOfMonth)?.count ?? 30
    let cells: [String] = {
      var rows: [String] = Array(repeating: "", count: leadingBlanks)
      rows.append(contentsOf: (1...daysInMonth).map(String.init))
      while rows.count % 7 != 0 { rows.append("") }
      return rows
    }()
    let weekRows = stride(from: 0, to: cells.count, by: 7).map { start in
      Array(cells[start..<min(start + 7, cells.count)])
    }

    VStack(alignment: .trailing, spacing: 2) {
      Text(String(format: "%d.%d", month, year % 100))
        .font(.system(size: 9, weight: .bold))
        .foregroundStyle(ink.opacity(0.85))
      ForEach(Array(weekRows.enumerated()), id: \.offset) { _, week in
        HStack(spacing: 1) {
          ForEach(Array(week.enumerated()), id: \.offset) { _, label in
            let isToday = Int(label) == today
            Text(label.isEmpty ? " " : label)
              .font(.system(size: 7, weight: isToday ? .heavy : .medium))
              .foregroundStyle(isToday ? Color.white : ink.opacity(0.75))
              .frame(width: 10, height: 10)
              .background(
                isToday
                  ? RoundedRectangle(cornerRadius: 2, style: .continuous).fill(ink)
                  : nil
              )
          }
        }
      }
    }
    .frame(width: 78, alignment: .topTrailing)
  }

  private static func parseDateKey(_ key: String?) -> Date? {
    guard let key, !key.isEmpty else { return nil }
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: key)
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
