import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct PokitLiveActivityAttributes: ActivityAttributes {
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
      public struct ChecklistItem: Codable, Hashable {
        public let id: String
        public let text: String
        public let checked: Bool

        public init(id: String, text: String, checked: Bool) {
          self.id = id
          self.text = text
          self.checked = checked
        }
      }

      public let bodyText: String
      public let statusLabel: String
      /// RN 로케일 제목 — 구버전 페이로드에는 없을 수 있음
      public let titleLabel: String?
      /// 카드 면색 `#RRGGBB` — 구버전에는 없을 수 있음
      public let faceHex: String?
      /// 글자색 `#RRGGBB` — 구버전에는 없을 수 있음
      public let inkHex: String?
      /// 어두운 면 — 흰 글자 (inkHex 없을 때 폴백)
      public let usesLightInk: Bool?
      /// 줄별 체크박스 — 구버전에는 없을 수 있음
      public let checklistItems: [ChecklistItem]?
      /// 본문 pt — 기본 28
      public let fontSizePt: Double?
      /// App Group 상대 경로 — 예: `quick-memo/photo.jpg`
      public let photoRelativePath: String?
      public let showCalendar: Bool?
      /// `YYYY-MM-DD`
      public let calendarDateKey: String?

      public init(
        bodyText: String,
        statusLabel: String,
        titleLabel: String? = nil,
        faceHex: String? = nil,
        inkHex: String? = nil,
        usesLightInk: Bool? = nil,
        checklistItems: [ChecklistItem]? = nil,
        fontSizePt: Double? = nil,
        photoRelativePath: String? = nil,
        showCalendar: Bool? = nil,
        calendarDateKey: String? = nil
      ) {
        self.bodyText = bodyText
        self.statusLabel = statusLabel
        self.titleLabel = titleLabel
        self.faceHex = faceHex
        self.inkHex = inkHex
        self.usesLightInk = usesLightInk
        self.checklistItems = checklistItems
        self.fontSizePt = fontSizePt
        self.photoRelativePath = photoRelativePath
        self.showCalendar = showCalendar
        self.calendarDateKey = calendarDateKey
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
      /// RN에서 내려주는 전체 할 일 줄(잠금화면 리스트). 구버전 페이로드에는 없을 수 있음.
      public let listRows: [UpcomingRow]?

      public init(
        windowLabel: String,
        activeTitle: String,
        activeOrder: Int,
        totalTasks: Int,
        progress01: Double,
        upcoming: [UpcomingRow],
        listRows: [UpcomingRow]? = nil
      ) {
        self.windowLabel = windowLabel
        self.activeTitle = activeTitle
        self.activeOrder = activeOrder
        self.totalTasks = totalTasks
        self.progress01 = progress01
        self.upcoming = upcoming
        self.listRows = listRows
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
