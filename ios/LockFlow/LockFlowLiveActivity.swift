import ActivityKit
import Foundation

private struct LiveActivityPayload: Decodable {
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
  let status: String
  let readingDataConfig: ReadingDataConfigPayload?
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
        status: payload.status,
        readingDataConfig: payload.readingDataConfig.map {
          .init(
            startPage: $0.startPage,
            targetPage: $0.targetPage,
            selectedMetrics: $0.selectedMetrics
          )
        }
      )

      if let activity = Activity<LockFlowLiveActivityAttributes>.activities.first(
        where: { $0.attributes.blockId == payload.blockId }
      ) {
        await activity.update(using: state)
      } else {
        for existing in Activity<LockFlowLiveActivityAttributes>.activities {
          await existing.end(dismissalPolicy: .immediate)
        }

        let attributes = LockFlowLiveActivityAttributes(blockId: payload.blockId)
        _ = try Activity.request(
          attributes: attributes,
          contentState: state,
          pushType: nil
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

  private func decodePayload(from payloadJson: String) throws -> LiveActivityPayload {
    let data = Data(payloadJson.utf8)
    return try decoder.decode(LiveActivityPayload.self, from: data)
  }

  private func isoDate(from isoString: String?) -> Date? {
    guard let isoString, !isoString.isEmpty else { return nil }
    return ISO8601DateFormatter().date(from: isoString)
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
}
