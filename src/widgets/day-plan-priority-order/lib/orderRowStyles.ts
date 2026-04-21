import { StyleSheet } from 'react-native';

export const orderRowStyles = StyleSheet.create({
  orderRowRoman: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  inlineRankPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineRankPillText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  medicineIconBadge: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRowRomanText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  orderRowRomanTitle: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  orderSettingsBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 집중 중 완료 탭 — 작은 Material radio, 그레이 톤 */
  orderCompleteMaterialHit: {
    alignSelf: 'center',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
