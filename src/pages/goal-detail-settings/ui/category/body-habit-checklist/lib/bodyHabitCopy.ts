import { getPriorityCatalogPickerLabel } from '@entities/day-plan';

export type BodyHabitChecklistVariant = 'stretching' | 'straightenBack' | 'neckPosture';

export const BODY_HABIT_CHECKLIST_COPY: Record<
  BodyHabitChecklistVariant,
  { kicker: string; about: string; listTitle: string; placeholder: string }
> = {
  stretching: {
    kicker: '몸 풀기',
    about:
      '목·어깨·허벅지 등 오늘 풀고 싶은 부위나 동작을 적어 두면, 집중 구간에서 하나씩 체크하며 이어가기 좋아요.',
    listTitle: getPriorityCatalogPickerLabel('stretching'),
    placeholder: '동작이나 부위를 입력하고 추가',
  },
  straightenBack: {
    kicker: '허리·골반',
    about:
      '허리 펴기, 엎드려 자세, 가벼운 코어 등 허리에 부담 덜 가게 할 동작을 정리해 두면 실천하기 쉬워요.',
    listTitle: getPriorityCatalogPickerLabel('straightenBack'),
    placeholder: '동작을 입력하고 추가',
  },
  neckPosture: {
    kicker: '목·자세',
    about:
      '턱 당기기, 스크린 높이 맞추기, 휴식 알림 등 목과 거북목에 도움이 되는 습관을 체크리스트로 남겨 보세요.',
    listTitle: getPriorityCatalogPickerLabel('neckPosture'),
    placeholder: '습관이나 동작을 입력하고 추가',
  },
};
