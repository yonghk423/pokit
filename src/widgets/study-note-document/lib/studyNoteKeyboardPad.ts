/**
 * 오늘 탭 노트 키패드 여백 — 변경 금지에 가깝다.
 * 페이지 KeyboardAvoidingView와 같이 쓰면 본문이 이중으로 밀리거나 가려진다.
 * 탭바는 키보드에 가려지므로 keyboard 높이에서 tabBar를 뺀다.
 *
 * @see .cursor/rules/study-note-keyboard.mdc
 */
export const STUDY_NOTE_KEYBOARD_REST_PAD = 12;

export function studyNoteKeyboardBottomPad(keyboardInset: number, tabBarHeight: number): number {
  if (keyboardInset <= 0) return STUDY_NOTE_KEYBOARD_REST_PAD;
  return Math.max(STUDY_NOTE_KEYBOARD_REST_PAD, keyboardInset - tabBarHeight + 8);
}
