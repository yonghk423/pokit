import AppIntents
import Foundation
import SwiftUI
import WidgetKit

// MARK: - JSON (RN pinned routine widget bundle / legacy single payload)

private struct PinnedRoutineChecklistItemJson: Decodable {
  let text: String
  let done: Bool
  let timeLabel: String?
}

private struct PinnedRoutineSnapshotJson: Decodable {
  let categoryKey: String?
  let title: String?
  let iconName: String?
  let summary: String?
  let detailLines: [String]?
  let checklistItems: [PinnedRoutineChecklistItemJson]?
  let progressLabel: String?
  let metricKind: String?
  let progressRatio: Double?
  let heroLine: String?
  let subLine: String?
  let alarmLine: String?
  let sparkWeights: [Double]?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let titleHighlightHex: String?
  let titleHighlightOpacity: Double?
  let isCompleted: Bool?
  let emptyMessage: String?
}

private struct PinnedRoutineBundleJson: Decodable {
  let version: Int?
  let fallbackCategoryKey: String?
  let routines: [PinnedRoutineSnapshotJson]?
}

private struct PinnedRoutineChecklistItem: Hashable {
  let text: String
  let done: Bool
  let timeLabel: String
}

private enum PinnedRoutineMetricKind: String {
  case none
  case checklist
  case reading
  case weight
  case intake
  case counter
}

private struct PinnedRoutineWidgetModel {
  let hasRoutine: Bool
  let title: String
  let detailLines: [String]
  let checklistItems: [PinnedRoutineChecklistItem]
  let progressLabel: String
  let metricKind: PinnedRoutineMetricKind
  let progressRatio: Double
  let heroLine: String
  let subLine: String
  let alarmLine: String
  let sparkWeights: [Double]
  let isCompleted: Bool
  let emptyMessage: String
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let titleHighlightHex: String?
  let titleHighlightOpacity: Double

  init(
    hasRoutine: Bool,
    title: String,
    detailLines: [String],
    checklistItems: [PinnedRoutineChecklistItem],
    progressLabel: String,
    metricKind: PinnedRoutineMetricKind,
    progressRatio: Double,
    heroLine: String,
    subLine: String,
    alarmLine: String = "",
    sparkWeights: [Double],
    isCompleted: Bool,
    emptyMessage: String,
    faceHex: String? = nil,
    inkHex: String? = nil,
    mutedHex: String? = nil,
    titleHighlightHex: String? = nil,
    titleHighlightOpacity: Double = 0
  ) {
    self.hasRoutine = hasRoutine
    self.title = title
    self.detailLines = detailLines
    self.checklistItems = checklistItems
    self.progressLabel = progressLabel
    self.metricKind = metricKind
    self.progressRatio = progressRatio
    self.heroLine = heroLine
    self.subLine = subLine
    self.alarmLine = alarmLine
    self.sparkWeights = sparkWeights
    self.isCompleted = isCompleted
    self.emptyMessage = emptyMessage
    self.faceHex = faceHex
    self.inkHex = inkHex
    self.mutedHex = mutedHex
    self.titleHighlightHex = titleHighlightHex
    self.titleHighlightOpacity = titleHighlightOpacity
  }
}

private let pinnedRoutineEmptyMessage = "홈 화면에서 위젯을 길게 눌러 루틴을 고르세요"

private func pinnedRoutineEmptyModel(
  faceHex: String? = nil,
  inkHex: String? = nil,
  mutedHex: String? = nil,
  message: String = pinnedRoutineEmptyMessage
) -> PinnedRoutineWidgetModel {
  PinnedRoutineWidgetModel(
    hasRoutine: false,
    title: "",
    detailLines: [],
    checklistItems: [],
    progressLabel: "",
    metricKind: .none,
    progressRatio: 0,
    heroLine: "",
    subLine: "",
    alarmLine: "",
    sparkWeights: [],
    isCompleted: false,
    emptyMessage: message,
    faceHex: faceHex,
    inkHex: inkHex,
    mutedHex: mutedHex,
    titleHighlightHex: nil,
    titleHighlightOpacity: 0
  )
}

private func loadPinnedRoutineRawData() -> Data? {
  guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readPinnedRoutineJson(from: ud),
        let data = raw.data(using: .utf8)
  else {
    return nil
  }
  return data
}

private func loadPinnedRoutineSnapshots() -> (fallbackKey: String?, routines: [PinnedRoutineSnapshotJson]) {
  guard let data = loadPinnedRoutineRawData() else {
    return (nil, [])
  }
  if let bundle = try? JSONDecoder().decode(PinnedRoutineBundleJson.self, from: data),
     let routines = bundle.routines,
     !routines.isEmpty {
    return (bundle.fallbackCategoryKey, routines)
  }
  // 레거시: 단일 페이로드
  if let single = try? JSONDecoder().decode(PinnedRoutineSnapshotJson.self, from: data) {
    return (single.categoryKey, [single])
  }
  return (nil, [])
}

