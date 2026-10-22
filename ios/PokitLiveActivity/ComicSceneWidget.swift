import AppIntents
import SwiftUI
import WidgetKit

private struct ComicSceneWidgetTodo: Decodable, Identifiable {
  let id: String
  let text: String
  let completed: Bool
}

private struct ComicSceneWidgetSnapshot: Decodable {
  let id: String?
  let diaryTitle: String?
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
    pen: "#202020"
  )
}

private func loadComicSceneWidgetModel(sceneId: String?) -> ComicSceneWidgetModel {
  guard let defaults = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readComicSceneWidgetJson(from: defaults),
        let data = raw.data(using: .utf8),
        let bundle = try? JSONDecoder().decode(ComicSceneWidgetBundle.self, from: data)
  else { return .empty }

  let selectedId = sceneId?.isEmpty == false ? sceneId : bundle.fallbackSceneId
  guard let row = bundle.scenes?.first(where: { $0.id == selectedId }),
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
    pen: row.pen ?? "#202020"
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
    let model = loadComicSceneWidgetModel(sceneId: configuration.scene?.id)
    return ComicSceneWidgetEntry(date: .now, model: model)
  }

  func timeline(for configuration: SelectComicSceneIntent, in context: Context) async -> Timeline<ComicSceneWidgetEntry> {
    let entry = ComicSceneWidgetEntry(
      date: .now,
      model: loadComicSceneWidgetModel(sceneId: configuration.scene?.id)
    )
    return Timeline(entries: [entry], policy: .never)
  }
}

@available(iOS 17.0, *)
private struct ComicSceneWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComicSceneWidgetEntry

  private var model: ComicSceneWidgetModel { entry.model }
  private var ink: Color { dayPlanWidgetColor(hex: model.pen, fallback: .black) }

  private func artwork(width: CGFloat, height: CGFloat) -> some View {
    Image("comic_\(model.imageId)")
      .resizable().scaledToFill()
      .frame(width: width, height: height)
      .clipped()
      .accessibilityHidden(true)
  }

  private var caption: some View {
    HStack(alignment: .firstTextBaseline, spacing: 5) {
      Text(String(format: "%02d", model.index))
        .font(.system(size: 10, design: .rounded)).opacity(0.6)
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
          Image("comic_10-park-walk").resizable().scaledToFill()
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
          artwork(width: proxy.size.width, height: proxy.size.height * imageRatio)
          VStack(alignment: .leading, spacing: 5) {
            caption
            if family == .systemLarge {
              if !model.memo.isEmpty { memo(lines: model.todos.isEmpty ? 5 : 2) }
              if !model.todos.isEmpty {
                Text(PokitWidgetL10n.text(ko: "오늘 할 일", en: "Today's to-dos", ja: "今日のタスク"))
                  .font(.system(size: 11, weight: .semibold)).opacity(0.65)
                let rowLimit = max(1, min(4, Int((proxy.size.height * (1 - imageRatio) - (model.memo.isEmpty ? 67 : 104)) / 20)))
                ForEach(model.todos.prefix(rowLimit)) { todo in
                  HStack(spacing: 6) {
                    Image(systemName: todo.completed ? "checkmark.square.fill" : "square")
                      .font(.system(size: 12))
                    Text(todo.text).font(.system(size: 12))
                      .strikethrough(todo.completed).lineLimit(1).truncationMode(.tail)
                    Spacer(minLength: 0)
                  }.opacity(todo.completed ? 0.55 : 1)
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
    .widgetURL(PokitAppGroup.WidgetOpenURL.dayPlan)
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
