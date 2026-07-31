# 사용 설명서 실기기 캡처 (선택)

가이드는 기본적으로 **실제 UI 라벨·구조를 복제한 도해 + 번호 콜아웃**으로 설명합니다.

나중에 실기기/시뮬레이터 PNG를 넣으려면:

1. 상태 바를 포함한 세로 캡처를 `assets/guide/{screenshot-key}.png` 로 저장
2. `src/pages/guide-book/ui/GuideBookFigures.tsx` 의 `SCREENSHOTS` 맵에
   `require('../../../assets/guide/xxx.png')` 를 등록

screenshot-key 예: `today-overview`, `routine-list`, `settings` (`guideBookPages.ts` 참고)
