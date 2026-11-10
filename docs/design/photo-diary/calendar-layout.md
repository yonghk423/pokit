# 캘린더 테마 배치 기준

갱신일: 2026-11-09

## 화면 안전 영역

- 배경은 화면 끝까지 이어져도 되지만 날짜, 요일, 사진, 버튼은 노치와 하단 탭을 침범하지 않는다.
- 메인 화면은 실제 측정된 하단 탭 높이와 12pt 간격을 예약한다. 측정 전에도 탭 행 56pt + 하단 안전 영역 + 상단 패딩 8pt를 예약해 첫 프레임의 이동을 막는다.
- 달력 전체 구성(배경의 표 포함)을 예약 영역 위의 높이에 맞춘다. 숫자만 위로 옮기거나 배경과 다른 비율로 배치하지 않는다.
- 탭 아래의 장식 배경에는 날짜나 터치 영역을 넣지 않는다.
- 캘린더 템플릿 목록은 일반 안전 영역을 사용한다. 메인 전체 화면 헤더 배치를 재사용하지 않는다.

## 테마 제작과 좌표

- 원본 이미지 크기, 요일 행의 사각형, 날짜 칸별 위치를 기록한다.
- 배경에 이미 그린 표 선과 종이 위에 또 다른 표나 종이를 덧그리지 않는다.
- 원근이 있는 디자인은 행마다 다른 좌표를 사용한다. 6주를 균등 분할해 원본 칸에 억지로 맞추지 않는다.
- 신규 테마는 반드시 7열 × 6주를 수용해야 한다. 기존 5줄 계단 디자인은 여섯째 주만 별도 종이로 보완한다.
- 날짜/요일의 글꼴 확대가 이미지 칸을 넘지 않도록 한다. 자유 메모와 일반 UI는 사용자 글꼴 설정을 따른다.

## 검증

- 모든 테마에서 320×568, 375×667, 390×844, 430×932, 768×1024 및 가로 화면을 검사한다.
- 2026년 11월처럼 6주가 필요한 달, 2028년 2월 윤년, 28/30/31일 달을 검사한다.
- 마지막 주 날짜와 일기 사진, 일정 점, 터치 영역이 탭 상단보다 위에 있어야 한다.
- 요일 중심이 각 열과 일치하고 표 선이 글자를 통과하지 않아야 한다.
- 코드 좌표 검사는 실제 렌더링 확인을 대체하지 않는다. 배포 전 대표 화면 크기의 시뮬레이터/기기 스크린샷을 확인한다.


## Published original artwork — 20261109-grid-v3

Five city backgrounds were edited as actual images, encoded as WebP, and published to `character-illustrations/calendar-themes/20261109-grid-v3/`. The walking background and paper/leaf sprites are unchanged compatibility assets. All 18 uploaded files were downloaded again and matched the SHA-256 manifest in `calendar-grid-v3-manifest.json`.

The authenticated `calendar-theme` function serves this revision when requested. Older clients continue receiving their original revision to avoid combining old hit areas with new artwork. Updated clients migrate previously installed v2 themes to the new files and remove each obsolete local theme only after successful download. Dates remain dynamic app text; the artwork contains blank cells, never a fixed month.

Stair artwork now contains six actual rows. Office pointer no longer overlaps cells. Frame coordinates were measured against the edited images, not merely assumed from generation prompts. Device visual verification is still required; geometry and cache migration tests do not replace simulator checks.
