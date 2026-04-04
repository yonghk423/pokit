import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct LockFlowLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public struct ChecklistRow: Codable, Hashable {
      public let blockId: String
      public let title: String
      public let timeLabel: String
      public let state: String

      public init(
        blockId: String,
        title: String,
        timeLabel: String,
        state: String
      ) {
        self.blockId = blockId
        self.title = title
        self.timeLabel = timeLabel
        self.state = state
      }
    }

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

    /// 빠른 메모로 저장된 블록 전용 잠금화면 카드
    public struct QuickMemoLiveContent: Codable, Hashable {
      public let bodyText: String
      public let statusLabel: String

      public init(bodyText: String, statusLabel: String) {
        self.bodyText = bodyText
        self.statusLabel = statusLabel
      }
    }

    /// 우선순위 모드 합본 블록 전용 잠금화면 레이아웃 데이터
    public struct PriorityLiveContent: Codable, Hashable {
      public struct UpcomingRow: Codable, Hashable {
        public let order: Int
        public let title: String
        public let timeLabel: String

        public init(order: Int, title: String, timeLabel: String) {
          self.order = order
          self.title = title
          self.timeLabel = timeLabel
        }
      }

      public let windowLabel: String
      public let activeTitle: String
      public let activeOrder: Int
      public let totalTasks: Int
      public let progress01: Double
      public let upcoming: [UpcomingRow]

      public init(
        windowLabel: String,
        activeTitle: String,
        activeOrder: Int,
        totalTasks: Int,
        progress01: Double,
        upcoming: [UpcomingRow]
      ) {
        self.windowLabel = windowLabel
        self.activeTitle = activeTitle
        self.activeOrder = activeOrder
        self.totalTasks = totalTasks
        self.progress01 = progress01
        self.upcoming = upcoming
      }
    }

    public let title: String
    public let category: String
    public let categoryKey: String?
    public let timeRangeLabel: String
    public let totalSeconds: Int
    public let pausedRemainingSeconds: Int?
    public let endsAt: Date?
    public let startsAt: Date?
    public let status: String
    public let readingDataConfig: ReadingDataConfig?
    public let checklistTitle: String
    public let checklistCountLabel: String
    public let checklistRows: [ChecklistRow]
    public let checklistSummaryLine1: String
    public let checklistSummaryLine2: String
    /** `time` | `priority` | `quickMemo` — nil 이면 시간 기반과 동일하게 취급 */
    public let planMode: String?
    public let priorityLive: PriorityLiveContent?
    public let quickMemoLive: QuickMemoLiveContent?

    public init(
      title: String,
      category: String,
      categoryKey: String?,
      timeRangeLabel: String,
      totalSeconds: Int,
      pausedRemainingSeconds: Int?,
      endsAt: Date?,
      startsAt: Date?,
      status: String,
      readingDataConfig: ReadingDataConfig?,
      checklistTitle: String,
      checklistCountLabel: String,
      checklistRows: [ChecklistRow],
      checklistSummaryLine1: String,
      checklistSummaryLine2: String,
      planMode: String? = nil,
      priorityLive: PriorityLiveContent? = nil,
      quickMemoLive: QuickMemoLiveContent? = nil
    ) {
      self.title = title
      self.category = category
      self.categoryKey = categoryKey
      self.timeRangeLabel = timeRangeLabel
      self.totalSeconds = totalSeconds
      self.pausedRemainingSeconds = pausedRemainingSeconds
      self.endsAt = endsAt
      self.startsAt = startsAt
      self.status = status
      self.readingDataConfig = readingDataConfig
      self.checklistTitle = checklistTitle
      self.checklistCountLabel = checklistCountLabel
      self.checklistRows = checklistRows
      self.checklistSummaryLine1 = checklistSummaryLine1
      self.checklistSummaryLine2 = checklistSummaryLine2
      self.planMode = planMode
      self.priorityLive = priorityLive
      self.quickMemoLive = quickMemoLive
    }
  }

  public let blockId: String

  public init(blockId: String) {
    self.blockId = blockId
  }
}
