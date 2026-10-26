import AppIntents
import SwiftUI
import WidgetKit
import UIKit

private struct ComicSceneWidgetTodo: Decodable, Identifiable {
  let id: String
  let text: String
  let completed: Bool
}

private struct ComicSceneWidgetSnapshot: Decodable {
  let id: String?
  let diaryTitle: String?
  let dateKey: String?
  let title: String?
  let imageId: String?
  let index: Int?
  let total: Int?
  let memo: String?
  let todos: [ComicSceneWidgetTodo]?
  let paper: String?
  let pen: String?
}

private struct ComicSceneWidgetBundle: Decodable {
  let fallbackSceneId: String?
  let scenes: [ComicSceneWidgetSnapshot]?
}

private struct ComicWeatherWidgetSnapshot: Decodable {
  let temperature: Int?
  let description: String?
  let city: String?
  let icon: String?
  let fetchedAt: Double?
}

private struct ComicWeatherBadge {
  let temperature: Int
  let iconCode: String
  let description: String
  let city: String
}

private struct ComicSceneWidgetModel {
  let id: String
  let diaryTitle: String
  let title: String
  let imageId: String
  let index: Int
  let total: Int
  let memo: String
  let todos: [ComicSceneWidgetTodo]
  let paper: String
  let pen: String
  let weather: ComicWeatherBadge?

  static let empty = ComicSceneWidgetModel(
    id: "",
    diaryTitle: "",
    title: "",
    imageId: "",
    index: 0,
    total: 0,
    memo: "",
    todos: [],
    paper: "#FFFEFA",
    pen: "#202020",
    weather: nil
  )
}

private let comicWeatherMaxAgeMs: Double = 6 * 60 * 60 * 1000

private func loadComicWeatherBadge() -> ComicWeatherBadge? {
  guard let defaults = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readWeatherWidgetJson(from: defaults),
        let data = raw.data(using: .utf8),
        let snapshot = try? JSONDecoder().decode(ComicWeatherWidgetSnapshot.self, from: data),
        let temperature = snapshot.temperature
  else { return nil }
  let fetchedAt = snapshot.fetchedAt ?? 0
  if fetchedAt > 0, Date().timeIntervalSince1970 * 1000 - fetchedAt > comicWeatherMaxAgeMs {
    return nil
  }
  return ComicWeatherBadge(
    temperature: temperature,
    iconCode: snapshot.icon ?? "",
    description: snapshot.description ?? "",
    city: snapshot.city?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  )
}

/// 앱 `WeatherMark`와 같은 24칸 선 아이콘.
private struct ComicWeatherMark: View {
  var color: Color
  var size: CGFloat