private func model(from json: PinnedRoutineSnapshotJson) -> PinnedRoutineWidgetModel {
  let key = (json.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let title = (json.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let emptyMessage = {
    let msg = (json.emptyMessage ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return msg.isEmpty ? pinnedRoutineEmptyMessage : msg
  }()

  guard !key.isEmpty, !title.isEmpty else {
    return pinnedRoutineEmptyModel(
      faceHex: json.faceHex,
      inkHex: json.inkHex,
      mutedHex: json.mutedHex,
      message: emptyMessage
    )
  }

  let lines = (json.detailLines ?? [])
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty }
  let items = (json.checklistItems ?? []).compactMap { item -> PinnedRoutineChecklistItem? in
    let text = item.text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return nil }
    let time = (item.timeLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return PinnedRoutineChecklistItem(text: text, done: item.done, timeLabel: time)
  }
  let progress = (json.progressLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let kind = PinnedRoutineMetricKind(rawValue: (json.metricKind ?? "").lowercased()) ?? {
    if !items.isEmpty { return .checklist }
    if !lines.isEmpty { return .reading }
    return .none
  }()
  let hero = (json.heroLine ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let sub = (json.subLine ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let alarm = (json.alarmLine ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let sparks = (json.sparkWeights ?? []).filter { $0.isFinite }
  let ratio = min(1, max(0, json.progressRatio ?? 0))

  return PinnedRoutineWidgetModel(
    hasRoutine: true,
    title: title,
    detailLines: Array(lines.prefix(3)),
    checklistItems: Array(items.prefix(8)),
    progressLabel: progress,
    metricKind: kind,
    progressRatio: ratio,
    heroLine: hero,
    subLine: sub,
    alarmLine: alarm,
    sparkWeights: Array(sparks.suffix(14)),
    isCompleted: json.isCompleted ?? false,
    emptyMessage: emptyMessage,
    faceHex: json.faceHex,
    inkHex: json.inkHex,
    mutedHex: json.mutedHex,
    titleHighlightHex: {
      let raw = (json.titleHighlightHex ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      return raw.isEmpty ? nil : raw
    }(),
    titleHighlightOpacity: min(1, max(0, json.titleHighlightOpacity ?? 0))
  )
}

private func loadPinnedRoutineWidgetModel(categoryKey: String?) -> PinnedRoutineWidgetModel {
  let bundle = loadPinnedRoutineSnapshots()
  let routines = bundle.routines
  let requested = (categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let fallback = (bundle.fallbackKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

  let resolvedKey: String? = {
    if !requested.isEmpty,
       routines.contains(where: {
         ($0.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines) == requested
       }) {
      return requested
    }
    if !fallback.isEmpty,
       routines.contains(where: {
         ($0.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines) == fallback
       }) {
      return fallback
    }
    return routines
      .compactMap { $0.categoryKey?.trimmingCharacters(in: .whitespacesAndNewlines) }
      .first { !$0.isEmpty }
  }()

  guard let key = resolvedKey,
        let json = routines.first(where: {
          ($0.categoryKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines) == key
        })
  else {
    let appearance = routines.first
    return pinnedRoutineEmptyModel(
      faceHex: appearance?.faceHex,
      inkHex: appearance?.inkHex,
      mutedHex: appearance?.mutedHex,
      message: pinnedRoutineEmptyMessage
    )
  }
  return model(from: json)
}

// MARK: - Timeline
// App Intent / Entity 는 PokitShared/PokitWidgetConfigurationIntents.swift
// (앱·위젯 확장 양쪽 타깃에 포함 — Edit Widget 설정에 필요)

private struct PinnedRoutineEntry: TimelineEntry {
  let date: Date
  let model: PinnedRoutineWidgetModel
}

@available(iOS 17.0, *)
private struct PinnedRoutineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> PinnedRoutineEntry {
    // 갱신·루틴 전환 시 시스템이 placeholder를 잠깐 그린다.
    // 체중 스파크라인 샘플을 쓰면 다른 루틴으로 바꿀 때도 그래프 잔상이 보인다.
    PinnedRoutineEntry(
      date: Date(),
      model: PinnedRoutineWidgetModel(
        hasRoutine: true,
        title: "Routine",
        detailLines: [],
        checklistItems: [
          PinnedRoutineChecklistItem(text: "Item", done: true, timeLabel: ""),
          PinnedRoutineChecklistItem(text: "Item", done: false, timeLabel: ""),
        ],
        progressLabel: "1/2",
        metricKind: .checklist,
        progressRatio: 0.5,
        heroLine: "",
        subLine: "",
        sparkWeights: [],
        isCompleted: false,
        emptyMessage: "",
        faceHex: "#FFE566",
        inkHex: "#111111",
        titleHighlightHex: nil,
        titleHighlightOpacity: 0
      )
    )
  }

  func snapshot(for configuration: SelectPinnedRoutineIntent, in context: Context) async -> PinnedRoutineEntry {
    PinnedRoutineEntry(
      date: Date(),
      model: loadPinnedRoutineWidgetModel(categoryKey: configuration.routine?.id)
    )
  }

  func timeline(for configuration: SelectPinnedRoutineIntent, in context: Context) async -> Timeline<PinnedRoutineEntry> {
    let entry = PinnedRoutineEntry(
      date: Date(),
      model: loadPinnedRoutineWidgetModel(categoryKey: configuration.routine?.id)
    )
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    return Timeline(entries: [entry], policy: .after(next))
  }
}

// MARK: - Views

private struct PinnedWeightSparkline: View {
  let weights: [Double]
  /// large 위젯 — 면 채움·점·축 여백을 키움
  var emphasized: Bool = false
  @Environment(\.pokitWidgetInk) private var ink
  @Environment(\.pokitWidgetMuted) private var muted
  @Environment(\.pokitWidgetCompletedTint) private var completedTint

  var body: some View {
    GeometryReader { geo in
      let minV = weights.min() ?? 0
      let maxV = weights.max() ?? 1
      let lastV = weights.last ?? maxV
      let labelW: CGFloat = emphasized ? 30 : 24
      let padY: CGFloat = emphasized ? 12 : 8
      let drawW = max(1, geo.size.width - labelW - 6)
      let drawH = max(1, geo.size.height - padY * 2)
      let drawSize = CGSize(width: drawW, height: drawH)
      let pts = normalizedPoints(in: drawSize, minV: minV, maxV: maxV).map {
        CGPoint(x: $0.x + labelW + 2, y: $0.y + padY)
      }
      if pts.count >= 2 {
        // 라인 아래 면
        Path { path in
          path.move(to: CGPoint(x: pts[0].x, y: geo.size.height - 1))
          path.addLine(to: pts[0])
          for p in pts.dropFirst() {
            path.addLine(to: p)
          }
          path.addLine(to: CGPoint(x: pts[pts.count - 1].x, y: geo.size.height - 1))
          path.closeSubpath()
        }
        .fill(ink.opacity(emphasized ? 0.10 : 0.07))

        Path { path in
          path.move(to: pts[0])
          for p in pts.dropFirst() {
            path.addLine(to: p)
          }
        }
        .stroke(
          ink,
          style: StrokeStyle(lineWidth: emphasized ? 2.2 : 1.8, lineCap: .round, lineJoin: .round)
        )

        if emphasized {
          ForEach(Array(pts.enumerated()), id: \.offset) { _, p in
            Circle()
              .fill(ink)
              .frame(width: 4, height: 4)
              .position(p)
          }
        }

        if let last = pts.last {
          Circle()
            .fill(completedTint)
            .frame(width: emphasized ? 7 : 5, height: emphasized ? 7 : 5)
            .position(last)

          // 최근 체중 수치
          Text(Self.formatKg(lastV))
            .font(.system(size: emphasized ? 11 : 9, weight: .heavy, design: .rounded))
            .foregroundStyle(ink)
            .position(
              x: min(geo.size.width - 16, last.x - (emphasized ? 2 : 0)),
              y: max(padY * 0.55, last.y - (emphasized ? 12 : 9))
            )
        }

        // 좌측 min / max
        Text(Self.formatKg(maxV))
          .font(.system(size: emphasized ? 9 : 8, weight: .bold, design: .rounded))
          .foregroundStyle(muted)
          .frame(width: labelW, alignment: .trailing)
          .position(x: labelW * 0.5, y: padY + 3)

        Text(Self.formatKg(minV))
          .font(.system(size: emphasized ? 9 : 8, weight: .bold, design: .rounded))
          .foregroundStyle(muted)
          .frame(width: labelW, alignment: .trailing)
          .position(x: labelW * 0.5, y: geo.size.height - padY + 1)
      }
    }
  }

  private static func formatKg(_ value: Double) -> String {
    String(format: "%.1f", value)
  }

  private func normalizedPoints(in size: CGSize, minV: Double, maxV: Double) -> [CGPoint] {
    guard weights.count >= 2, size.width > 1, size.height > 1 else { return [] }
    let span = max(0.1, maxV - minV)
    let stepX = size.width / CGFloat(weights.count - 1)
    return weights.enumerated().map { index, value in
      let x = CGFloat(index) * stepX
      // 높은 체중 = 위 (차트 관례)
      let yNorm = (value - minV) / span
      let y = size.height * (1 - CGFloat(yNorm))
      return CGPoint(x: x, y: y)
    }
  }
}

private struct PinnedProgressBar: View {
  let ratio: Double
  @Environment(\.pokitWidgetIconBox) private var iconBox
  @Environment(\.pokitWidgetCompletedTint) private var completedTint

  var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule()
          .fill(iconBox)
        Capsule()
          .fill(completedTint)
          .frame(width: max(0, geo.size.width * CGFloat(min(1, max(0, ratio)))))
      }
    }
    .frame(height: 5)
  }
}

/// 앱 `CompletionRadioButton` square 와 동일 — 검정 채움 + 민트 체크
private struct PinnedCompletionCheck: View {
  let checked: Bool
  var size: CGFloat = 14

  private let checkedFill = Color(red: 9 / 255, green: 9 / 255, blue: 11 / 255) // #09090b
  private let checkMint = Color(red: 168 / 255, green: 218 / 255, blue: 220 / 255) // #A8DADC
  private let uncheckedBorder = Color.black.opacity(0.28)

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 0)
        .fill(checked ? checkedFill : Color.clear)
      RoundedRectangle(cornerRadius: 0)
        .strokeBorder(checked ? checkedFill : uncheckedBorder, lineWidth: checked ? 0 : 1.5)
      if checked {
        Image(systemName: "checkmark")
          .font(.system(size: size * 0.58, weight: .bold))
          .foregroundStyle(checkMint)
      }
    }
    .frame(width: size, height: size)
  }
}

/// 제목 + 중요도 형광펜. 형광펜은 글자 아래 — Text는 한 겹만 써서 small에서 말줄임이 깨지지 않게 한다.
private struct PinnedHighlightedTitle: View {
  let title: String
  let fontSize: CGFloat
  let highlightHex: String?
  let highlightOpacity: Double
  var lineLimit: Int = 1
  var minimumScaleFactor: CGFloat = 1
  @Environment(\.pokitWidgetInk) private var ink

  var body: some View {
    let trimmed = (highlightHex ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let alpha = min(1, max(0, highlightOpacity))
    let hasHighlight = !trimmed.isEmpty && alpha > 0.01
    let fill = dayPlanWidgetColor(hex: trimmed, fallback: .clear).opacity(min(alpha, 0.48))

    Text(title)
      .font(.system(size: fontSize, weight: .heavy))
      .foregroundStyle(ink)
      .lineLimit(lineLimit)
      .truncationMode(.tail)
      .minimumScaleFactor(minimumScaleFactor)
      .allowsTightening(true)
      .background(alignment: .bottom) {
        if hasHighlight {
          Rectangle()
            .fill(fill)
            .frame(height: 6)
            .padding(.horizontal, -2)
            .offset(y: 1)
            .allowsHitTesting(false)
        }
      }
  }
}

private struct PinnedRoutineEntryView: View {
  @Environment(\.widgetFamily) private var family
  @Environment(\.pokitWidgetInk) private var ink
  @Environment(\.pokitWidgetMuted) private var muted
  @Environment(\.pokitWidgetCompletedTint) private var completedTint
  @Environment(\.pokitWidgetIconBox) private var iconBox
  @Environment(\.pokitWidgetCompletedIconBox) private var completedIconBox
  let entry: PinnedRoutineEntry

  private var maxChecklistRows: Int {
    family == .systemSmall ? 3 : 6
  }

  var body: some View {
    let model = entry.model
    return DayPlanPostItChrome {
      Group {
        if model.hasRoutine {
          content(model: model)
        } else {
          emptyContent(message: model.emptyMessage)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }

  @ViewBuilder
  private func emptyContent(message: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(message)
        .font(.system(size: family == .systemSmall ? 13 : 14, weight: .semibold))
        .foregroundStyle(ink)
        .fixedSize(horizontal: false, vertical: true)
      Spacer(minLength: 0)
    }
  }

  @ViewBuilder
  private func content(model: PinnedRoutineWidgetModel) -> some View {
    switch model.metricKind {
    case .weight:
      weightContent(model: model, showsSparkline: true)
    case .counter:
      // hero·진행 바만 — 체중 스파크라인 레이아웃을 공유하지 않음
      weightContent(model: model, showsSparkline: false)
    case .intake:
      intakeContent(model: model)
    default:
      checklistOrDetailContent(model: model)
    }
  }

  @ViewBuilder
  private func intakeContent(model: PinnedRoutineWidgetModel) -> some View {
    let isSmall = family == .systemSmall
    // small 제외 — medium에서 슬롯 알람 시각 표시
    let showsAlarmTimes = !isSmall
    VStack(alignment: .leading, spacing: isSmall ? 5 : 6) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        PinnedHighlightedTitle(
          title: model.title,
          fontSize: isSmall ? 15 : 16,
          highlightHex: model.titleHighlightHex,
          highlightOpacity: model.titleHighlightOpacity,
          minimumScaleFactor: isSmall ? 0.85 : 1
        )
        .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
        .layoutPriority(1)
        if !model.progressLabel.isEmpty {
          Text(model.progressLabel)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(completedTint)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .layoutPriority(2)
        }
      }

      if !model.heroLine.isEmpty {
        Text(model.heroLine)
          .font(.system(size: isSmall ? 20 : 22, weight: .heavy, design: .rounded))
          .foregroundStyle(ink)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }

      if !model.subLine.isEmpty {
        Text(model.subLine)
          .font(.system(size: isSmall ? 11 : 12, weight: .semibold))
          .foregroundStyle(muted)
          .lineLimit(1)
          .minimumScaleFactor(0.85)
      }

      if !model.checklistItems.isEmpty {
        HStack(spacing: 6) {
          ForEach(Array(model.checklistItems.enumerated()), id: \.offset) { _, item in
            VStack(spacing: showsAlarmTimes ? 2 : 0) {
              Text(item.text)
                .font(.system(size: isSmall ? 11 : 12, weight: .bold))
                .foregroundStyle(item.done ? completedTint : ink)
                .lineLimit(1)
              if showsAlarmTimes, !item.timeLabel.isEmpty {
                Text(item.timeLabel)
                  .font(.system(size: 9, weight: .semibold, design: .rounded))
                  .foregroundStyle(muted)
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
              }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, isSmall ? 6 : 7)
            .padding(.horizontal, 2)
            .background(
              RoundedRectangle(cornerRadius: 0)
                .fill(item.done ? completedIconBox : iconBox)
            )
            .overlay(
              RoundedRectangle(cornerRadius: 0)
                .stroke(ink.opacity(item.done ? 0.12 : 0.2), lineWidth: 1)
            )
          }
        }
        .padding(.top, 2)
      }

      if model.checklistItems.count > 0 {
        PinnedProgressBar(ratio: model.progressRatio)
          .padding(.top, 2)
      }

      if showsAlarmTimes, !model.alarmLine.isEmpty {
        Text(model.alarmLine)
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(muted)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.top, 1)
      }
    }
  }

  /// small 제외 — medium에서 체중 그래프 표시
  private var showsWeightChart: Bool {
    family != .systemSmall
  }

  /// 기록이 1개여도 평탄한 선이 보이도록 최소 2점으로 맞춤
  private func displaySparkWeights(_ raw: [Double]) -> [Double] {
    let finite = raw.filter { $0.isFinite }
    if finite.count >= 2 { return finite }
    if let only = finite.first { return [only, only] }
    return []
  }

  @ViewBuilder
  private func weightContent(model: PinnedRoutineWidgetModel, showsSparkline: Bool) -> some View {
    let isSmall = family == .systemSmall
    let sparkWeights = showsSparkline ? displaySparkWeights(model.sparkWeights) : []
    let showSpark = showsSparkline && showsWeightChart && sparkWeights.count >= 2
    VStack(alignment: .leading, spacing: isSmall ? 5 : 6) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        PinnedHighlightedTitle(
          title: model.title,
          fontSize: isSmall ? 15 : 16,
          highlightHex: model.titleHighlightHex,
          highlightOpacity: model.titleHighlightOpacity,
          minimumScaleFactor: isSmall ? 0.85 : 1
        )
        .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
        .layoutPriority(1)
        if !model.progressLabel.isEmpty {
          Text(model.progressLabel)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(completedTint)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .layoutPriority(2)
        }
      }

      if !model.heroLine.isEmpty {
        Text(model.heroLine)
          .font(.system(size: isSmall ? 18 : 20, weight: .heavy, design: .rounded))
          .foregroundStyle(ink)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }

      if !model.subLine.isEmpty {
        Text(model.subLine)
          .font(.system(size: isSmall ? 11 : 12, weight: .semibold))
          .foregroundStyle(muted)
          .lineLimit(isSmall ? 2 : 1)
          .minimumScaleFactor(0.85)
      }

      // small: 진행 바만 / medium: 그래프 우선(잘림 방지). 그래프 없을 때만 바
      if isSmall || !showSpark {
        PinnedProgressBar(ratio: model.progressRatio)
          .padding(.top, 2)
      }

      if showSpark {
        PinnedWeightSparkline(weights: sparkWeights, emphasized: false)
          .frame(maxWidth: .infinity)
          .frame(height: 44)
          .layoutPriority(1)
          .padding(.top, 2)
      }
    }
  }

  @ViewBuilder
  private func checklistOrDetailContent(model: PinnedRoutineWidgetModel) -> some View {
    VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
      HStack(alignment: .center, spacing: 8) {
        PinnedHighlightedTitle(
          title: model.title,
          fontSize: family == .systemSmall ? 15 : 17,
          highlightHex: model.titleHighlightHex,
          highlightOpacity: model.titleHighlightOpacity,
          lineLimit: 2,
          minimumScaleFactor: 0.85
        )
        .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
        .layoutPriority(1)
        if !model.progressLabel.isEmpty {
          Text(model.progressLabel)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(muted)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .layoutPriority(2)
        } else if model.isCompleted {
          PinnedCompletionCheck(checked: true, size: 16)
            .layoutPriority(2)
        }
      }

      if !model.checklistItems.isEmpty {
        let visible = Array(model.checklistItems.prefix(maxChecklistRows))
        let checkSize: CGFloat = family == .systemSmall ? 14 : 16
        VStack(alignment: .leading, spacing: 4) {
          ForEach(Array(visible.enumerated()), id: \.offset) { _, item in
            HStack(alignment: .center, spacing: 6) {
              PinnedCompletionCheck(checked: item.done, size: checkSize)
              Text(item.text)
                .font(.system(size: family == .systemSmall ? 12 : 13, weight: .semibold))
                .foregroundStyle(
                  item.done
                    ? muted
                    : ink
                )
                .strikethrough(item.done, color: muted)
                .lineLimit(1)
              Spacer(minLength: 0)
            }
          }
          if model.checklistItems.count > maxChecklistRows {
            Text("…")
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(muted)
          }
        }
      } else {
        ForEach(Array(model.detailLines.enumerated()), id: \.offset) { _, line in
          Text(line)
            .font(.system(size: family == .systemSmall ? 12 : 13, weight: .semibold))
            .foregroundStyle(muted)
            .lineLimit(2)
        }
      }

      Spacer(minLength: 0)
    }
  }
}

