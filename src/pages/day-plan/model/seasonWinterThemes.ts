import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
export const SEASON_WINTER_THEMES = [
  {
    "themeId": "season-winter-01-snow-walk",
    "design": "season-winter-01",
    get title() { return translateUiText("눈길 산책"); },
    "concept": "설원 위에 담은 겨울의 시간"
  },
  {
    "themeId": "season-winter-02-sled-afternoon",
    "design": "season-winter-02",
    get title() { return translateUiText("썰매를 끄는 오후"); },
    "concept": "설원 위에 담은 겨울의 시간"
  },
  {
    "themeId": "season-winter-03-ice-skaters",
    "design": "season-winter-03",
    get title() { return translateUiText("얼음 위의 두 사람"); },
    "concept": "설원 위에 담은 겨울의 시간"
  },
  {
    "themeId": "season-winter-04-little-snowman",
    "design": "season-winter-04",
    get title() { return translateUiText("작은 눈사람"); },
    "concept": "설원 위에 담은 겨울의 시간"
  },
  {
    "themeId": "season-winter-05-snow-confetti",
    "design": "season-winter-05",
    get title() { return translateUiText("눈꽃을 날리는 순간"); },
    "concept": "설원 위에 담은 겨울의 시간"
  }
] as const;