  var body: some View {
    Canvas { context, _ in
      let scale = size / 24
      var sun = Path()
      sun.addEllipse(in: CGRect(x: 5.5 * scale, y: 5.5 * scale, width: 7 * scale, height: 7 * scale))
      var rays = Path()
      func ray(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) {
        rays.move(to: CGPoint(x: x1 * scale, y: y1 * scale))
        rays.addLine(to: CGPoint(x: x2 * scale, y: y2 * scale))
      }
      ray(9, 1.5, 9, 3)
      ray(9, 15, 9, 16.5)
      ray(1.5, 9, 3, 9)
      ray(15, 9, 16.5, 9)
      var cloud = Path()
      cloud.move(to: CGPoint(x: 7.5 * scale, y: 19.2 * scale))
      cloud.addLine(to: CGPoint(x: 17.7 * scale, y: 19.2 * scale))
      addSvgArc(&cloud, rx: 3.3 * scale, ry: 3.3 * scale, large: false, sweep: false, to: CGPoint(x: 17.9 * scale, y: 12.6 * scale))
      addSvgArc(&cloud, rx: 4.6 * scale, ry: 4.6 * scale, large: false, sweep: false, to: CGPoint(x: 9.2 * scale, y: 13.2 * scale))
      addSvgArc(&cloud, rx: 3 * scale, ry: 3 * scale, large: false, sweep: false, to: CGPoint(x: 7.5 * scale, y: 19.2 * scale))
      cloud.closeSubpath()
      let round = StrokeStyle(lineWidth: 1.25 * scale, lineCap: .round, lineJoin: .round)
      context.stroke(sun, with: .color(color), style: round)
      context.stroke(rays, with: .color(color), style: StrokeStyle(lineWidth: 1.1 * scale, lineCap: .round, lineJoin: .round))
      context.stroke(cloud, with: .color(color), style: round)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

private func addSvgArc(_ path: inout Path, rx rxIn: CGFloat, ry ryIn: CGFloat, large: Bool, sweep: Bool, to end: CGPoint) {
  guard let start = path.currentPoint else { return }
  var rx = abs(rxIn)
  var ry = abs(ryIn)
  if rx == 0 || ry == 0 {
    path.addLine(to: end)
    return
  }
  let dx = (start.x - end.x) / 2
  let dy = (start.y - end.y) / 2
  var rxsq = rx * rx
  var rysq = ry * ry
  let lambda = (dx * dx) / rxsq + (dy * dy) / rysq
  if lambda > 1 {
    let fit = sqrt(lambda)
    rx *= fit
    ry *= fit
    rxsq = rx * rx
    rysq = ry * ry
  }
  let sign: CGFloat = large == sweep ? -1 : 1
  let numerator = max(0, rxsq * rysq - rxsq * dy * dy - rysq * dx * dx)
  let coef = sign * sqrt(numerator / max(rxsq * dy * dy + rysq * dx * dx, 0.000_001))
  let cxp = coef * rx * dy / ry
  let cyp = coef * -ry * dx / rx
  let cx = cxp + (start.x + end.x) / 2
  let cy = cyp + (start.y + end.y) / 2
  func angle(_ ux: CGFloat, _ uy: CGFloat, _ vx: CGFloat, _ vy: CGFloat) -> CGFloat {
    let dot = ux * vx + uy * vy
    let length = sqrt(ux * ux + uy * uy) * sqrt(vx * vx + vy * vy)
    var turn = acos(min(1, max(-1, dot / max(length, 0.000_001))))
    if ux * vy - uy * vx < 0 { turn = -turn }
    return turn
  }
  let theta = angle(1, 0, (dx - cxp) / rx, (dy - cyp) / ry)
  var delta = angle((dx - cxp) / rx, (dy - cyp) / ry, (-dx - cxp) / rx, (-dy - cyp) / ry)
  if !sweep && delta > 0 { delta -= 2 * .pi }
  if sweep && delta < 0 { delta += 2 * .pi }
  let steps = max(8, Int(abs(delta) / (.pi / 8)))
  for step in 1...steps {
    let t = theta + delta * CGFloat(step) / CGFloat(steps)
    path.addLine(to: CGPoint(x: cx + rx * cos(t), y: cy + ry * sin(t)))
  }
}

private func loadComicSceneWidgetModel(sceneId: String?, dateKey: String? = nil) -> ComicSceneWidgetModel {
  let weather = loadComicWeatherBadge()
  guard let defaults = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readComicSceneWidgetJson(from: defaults),
        let data = raw.data(using: .utf8),
        let bundle = try? JSONDecoder().decode(ComicSceneWidgetBundle.self, from: data)
  else { return .empty }

  let selectedId = sceneId?.isEmpty == false ? sceneId : bundle.fallbackSceneId
  let scenes = (bundle.scenes ?? []).filter { dateKey == nil || ($0.dateKey ?? "undated") == dateKey }
  guard let row = scenes.first(where: { $0.id == selectedId }) ?? scenes.first,
        let imageId = row.imageId,
        !imageId.isEmpty
  else { return .empty }

  return ComicSceneWidgetModel(
    id: row.id ?? "",
    diaryTitle: row.diaryTitle ?? "",
    title: row.title ?? "",
    imageId: imageId,
    index: max(1, row.index ?? 1),
    total: max(1, row.total ?? 1),
    memo: row.memo ?? "",
    todos: (row.todos ?? []).filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty },
    paper: row.paper ?? "#FFFEFA",
    pen: row.pen ?? "#202020",
    weather: weather
  )
}

private struct ComicSceneWidgetEntry: TimelineEntry {
  let date: Date
  let model: ComicSceneWidgetModel
}

@available(iOS 17.0, *)
private struct ComicSceneWidgetProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> ComicSceneWidgetEntry {
    ComicSceneWidgetEntry(date: .now, model: .empty)
  }

  func snapshot(for configuration: SelectComicSceneIntent, in context: Context) async -> ComicSceneWidgetEntry {
    let model = loadComicSceneWidgetModel(sceneId: configuration.scene?.id, dateKey: configuration.date?.id)
    return ComicSceneWidgetEntry(date: .now, model: model)
  }

  func timeline(for configuration: SelectComicSceneIntent, in context: Context) async -> Timeline<ComicSceneWidgetEntry> {
    let entry = ComicSceneWidgetEntry(
      date: .now,
      model: loadComicSceneWidgetModel(sceneId: configuration.scene?.id, dateKey: configuration.date?.id)
    )
    return Timeline(entries: [entry], policy: .never)
  }
}

// Normalized top-left coordinates, reviewed against every bundled scene.
// Protect the whole head (hair/ears included), not just the face's center.
private enum ComicSceneWidgetCrop {
  static let faceCenters: [String: CGPoint] = [
    "01-exercise": CGPoint(x: 0.49, y: 0.25),
    "02-study": CGPoint(x: 0.52, y: 0.31),
    "03-meeting": CGPoint(x: 0.51, y: 0.30),
    "04-laundry": CGPoint(x: 0.42, y: 0.22),
    "05-work": CGPoint(x: 0.42, y: 0.25),
    "06-reading": CGPoint(x: 0.60, y: 0.36),
    "07-movie-home": CGPoint(x: 0.72, y: 0.37),
    "08-study-hoodie": CGPoint(x: 0.51, y: 0.29),
    "09-coffee-tablet": CGPoint(x: 0.43, y: 0.29),
    "10-park-walk": CGPoint(x: 0.47, y: 0.25),
    "11-photography": CGPoint(x: 0.47, y: 0.25),
    "12-weights": CGPoint(x: 0.42, y: 0.32),
    "13-yoga": CGPoint(x: 0.46, y: 0.25),
    "14-headphone-run": CGPoint(x: 0.48, y: 0.25),
    "15-eating": CGPoint(x: 0.50, y: 0.29),
    "16-cinema": CGPoint(x: 0.43, y: 0.30),
    "17-web-browsing": CGPoint(x: 0.50, y: 0.33),
    "18-shopping": CGPoint(x: 0.50, y: 0.24),
    "19-hiking": CGPoint(x: 0.50, y: 0.25),
    "20-swimming": CGPoint(x: 0.49, y: 0.45),
    "21-airport-travel": CGPoint(x: 0.50, y: 0.29),
    "22-driving": CGPoint(x: 0.33, y: 0.30),
    "23-morning-stretch": CGPoint(x: 0.48, y: 0.22),
    "24-making-bed": CGPoint(x: 0.50, y: 0.22),
    "25-skincare": CGPoint(x: 0.48, y: 0.18),
    "26-getting-dressed": CGPoint(x: 0.45, y: 0.24),
    "27-breakfast": CGPoint(x: 0.48, y: 0.20),
    "28-cooking": CGPoint(x: 0.50, y: 0.22),
    "29-dishes": CGPoint(x: 0.49, y: 0.18),
    "30-vacuuming": CGPoint(x: 0.52, y: 0.21),
    "31-organizing-closet": CGPoint(x: 0.44, y: 0.22),
    "32-watering-plants": CGPoint(x: 0.48, y: 0.23),
    "33-grocery-shopping": CGPoint(x: 0.50, y: 0.19),
    "34-subway-commute": CGPoint(x: 0.46, y: 0.20),
    "35-bus-ride": CGPoint(x: 0.42, y: 0.23),
    "36-cycling": CGPoint(x: 0.45, y: 0.30),
    "37-journaling": CGPoint(x: 0.47, y: 0.27),
    "38-listening-music": CGPoint(x: 0.46, y: 0.28),
    "39-piano-practice": CGPoint(x: 0.43, y: 0.28),
    "40-video-call": CGPoint(x: 0.50, y: 0.37),
    "41-pet-walk": CGPoint(x: 0.34, y: 0.23),
    "42-meditation": CGPoint(x: 0.49, y: 0.41),
    "43-sketching": CGPoint(x: 0.47, y: 0.28),
    "44-baking": CGPoint(x: 0.48, y: 0.19),
    "45-board-game": CGPoint(x: 0.55, y: 0.30),
    "46-camping": CGPoint(x: 0.38, y: 0.35),
    "47-fold-laundry": CGPoint(x: 0.48, y: 0.19),
    "48-recycling": CGPoint(x: 0.47, y: 0.20),
    "49-guitar": CGPoint(x: 0.48, y: 0.31),
    "50-nap": CGPoint(x: 0.30, y: 0.45),
    "51-sleeping-in-bed": CGPoint(x: 0.58, y: 0.36),
    "52-reading-cafe": CGPoint(x: 0.46, y: 0.26),
    "53-diary-in-bed": CGPoint(x: 0.38, y: 0.31),
    "54-seaside-trip": CGPoint(x: 0.56, y: 0.26),
    "55-window-magazine": CGPoint(x: 0.55, y: 0.29),
    "56-bookstore": CGPoint(x: 0.50, y: 0.34),
    "breakfast": CGPoint(x: 0.48, y: 0.20),
    "focus": CGPoint(x: 0.42, y: 0.25),
    "read": CGPoint(x: 0.60, y: 0.36),
    "wake": CGPoint(x: 0.48, y: 0.22),
    "walk": CGPoint(x: 0.47, y: 0.25),
    "puppy-ball-play": CGPoint(x: 0.40, y: 0.46),
    "puppy-bath": CGPoint(x: 0.46, y: 0.42),
    "puppy-car-ride": CGPoint(x: 0.50, y: 0.37),
    "puppy-fetch": CGPoint(x: 0.62, y: 0.43),
    "puppy-grass-sniff": CGPoint(x: 0.35, y: 0.60),
    "puppy-meal": CGPoint(x: 0.32, y: 0.61),
    "puppy-nap": CGPoint(x: 0.30, y: 0.55),
    "puppy-park-walk": CGPoint(x: 0.40, y: 0.43),
    "puppy-seaside": CGPoint(x: 0.39, y: 0.48),
    "puppy-stretch": CGPoint(x: 0.41, y: 0.61),
    "puppy-towel": CGPoint(x: 0.42, y: 0.43),
    "puppy-treat": CGPoint(x: 0.42, y: 0.58),
    "puppy-wait-door": CGPoint(x: 0.39, y: 0.41),
    "puppy-water": CGPoint(x: 0.30, y: 0.61),
    "puppy-window-watch": CGPoint(x: 0.37, y: 0.37),
  ]

