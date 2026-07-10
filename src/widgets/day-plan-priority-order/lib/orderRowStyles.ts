import { StyleSheet } from 'react-native';

import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';

export const orderRowStyles = StyleSheet.create({
  /** 바깥 띠(보더·세로 패딩만) — 드래그 시 잘리지 않게 flex 행은 `orderRowDragShell` */
  orderRowRoman: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: RETRO_BORDER_WIDTH,
  },
  /** 아이콘·제목과 액션 버튼을 한 줄로 — 리오더 시 전체가 함께 움직임 */
  orderRowDragShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  inlineRankPill: {
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineRankPillText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  medicineIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 순위·아이콘·제목 — 길게 눌러 순서 변경 제스처 영역 */
  orderRowReorderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  orderRowRomanText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  orderRowRomanTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  orderRowRomanSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  orderRowRomanTitleDone: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.52,
  },
  orderRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  orderRowPriorityBtn: {
    minWidth: 40,
    height: 28,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  orderRowPriorityBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 14,
  },
  orderSettingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderFinishBtn: {
    minWidth: 36,
    height: 28,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  orderFinishBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
