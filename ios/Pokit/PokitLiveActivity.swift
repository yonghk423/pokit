import ActivityKit
import Foundation
import UIKit

private struct LiveActivityPayload: Decodable {
  struct ChecklistRowPayload: Decodable {
    let blockId: String
    let title: String
    let timeLabel: String
    let state: String
  }

  struct ReadingDataConfigPayload: Decodable {
    let startPage: Int
    let targetPage: Int
    let selectedMetrics: [String]
  }

  let blockId: String
  let title: String
  let category: String
  let categoryKey: String?
  let timeRangeLabel: String
  let totalSeconds: Int
  let pausedRemainingSeconds: Int?
  let endsAtIso: String?
  let startsAtIso: String?
  let status: String
  let readingDataConfig: ReadingDataConfigPayload?
  let checklistTitle: String
  let checklistCountLabel: String
  let checklistRows: [ChecklistRowPayload]
  let checklistSummaryLine1: String
  let checklistSummaryLine2: String
  let planMode: String?
  struct PriorityLivePayload: Decodable {
    struct Upcoming: Decodable {
      let order: Int
      let title: String
      let timeLabel: String
    }
    let windowLabel: String
    let activeTitle: String
    let activeOrder: Int
    let totalTasks: Int
    let progress01: Double
    let upcoming: [Upcoming]
    let listRows: [Upcoming]?
  }
  let priorityLive: PriorityLivePayload?
  struct QuickMemoLivePayload: Decodable {
    let bodyText: String
    let statusLabel: String
  }
  let quickMemoLive: QuickMemoLivePayload?
}

