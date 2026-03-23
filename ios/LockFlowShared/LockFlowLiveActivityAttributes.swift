import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct LockFlowLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public let title: String
    public let category: String
    public let timeRangeLabel: String
    public let totalSeconds: Int
    public let pausedRemainingSeconds: Int?
    public let endsAt: Date?
    public let status: String

    public init(
      title: String,
      category: String,
      timeRangeLabel: String,
      totalSeconds: Int,
      pausedRemainingSeconds: Int?,
      endsAt: Date?,
      status: String
    ) {
      self.title = title
      self.category = category
      self.timeRangeLabel = timeRangeLabel
      self.totalSeconds = totalSeconds
      self.pausedRemainingSeconds = pausedRemainingSeconds
      self.endsAt = endsAt
      self.status = status
    }
  }

  public let blockId: String

  public init(blockId: String) {
    self.blockId = blockId
  }
}
