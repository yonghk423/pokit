import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct LockFlowLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public struct ReadingDataConfig: Codable, Hashable {
      public let startPage: Int
      public let targetPage: Int
      public let selectedMetrics: [String]

      public init(
        startPage: Int,
        targetPage: Int,
        selectedMetrics: [String]
      ) {
        self.startPage = startPage
        self.targetPage = targetPage
        self.selectedMetrics = selectedMetrics
      }
    }

    public let title: String
    public let category: String
    public let categoryKey: String?
    public let timeRangeLabel: String
    public let totalSeconds: Int
    public let pausedRemainingSeconds: Int?
    public let endsAt: Date?
    public let status: String
    public let readingDataConfig: ReadingDataConfig?

    public init(
      title: String,
      category: String,
      categoryKey: String?,
      timeRangeLabel: String,
      totalSeconds: Int,
      pausedRemainingSeconds: Int?,
      endsAt: Date?,
      status: String,
      readingDataConfig: ReadingDataConfig?
    ) {
      self.title = title
      self.category = category
      self.categoryKey = categoryKey
      self.timeRangeLabel = timeRangeLabel
      self.totalSeconds = totalSeconds
      self.pausedRemainingSeconds = pausedRemainingSeconds
      self.endsAt = endsAt
      self.status = status
      self.readingDataConfig = readingDataConfig
    }
  }

  public let blockId: String

  public init(blockId: String) {
    self.blockId = blockId
  }
}