@available(iOS 17.0, *)
struct PinnedRoutineWidget: Widget {
  private let kind = "PokitPinnedRoutineWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: SelectPinnedRoutineIntent.self,
      provider: PinnedRoutineProvider()
    ) { entry in
      let face = DayPlanWidgetPalette.faceColor(hex: entry.model.faceHex)
      PinnedRoutineEntryView(entry: entry)
        .pokitWidgetInkEnvironment(
          faceHex: entry.model.faceHex,
          inkHex: entry.model.inkHex,
          mutedHex: entry.model.mutedHex
        )
        .containerBackground(for: .widget) { face }
        .contentMargins(.all, 0)
        .widgetURL(PokitAppGroup.WidgetOpenURL.dayPlan)
    }
    .configurationDisplayName("widget.routine.name")
    .description("widget.routine.galleryDescription")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Bookstore Widget

private struct BookstoreWidgetBookJson: Decodable {
  let id: String?
  let title: String?
  let author: String?
  let currentPage: Int?
  let targetPage: Int?
  let totalPages: Int?
  let progressRatio: Double?
  let progressLabel: String?
  let memo: String?
  let statusLabel: String?
  let pagesLine: String?
  let remainingLabel: String?
  let percentLabel: String?
  let lastReadLabel: String?
  let todayGoalLabel: String?
}