  static func protectedBounds(for imageId: String) -> CGRect {
    if imageId == "23-morning-stretch" || imageId == "wake" {
      // Keep the raised hands as well as the head in the morning stretch.
      return CGRect(x: 0.33, y: 0.01, width: 0.30, height: 0.31)
    }
    if imageId == "45-board-game" {
      return CGRect(x: 0.30, y: 0.20, width: 0.59, height: 0.22)
    }
    let center = faceCenters[imageId] ?? CGPoint(x: 0.5, y: 0.28)
    let radius: CGFloat = imageId.hasPrefix("puppy-") ? 0.14 : 0.09
    return CGRect(x: max(0, center.x - radius), y: max(0, center.y - radius),
                  width: radius * 2, height: radius * 2)
  }

  static func origin(imageSize: CGSize, viewport: CGSize, imageId: String) -> CGPoint {
    let bounds = protectedBounds(for: imageId)
    let scale = max(viewport.width / imageSize.width, viewport.height / imageSize.height)
    let rendered = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)

    func offset(length: CGFloat, visible: CGFloat, headStart: CGFloat, headEnd: CGFloat, placement: CGFloat) -> CGFloat {
      let excess = max(0, length - visible)
      // A little breathing room also keeps hair away from the widget's rounded corners.
      let padding = min(12, visible * 0.08)
      let preferred = (headStart + headEnd) * length / 2 - visible * placement
      let lower = max(0, headEnd * length + padding - visible)
      let upper = min(excess, headStart * length - padding)
      if lower <= upper { return min(upper, max(lower, preferred)) }
      return min(excess, max(0, (headStart + headEnd) * length / 2 - visible / 2))
    }

