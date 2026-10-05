import Foundation

/// 홈 위젯 갤러리·Edit Widget 문구 — 앱과 동일하게 ko / ja / 그 외 en.
public enum PokitWidgetL10n {
  public enum Lang {
    case ko
    case en
    case ja
  }

  public static var lang: Lang {
    let preferred = Locale.preferredLanguages.first ?? Locale.current.identifier
    let code = preferred
      .split(separator: "-")
      .first
      .map { String($0).lowercased() }
      ?? Locale.current.languageCode?.lowercased()
      ?? "en"
    switch code {
    case "ko": return .ko
    case "ja": return .ja
    default: return .en
    }
  }

  public static func text(ko: String, en: String, ja: String) -> String {
    switch lang {
    case .ko: return ko
    case .ja: return ja
    case .en: return en
    }
  }

  // MARK: - Routine widget

  public static var routineName: String {
    text(ko: "루틴", en: "Routine", ja: "ルーチン")
  }

  public static var routineGalleryDescription: String {
    text(
      ko: "위젯마다 루틴을 골라 포스트잇처럼 보여 줘요.",
      en: "Pick a routine for each widget and show it like a post-it.",
      ja: "ウィジェットごとにルーチンを選び、ふせんのように表示します。"
    )
  }

  public static var routineIntentDescription: String {
    text(
      ko: "홈 화면에 보여줄 루틴을 고르세요. 위젯마다 다르게 고를 수 있어요.",
      en: "Choose which routine to show on the Home Screen. Each widget can be different.",
      ja: "ホーム画面に表示するルーチンを選びます。ウィジェットごとに別のルーチンを選べます。"
    )
  }

  public static var expandRoutine: String {
    text(ko: "루틴 펼쳐보기", en: "Expand routine", ja: "ルーチンを開く")
  }

  public static var reselectRoutine: String {
    text(ko: "루틴을 다시 골라 주세요", en: "Choose a routine again", ja: "ルーチンを選び直してください")
  }

  public static var openAppThenReselect: String {
    text(
      ko: "앱을 한 번 연 뒤 다시 선택해 주세요",
      en: "Open the app once, then choose again",
      ja: "アプリを一度開いてから、もう一度選んでください"
    )
  }

  // MARK: - Bookstore widget

  public static var bookstoreName: String {
    text(ko: "책방", en: "Bookstore", ja: "書房")
  }

  public static var bookstoreGalleryDescription: String {
    text(
      ko: "위젯 편집에서 「눌러서 책 고르기」를 눌러 책방의 책을 고르세요.",
      en: "In Edit Widget, tap “Tap to pick a book” to choose a title from the bookstore.",
      ja: "ウィジェット編集で「タップして本を選ぶ」を押し、書房の本を選びます。"
    )
  }

  public static var bookstoreIntentDescription: String {
    text(
      ko: "위젯 편집에서 「눌러서 책 고르기」를 누르면 책방 목록이 열려요.",
      en: "In Edit Widget, tap “Tap to pick a book” to open the bookstore list.",
      ja: "ウィジェット編集で「タップして本を選ぶ」を押すと書房の一覧が開きます。"
    )
  }

  public static var tapToPickBook: String {
    text(ko: "눌러서 책 고르기", en: "Tap to pick a book", ja: "タップして本を選ぶ")
  }

  // MARK: - Note widget

  public static var noteName: String {
    text(ko: "노트", en: "Note", ja: "ノート")
  }

  public static var noteGalleryDescription: String {
    text(
      ko: "노트 페이지를 위젯마다 골라 홈 화면에 고정해요.",
      en: "Pick a note page for each widget and pin it to the Home Screen.",
      ja: "ノートのページをウィジェットごとに選び、ホーム画面に固定します。"
    )
  }

  public static var noteIntentDescription: String {
    text(
      ko: "홈 화면에 고정할 노트 페이지를 고르세요.",
      en: "Choose which note page to pin on the Home Screen.",
      ja: "ホーム画面に固定するノートのページを選びます。"
    )
  }

  public static var openNote: String {
    text(ko: "노트 펼치기", en: "Open note", ja: "ノートを開く")
  }

  public static var openNoteIntent: String {
    text(ko: "노트 열기", en: "Open note", ja: "ノートを開く")
  }

  public static var openNoteIntentDescription: String {
    text(
      ko: "POKIT 노트 화면을 엽니다.",
      en: "Opens the POKIT note screen.",
      ja: "POKITのノート画面を開きます。"
    )
  }

  public static var reselectNote: String {
    text(ko: "노트를 다시 골라 주세요", en: "Choose a note again", ja: "ノートを選び直してください")
  }

  public static var noteFallbackTitle: String {
    text(ko: "노트", en: "Note", ja: "ノート")
  }

  public static func noteDateTitle(year: Int, month: Int, day: Int) -> String {
    switch lang {
    case .ko:
      return "\(year)년 \(month)월 \(day)일"
    case .ja:
      return "\(year)年\(month)月\(day)日"
    case .en:
      // Keep month-day-year readable without needing a DateFormatter cache
      let formatter = DateFormatter()
      formatter.locale = Locale(identifier: "en_US")
      formatter.dateFormat = "MMMM d, yyyy"
      var comps = DateComponents()
      comps.year = year
      comps.month = month
      comps.day = day
      if let date = Calendar(identifier: .gregorian).date(from: comps) {
        return formatter.string(from: date)
      }
      return "\(month)/\(day)/\(year)"
    }
  }

  public static func noteIndexedTitle(_ index: Int) -> String {
    text(ko: "노트 \(index)", en: "Note \(index)", ja: "ノート \(index)")
  }
}