private struct BookstoreWidgetBundleJson: Decodable {
  let version: Int?
  let fallbackBookId: String?
  let books: [BookstoreWidgetBookJson]?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let underlineText: Bool?
  let emptyMessage: String?
}

private struct BookstoreWidgetBookModel: Hashable {
  let id: String
  let title: String
  let author: String
  let currentPage: Int
  let targetPage: Int
  let totalPages: Int?
  let progressRatio: Double
  let progressLabel: String
  let memo: String
  let statusLabel: String
  let pagesLine: String
  let remainingLabel: String
  let percentLabel: String
  let lastReadLabel: String
  let todayGoalLabel: String
}

private struct BookstoreWidgetModel {
  let hasBook: Bool
  let book: BookstoreWidgetBookModel?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let underlineText: Bool
  let emptyMessage: String
}

private func loadBookstoreBundle() -> BookstoreWidgetBundleJson? {
  guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readBookstoreWidgetJson(from: ud),
        let data = raw.data(using: .utf8)
  else {
    return nil
  }
  return try? JSONDecoder().decode(BookstoreWidgetBundleJson.self, from: data)
}

private func resolveBookstoreModel(bookId: String?) -> BookstoreWidgetModel {
  let fallbackEmpty = String(localized: "widget.bookstore.emptyMessage")
  guard let bundle = loadBookstoreBundle() else {
    return BookstoreWidgetModel(
      hasBook: false,
      book: nil,
      faceHex: nil,
      inkHex: nil,
      mutedHex: nil,
      underlineText: false,
      emptyMessage: fallbackEmpty
    )
  }
  let normalized = (bundle.books ?? []).compactMap { row -> BookstoreWidgetBookModel? in
    let id = (row.id ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let title = (row.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !id.isEmpty, !title.isEmpty else { return nil }
    let author = (row.author ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let current = max(0, row.currentPage ?? 0)
    let target = max(1, row.targetPage ?? 1)
    let total = row.totalPages != nil ? max(1, row.totalPages ?? 1) : nil
    let ratio = min(1, max(0, row.progressRatio ?? 0))
    let progressLabel = (row.progressLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let memo = (row.memo ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let pagesLine = (row.pagesLine ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return BookstoreWidgetBookModel(
      id: id,
      title: title,
      author: author,
      currentPage: current,
      targetPage: target,
      totalPages: total,
      progressRatio: ratio,
      progressLabel: progressLabel,
      memo: memo,
      statusLabel: (row.statusLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines),
      pagesLine: pagesLine.isEmpty ? progressLabel : pagesLine,
      remainingLabel: (row.remainingLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines),
      percentLabel: (row.percentLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines),
      lastReadLabel: (row.lastReadLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines),
      todayGoalLabel: (row.todayGoalLabel ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    )
  }
  let requested = (bookId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let fallback = (bundle.fallbackBookId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let selected =
    normalized.first(where: { $0.id == requested }) ??
    normalized.first(where: { $0.id == fallback }) ??
    normalized.first

  return BookstoreWidgetModel(
    hasBook: selected != nil,
    book: selected,
    faceHex: bundle.faceHex,
    inkHex: bundle.inkHex,
    mutedHex: bundle.mutedHex,
    underlineText: bundle.underlineText ?? false,
    emptyMessage: (bundle.emptyMessage ?? "").isEmpty ? fallbackEmpty : (bundle.emptyMessage ?? fallbackEmpty)
  )
}

private struct BookstoreWidgetEntry: TimelineEntry {
  let date: Date
  let model: BookstoreWidgetModel
}

@available(iOS 17.0, *)
private struct BookstoreWidgetProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> BookstoreWidgetEntry {
    BookstoreWidgetEntry(
      date: Date(),
      model: BookstoreWidgetModel(
        hasBook: true,
        book: BookstoreWidgetBookModel(
          id: "sample",
          title: "어린 왕자",
          author: "앙투안 드 생텍쥐페리",
          currentPage: 48,
          targetPage: 120,
          totalPages: 144,
          progressRatio: 0.4,
          progressLabel: "48 / 144쪽",
          memo: "오늘은 60쪽까지 읽기",
          statusLabel: "읽는 중",
          pagesLine: "48P / 144P",
          remainingLabel: "남은 96쪽",
          percentLabel: "33%",
          lastReadLabel: "최근 10월 4일",
          todayGoalLabel: "오늘 40P → 60P"
        ),
        faceHex: "#FFE566",
        inkHex: "#111111",
        mutedHex: nil,
        underlineText: false,
        emptyMessage: String(localized: "widget.bookstore.emptyMessage")
      )
    )
  }

  func snapshot(for configuration: SelectBookstoreBookIntent, in context: Context) async -> BookstoreWidgetEntry {
    BookstoreWidgetEntry(
      date: Date(),
      model: resolveBookstoreModel(bookId: configuration.book?.id)
    )
  }

  func timeline(for configuration: SelectBookstoreBookIntent, in context: Context) async -> Timeline<BookstoreWidgetEntry> {
    let entry = BookstoreWidgetEntry(
      date: Date(),
      model: resolveBookstoreModel(bookId: configuration.book?.id)
    )
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    return Timeline(entries: [entry], policy: .after(next))
  }
}

private struct BookstoreWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: BookstoreWidgetEntry

  var body: some View {
    let model = entry.model
    let _ = DayPlanWidgetPalette.apply(faceHex: model.faceHex, inkHex: model.inkHex, mutedHex: model.mutedHex)
    return DayPlanPostItChrome {
      if let book = model.book, model.hasBook {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
          Text(book.title)
            .font(.system(size: family == .systemSmall ? 15 : 17, weight: .heavy))
            .foregroundStyle(DayPlanWidgetPalette.ink)
            .lineLimit(2)

          if !book.author.isEmpty {
            Text(book.author)
              .font(.system(size: 11, weight: .semibold))
              .foregroundStyle(DayPlanWidgetPalette.muted)
              .lineLimit(1)
          }

          Text(book.progressLabel)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(DayPlanWidgetPalette.ink)
            .lineLimit(1)

          PinnedProgressBar(ratio: book.progressRatio)
            .frame(height: 5)

          if !book.memo.isEmpty {
            Text(book.memo)
              .font(.system(size: 11, weight: .semibold))
              .foregroundStyle(DayPlanWidgetPalette.muted)
              .lineLimit(2)
              .padding(.top, 2)
          }
          Spacer(minLength: 0)
        }
      } else {
        Text(model.emptyMessage)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(DayPlanWidgetPalette.ink)
          .lineLimit(3)
      }
    }
  }
}

@available(iOS 17.0, *)
struct BookstoreWidget: Widget {
  static let kind = "PokitBookstoreWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: Self.kind,
      intent: SelectBookstoreBookIntent.self,
      provider: BookstoreWidgetProvider()
    ) { entry in
      let face = DayPlanWidgetPalette.faceColor(hex: entry.model.faceHex)
      BookstoreWidgetEntryView(entry: entry)
        .pokitWidgetInkEnvironment(
          faceHex: entry.model.faceHex,
          inkHex: entry.model.inkHex,
          mutedHex: entry.model.mutedHex
        )
        .containerBackground(for: .widget) { face }
        .contentMargins(.all, 0)
        .widgetURL(PokitAppGroup.WidgetOpenURL.bookstore)
    }
    .configurationDisplayName("widget.bookstore.name")
    .description("widget.bookstore.galleryDescription")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Note Widget

private struct NoteWidgetPageJson: Decodable {
  let id: String?
  let title: String?
  let preview: String?
  let createdDateKey: String?
}

private struct NoteWidgetBundleJson: Decodable {
  let version: Int?
  let fallbackPageId: String?
  let pages: [NoteWidgetPageJson]?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let underlineText: Bool?
  let emptyMessage: String?
}

private struct NoteWidgetPageModel: Hashable {
  let id: String
  let title: String
  let preview: String
  let createdDateKey: String
}

private struct NoteWidgetModel {
  let page: NoteWidgetPageModel?
  let faceHex: String?
  let inkHex: String?
  let mutedHex: String?
  let underlineText: Bool
  let emptyMessage: String
}

private func loadNoteBundle() -> NoteWidgetBundleJson? {
  guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
        let raw = PokitAppGroup.readNoteWidgetJson(from: ud),
        let data = raw.data(using: .utf8)
  else {
    return nil
  }
  return try? JSONDecoder().decode(NoteWidgetBundleJson.self, from: data)
}

private func resolveNoteModel(pageId: String?) -> NoteWidgetModel {
  let fallbackEmpty = String(localized: "widget.note.emptyMessage")
  guard let bundle = loadNoteBundle() else {
    return NoteWidgetModel(
      page: nil,
      faceHex: nil,
      inkHex: nil,
      mutedHex: nil,
      underlineText: false,
      emptyMessage: fallbackEmpty
    )
  }
  let pages = (bundle.pages ?? []).compactMap { row -> NoteWidgetPageModel? in
    let id = (row.id ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let title = (row.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !id.isEmpty, !title.isEmpty else { return nil }
    return NoteWidgetPageModel(
      id: id,
      title: title,
      preview: (row.preview ?? "").trimmingCharacters(in: .whitespacesAndNewlines),
      createdDateKey: (row.createdDateKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    )
  }
  var requested = (pageId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  if requested == "__empty__" { requested = "" }
  let fallback = (bundle.fallbackPageId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  let selected =
    pages.first(where: { $0.id == requested }) ??
    pages.first(where: { $0.id == fallback }) ??
    pages.first

  return NoteWidgetModel(
    page: selected,
    faceHex: bundle.faceHex,
    inkHex: bundle.inkHex,
    mutedHex: bundle.mutedHex,
    underlineText: bundle.underlineText ?? false,
    emptyMessage: (bundle.emptyMessage ?? "").isEmpty ? fallbackEmpty : (bundle.emptyMessage ?? fallbackEmpty)
  )
}

private struct NoteWidgetEntry: TimelineEntry {
  let date: Date
  let model: NoteWidgetModel
}

@available(iOS 17.0, *)
private struct NoteWidgetProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> NoteWidgetEntry {
    NoteWidgetEntry(
      date: Date(),
      model: NoteWidgetModel(
        page: NoteWidgetPageModel(
          id: "sample-note",
          title: "오늘 메모",
          preview: "핵심 할 일 3개를 먼저 끝내기",
          createdDateKey: "2026-10-04"
        ),
        faceHex: "#FFE566",
        inkHex: "#111111",
        mutedHex: nil,
        underlineText: false,
        emptyMessage: String(localized: "widget.note.emptyMessage")
      )
    )
  }

  func snapshot(for configuration: SelectNotePageIntent, in context: Context) async -> NoteWidgetEntry {
    NoteWidgetEntry(
      date: Date(),
      model: resolveNoteModel(pageId: configuration.page?.id)
    )
  }

  func timeline(for configuration: SelectNotePageIntent, in context: Context) async -> Timeline<NoteWidgetEntry> {
    let entry = NoteWidgetEntry(
      date: Date(),
      model: resolveNoteModel(pageId: configuration.page?.id)
    )
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    return Timeline(entries: [entry], policy: .after(next))
  }
}

/// Small 위젯용 — `2026년 10월 4일 · 3` → `10/4 · 3` (한 줄 유지)
private func compactNoteWidgetTitle(_ title: String, isSmall: Bool) -> String {
  guard isSmall else { return title }
  let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
  guard let regex = try? NSRegularExpression(
    pattern: #"^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(.*)$"#,
    options: []
  ) else {
    return trimmed
  }
  let range = NSRange(trimmed.startIndex..<trimmed.endIndex, in: trimmed)
  guard let match = regex.firstMatch(in: trimmed, options: [], range: range),
        match.numberOfRanges >= 5,
        let monthR = Range(match.range(at: 2), in: trimmed),
        let dayR = Range(match.range(at: 3), in: trimmed),
        let suffixR = Range(match.range(at: 4), in: trimmed)
  else {
    return trimmed
  }
  let month = trimmed[monthR]
  let day = trimmed[dayR]
  let suffix = trimmed[suffixR].trimmingCharacters(in: .whitespaces)
  return suffix.isEmpty ? "\(month)/\(day)" : "\(month)/\(day)\(suffix.hasPrefix("·") ? " " : "")\(suffix)"
}

private struct NoteWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: NoteWidgetEntry

  var body: some View {
    let model = entry.model
    let isSmall = family == .systemSmall
    let _ = DayPlanWidgetPalette.apply(faceHex: model.faceHex, inkHex: model.inkHex, mutedHex: model.mutedHex)
    return DayPlanPostItChrome {
      if let page = model.page {
        VStack(alignment: .leading, spacing: isSmall ? 5 : 8) {
          HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(compactNoteWidgetTitle(page.title, isSmall: isSmall))
              .font(.system(size: isSmall ? 14 : 17, weight: .heavy))
              .foregroundStyle(DayPlanWidgetPalette.ink)
              .lineLimit(1)
              .minimumScaleFactor(isSmall ? 0.85 : 1)
              .layoutPriority(1)
            // Small에서는 제목에 날짜가 이미 들어가므로 ISO 날짜는 생략
            if !isSmall, !page.createdDateKey.isEmpty {
              Spacer(minLength: 4)
              Text(page.createdDateKey)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(DayPlanWidgetPalette.muted)
                .lineLimit(1)
            }
          }

          if !page.preview.isEmpty {
            Text(page.preview)
              .font(.system(size: isSmall ? 12 : 13, weight: .semibold))
              .foregroundStyle(DayPlanWidgetPalette.muted)
              .lineLimit(isSmall ? 4 : 5)
          } else {
            Text("메모를 입력해 주세요")
              .font(.system(size: 12, weight: .semibold))
              .foregroundStyle(DayPlanWidgetPalette.muted)
          }
          Spacer(minLength: 0)
        }
      } else {
        Text(model.emptyMessage)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(DayPlanWidgetPalette.ink)
          .lineLimit(3)
      }
    }
  }
}

@available(iOS 17.0, *)
struct NoteWidget: Widget {
  static let kind = "PokitNoteWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: Self.kind,
      intent: SelectNotePageIntent.self,
      provider: NoteWidgetProvider()
    ) { entry in
      let face = DayPlanWidgetPalette.faceColor(hex: entry.model.faceHex)
      // 설정 Intent가 아니라 전용 Open Intent로 앱을 연다 (홈 흐림 고정 방지).
      Button(intent: OpenPokitDayNoteIntent()) {
        NoteWidgetEntryView(entry: entry)
          .pokitWidgetInkEnvironment(
            faceHex: entry.model.faceHex,
            inkHex: entry.model.inkHex,
            mutedHex: entry.model.mutedHex
          )
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
      .buttonStyle(.plain)
      .containerBackground(for: .widget) { face }
      .contentMargins(.all, 0)
    }
    .configurationDisplayName("widget.note.name")
    .description("widget.note.galleryDescription")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