    return CGPoint(
      x: offset(length: rendered.width, visible: viewport.width, headStart: bounds.minX, headEnd: bounds.maxX, placement: 0.5),
      y: offset(length: rendered.height, visible: viewport.height, headStart: bounds.minY, headEnd: bounds.maxY, placement: 0.36)
    )
  }
}

@available(iOS 17.0, *)
private struct ComicSceneWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComicSceneWidgetEntry

  private var model: ComicSceneWidgetModel { entry.model }
  private var ink: Color { dayPlanWidgetColor(hex: model.pen, fallback: .black) }

  private var isCompactWeather: Bool { family == .systemSmall }

  private func artwork(width: CGFloat, height: CGFloat) -> some View {
    let name = "comic_\(model.imageId)"
    let viewport = CGSize(width: max(1, width), height: max(1, height))
    let sourceSize = UIImage(named: name)?.size ?? CGSize(width: 720, height: 960)
    let scale = max(viewport.width / sourceSize.width, viewport.height / sourceSize.height)
    let origin = ComicSceneWidgetCrop.origin(imageSize: sourceSize, viewport: viewport, imageId: model.imageId)
    return Image(name)
      .resizable()
      .frame(width: sourceSize.width * scale, height: sourceSize.height * scale)
      .offset(x: -origin.x, y: -origin.y)
      .frame(width: viewport.width, height: viewport.height, alignment: .topLeading)
      .clipped()
      .accessibilityHidden(true)
  }

  @ViewBuilder
  private func weatherOverlay() -> some View {
    if let weather = model.weather {
      let iconSize: CGFloat = isCompactWeather ? 18 : 22
      let textSize: CGFloat = isCompactWeather ? 13 : 15
      let inset: CGFloat = isCompactWeather ? 8 : 12
      let label = weather.city.isEmpty ? "\(weather.temperature)°" : "\(weather.temperature)° · \(weather.city)"
      HStack(spacing: 6) {
        ComicWeatherMark(color: ink.opacity(0.72), size: iconSize)
        Text(label)
          .font(.system(size: textSize, weight: .regular))
          .foregroundStyle(ink)
          .lineLimit(1)
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(weather.description.isEmpty ? label : "\(label), \(weather.description)")
      .padding(inset)
    }
  }

  private var caption: some View {
    HStack(alignment: .firstTextBaseline, spacing: 5) {
      Text(model.title.isEmpty ? String(localized: "widget.comic.name") : model.title)
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .lineLimit(1).minimumScaleFactor(0.75)
    }
  }

  private func memo(lines: Int) -> some View {
    Text(model.memo)
      .font(.system(size: 12, weight: .medium))
      .lineLimit(lines).truncationMode(.tail)
      .frame(maxWidth: .infinity, alignment: .topLeading)
  }

  var body: some View {
    GeometryReader { proxy in
      if model.id.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          Image("comic_10-park-walk").resizable().scaledToFit()
            .frame(width: 44, height: 44).clipShape(ContainerRelativeShape())
            .accessibilityHidden(true)
          Text("widget.comic.name").font(.system(size: 17, weight: .bold, design: .rounded))
          Text("widget.comic.emptyMessage").font(.system(size: 12, weight: .medium)).lineLimit(3)
          Spacer(minLength: 0)
        }
        .padding(12)
      } else {
        let imageRatio: CGFloat = family == .systemSmall ? 0.70 : 0.48
        VStack(alignment: .leading, spacing: 0) {
          // The widget's own mask rounds the image at the outer top corners.
          ZStack(alignment: .topTrailing) {
            artwork(width: proxy.size.width, height: proxy.size.height * imageRatio)
            weatherOverlay()
          }
          VStack(alignment: .leading, spacing: 5) {
            caption
            if family == .systemLarge {
              if !model.memo.isEmpty { memo(lines: model.todos.isEmpty ? 5 : 2) }
              if !model.todos.isEmpty {
                Text(PokitWidgetL10n.text(ko: "오늘 할 일", en: "Today's to-dos", ja: "今日のタスク"))
                  .font(.system(size: 11, weight: .semibold)).opacity(0.65)
                let rowLimit = max(1, min(4, Int((proxy.size.height * (1 - imageRatio) - (model.memo.isEmpty ? 67 : 104)) / 25)))
                ForEach(model.todos.prefix(rowLimit)) { todo in
                  HStack(spacing: 6) {
                    // Exported from the app's ComicCheck, including its paper fill and ink contours.
                    Image(todo.completed ? "comic_check_checked" : "comic_check_unchecked")
                      .resizable().scaledToFit().frame(width: 20, height: 20)
                      .accessibilityHidden(true)
                    Text(todo.text).font(.system(size: 12))
                      .strikethrough(todo.completed).lineLimit(1).truncationMode(.tail)
                      .opacity(todo.completed ? 0.55 : 1)
                    Spacer(minLength: 0)
                  }
                }
                if model.todos.count > rowLimit {
                  Text("… +\(model.todos.count - rowLimit)")
                    .font(.system(size: 10)).opacity(0.6)
                }
              }
            }
            Spacer(minLength: 0)
          }
          .padding(.horizontal, 12)
          .padding(.top, 8)
          .padding(.bottom, 12)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .clipped()
        }
      }
    }
    .foregroundStyle(ink)
    .containerBackground(for: .widget) {
      PokitWidgetPaper(face: dayPlanWidgetColor(hex: model.paper, fallback: .white))
        .clipShape(ContainerRelativeShape())
    }
    .widgetURL(PokitAppGroup.WidgetOpenURL.comicDay)
  }
}

@available(iOS 17.0, *)
struct ComicSceneWidget: Widget {
  private let kind = "PokitComicSceneWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: SelectComicSceneIntent.self,
      provider: ComicSceneWidgetProvider()
    ) { entry in
      ComicSceneWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("widget.comic.name")
    .description("widget.comic.galleryDescription")
    .supportedFamilies([.systemSmall, .systemLarge])
    .contentMarginsDisabled()
  }
}
