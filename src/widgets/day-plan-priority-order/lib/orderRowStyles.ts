import { StyleSheet } from 'react-native';

import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';

export const orderRowStyles = StyleSheet.create({
  /** 바깥 띠(보더·세로 패딩만) — 드래그 시 잘리지 않게 flex 행은 `orderRowDragShell` */
  orderRowRoman: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: RETRO_BORDER_WIDTH,
  },
  /** 아이콘·제목과 액션 버튼을 한 줄로 — 리오더 시 전체가 함께 움직임 */
  orderRowDragShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    gap: 10,
    minWidth: 0,
  },
  orderIconBoxShell: {
    position: 'relative',
    flexShrink: 0,
  },
  orderIconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  orderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  orderRowRomanText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  orderRowRomanTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  orderRowRomanSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 14,
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
  orderBrutalBtnShell: {
    position: 'relative',
  },
  orderBrutalBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  orderRowPriorityBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  orderRowPriorityBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 13,
  },
  orderSettingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  orderFinishBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  orderFinishBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