/// `upsert`가 동시에 여러 번 들어오면 둘 다 "기존 Activity 없음"으로 판단해 `request`가 두 번 나가
/// 잠금화면에 동일 카드가 두 줄로 쌓일 수 있음 → actor로 직렬화한다.
@available(iOS 16.1, *)
private actor LockFlowLiveActivityCoordinator {
  static let shared = LockFlowLiveActivityCoordinator()

  private let decoder: JSONDecoder = {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return decoder
  }()

  /// JS `toISOString()`는 fractional seconds(밀리초)를 포함하므로
  /// 기본 ISO8601 formatter만 쓰면 파싱이 실패할 수 있다.
  private let iso8601WithFractional: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private let iso8601Basic: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
  }()

  func upsert(payloadJson: String) async {
    do {
      let payload = try decodePayload(from: payloadJson)
      let state = LockFlowLiveActivityAttributes.ContentState(
        title: payload.title,
        category: payload.category,
        categoryKey: payload.categoryKey,
        timeRangeLabel: payload.timeRangeLabel,
        totalSeconds: payload.totalSeconds,
        pausedRemainingSeconds: payload.pausedRemainingSeconds,
        endsAt: isoDate(from: payload.endsAtIso),
        startsAt: isoDate(from: payload.startsAtIso),
        status: payload.status,
        readingDataConfig: payload.readingDataConfig.map {
          .init(
            startPage: $0.startPage,
            targetPage: $0.targetPage,
            selectedMetrics: $0.selectedMetrics
          )
        },
        checklistTitle: payload.checklistTitle,
        checklistCountLabel: payload.checklistCountLabel,
        checklistRows: payload.checklistRows.map {
          .init(
            blockId: $0.blockId,
            title: $0.title,
            timeLabel: $0.timeLabel,
            state: $0.state
          )
        },
        checklistSummaryLine1: payload.checklistSummaryLine1,
        checklistSummaryLine2: payload.checklistSummaryLine2,
        planMode: payload.planMode,
        priorityLive: payload.priorityLive.map { pl in
          LockFlowLiveActivityAttributes.ContentState.PriorityLiveContent(
            windowLabel: pl.windowLabel,
            activeTitle: pl.activeTitle,
            activeOrder: pl.activeOrder,
            totalTasks: pl.totalTasks,
            progress01: pl.progress01,
            upcoming: pl.upcoming.map {
              .init(order: $0.order, title: $0.title, timeLabel: $0.timeLabel)
            },
            listRows: pl.listRows?.map {
              .init(order: $0.order, title: $0.title, timeLabel: $0.timeLabel)
            }
          )
        },
        quickMemoLive: payload.quickMemoLive.map {
          LockFlowLiveActivityAttributes.ContentState.QuickMemoLiveContent(
            bodyText: $0.bodyText,
            statusLabel: $0.statusLabel
          )
        }
      )

      let fmt = ISO8601DateFormatter()
      fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      let startsLog = state.startsAt.map { fmt.string(from: $0) } ?? "nil"
      let endsLog = state.endsAt.map { fmt.string(from: $0) } ?? "nil"

      if let activity = Activity<LockFlowLiveActivityAttributes>.activities.first(
        where: { $0.attributes.blockId == payload.blockId }
      ) {
        await activity.update(using: state)
        NSLog(
          "[LockFlowLA] upsert update blockId=%@ status=%@ startsAt=%@ endsAt=%@",
          payload.blockId,
          state.status,
          startsLog,
          endsLog
        )
      } else {
        let attributes = LockFlowLiveActivityAttributes(blockId: payload.blockId)
        _ = try Activity.request(
          attributes: attributes,
          contentState: state,
          pushType: nil
        )
        NSLog(
          "[LockFlowLA] upsert request blockId=%@ status=%@ startsAt=%@ endsAt=%@",
          payload.blockId,
          state.status,
          startsLog,
          endsLog
        )
      }
    } catch {
      NSLog("[LiveActivity] upsert failed: %@", error.localizedDescription)
    }
  }

  func endAllActivities() async {
    for activity in Activity<LockFlowLiveActivityAttributes>.activities {
      await activity.end(dismissalPolicy: .immediate)
    }
  }

  func endActivity(blockId: String) async {
    guard !blockId.isEmpty else { return }
    for activity in Activity<LockFlowLiveActivityAttributes>.activities where activity.attributes.blockId == blockId {
      await activity.end(dismissalPolicy: .immediate)
    }
  }

  private func decodePayload(from payloadJson: String) throws -> LiveActivityPayload {
    let data = Data(payloadJson.utf8)
    return try decoder.decode(LiveActivityPayload.self, from: data)
  }

  private func isoDate(from isoString: String?) -> Date? {
    guard let isoString, !isoString.isEmpty else { return nil }
    if let date = iso8601WithFractional.date(from: isoString) {
      return date
    }
    return iso8601Basic.date(from: isoString)
  }
}

@objc(LockFlowLiveActivity)
final class LockFlowLiveActivity: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(upsertActivity:)
  func upsertActivity(_ payloadJson: String) {
    guard #available(iOS 16.1, *) else { return }

    Task {
      await LockFlowLiveActivityCoordinator.shared.upsert(payloadJson: payloadJson)
    }
  }

  @objc(endActivity)
  func endActivity() {
    guard #available(iOS 16.1, *) else { return }

    Task {
      await LockFlowLiveActivityCoordinator.shared.endAllActivities()
    }
  }

  @objc(endActivityByBlockId:)
  func endActivityByBlockId(_ blockId: String) {
    guard #available(iOS 16.1, *) else { return }
    Task {
      await LockFlowLiveActivityCoordinator.shared.endActivity(blockId: blockId)
    }
  }

  /// Live Activity를 upsert한 뒤 앱을 백그라운드로 보낸다.
  /// JS 비동기 체인 도중 앱이 꺼져 upsert가 누락되는 것을 방지하기 위해
  /// 네이티브 단에서 upsert 완료 → suspend를 원자적으로 실행한다.
  @objc(upsertAndSuspend:)
  func upsertAndSuspend(_ payloadJson: String) {
    guard #available(iOS 16.1, *) else { return }

    Task {
      await LockFlowLiveActivityCoordinator.shared.upsert(payloadJson: payloadJson)
      await MainActor.run {
        UIApplication.shared.perform(NSSelectorFromString("suspend"))
      }
    }
  }
}
