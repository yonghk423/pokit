# 캘린더 테마 배치 기준

갱신일: 2026-11-11

## 화면 안전 영역

- 배경은 화면 끝까지 이어져도 되지만 날짜, 요일, 사진, 버튼은 노치와 하단 탭을 침범하지 않는다.
- 메인 화면은 실제 측정된 하단 탭 높이와 12pt 간격을 예약한다. 측정 전에도 탭 행 56pt + 하단 안전 영역 + 상단 패딩 8pt를 예약해 첫 프레임의 이동을 막는다.
- 달력 전체 구성(배경의 표 포함)을 예약 영역 위의 높이에 맞춘다. 숫자만 위로 옮기거나 배경과 다른 비율로 배치하지 않는다.
- 탭 아래의 장식 배경에는 날짜나 터치 영역을 넣지 않는다.
- 캘린더 템플릿 목록은 일반 안전 영역을 사용한다. 메인 전체 화면 헤더 배치를 재사용하지 않는다.

## 테마 제작과 좌표

- 원본 이미지 크기, 요일 행의 사각형, 날짜 칸별 위치를 기록한다.
- 배경에 이미 그린 표 선과 종이 위에 또 다른 표나 종이를 덧그리지 않는다.
- 캔버스는 900×1752 px로 통일한다. 달력의 물리적 실루엣·재료·부착 방식·장식은 장면마다 독창적으로 디자인한다. 동일한 판 모양이나 상단 손잡이를 복제하지 않는다. 달력판 바깥 좌우 끝은 캔버스 끝까지 닿아 좌우 여백을 두지 않는다. 기준 캘린더의 전체 위치와 크기를 고정하며 테마별로 위아래 이동하거나 확대/축소하지 않는다. 장면을 달력 주변으로 재구성한다. 앱 overlay 영역 좌표와 달력 바깥 밑변도 모든 이미지에서 동일하게 고정한다.
- 새 배경에는 정확히 7열 × 6행(42칸)의 빈 격자선을 포함한다. 격자 경계는 세로 8개, 가로 7개다. 월/연도 머리글과 요일 띠는 서로 분리하고 7열에 맞춘다.
- 기준 캘린더(24-home-cooking)의 900×1752 정규화 좌표를 공통 사용한다. 월/연도 [0.100000, 0.426561, 0.800000, 0.032811], 요일 [0.053566, 0.473439, 0.892855, 0.023439], 7×6 격자 [0.053566, 0.504689, 0.892855, 0.304689], 달력판 바깥 아래 끝 y=0.84335다. 이 격자와 판의 위치를 위로 옮겨 하단 장면 공간을 만들지 않는다. 장면을 고정된 달력판 주변에 배치한다. 인물, 손가락, 소품, 끈, 프레임, 접힘, 그림자 등 어떤 요소도 overlay 영역을 가리거나 침범하지 않는다.
- 프롬프트에 적은 좌표를 그대로 믿지 않는다. 실제 렌더된 파일을 재어 공통 좌표와 달력판 바깥 아래 끝을 확인한다. 지원 화면 크기에서 런타임의 비율 유지·탭 예약 계산을 적용해 날짜 격자와 물리적 밑변에서 탭까지의 간격 모두를 검사한다.
- 모든 이미지 manifest에는 공통 월/요일/격자 좌표와 물리적 달력 밑변을 기록한다. 앱은 해당 좌표에 텍스트·사진·터치 영역을 맞추며 배경 격자선을 다시 그리지 않는다. 생성 프롬프트는 calendar-large-board-generation.json을 따른다.
- 원근이 있는 디자인은 행마다 다른 좌표를 사용한다. 6주를 균등 분할해 원본 칸에 억지로 맞추지 않는다.
- 신규 테마는 반드시 7열 × 6주를 수용해야 한다. 기존 5줄 계단 디자인은 여섯째 주만 별도 종이로 보완한다.
- 날짜/요일의 글꼴 확대가 이미지 칸을 넘지 않도록 한다. 자유 메모와 일반 UI는 사용자 글꼴 설정을 따른다.

## 검증

- 자동 화면 기하 검사는 모든 테마를 다음 7개 세로 화면 크기(pt)에서 검사한다: 320×568, 375×667, 375×812, 390×844, 393×852, 430×932, 440×956.
- 2026-11-10 기준 50개 테마 × 7개 화면 크기, 총 350건의 검사가 모두 통과했다. 결과 원본은 `output/calendar-v8-fullscreen/viewport-audit.json`이며, 검사 스크립트는 `scripts/audit-calendar-viewport.cjs`다.
- 이 자동 검사는 배경 전체 채움/비율 유지, 월·요일·격자의 안전 영역 겹침, 사진과 날짜 간 겹침, 6행 구성을 확인한다. 기준 좌표를 적용한 달력판 바깥 밑변과 하단 탭 윗면 사이 간격도 비교한다. 태블릿 및 가로 화면과 실제 기기의 렌더링은 별도 시각 검증 대상으로 둔다.
- 새로 추가하는 100장 배치는 이미지별 좌표 manifest를 만든 뒤 100개 테마 × 7개 화면 크기, 총 700건의 기하 검사를 통과시킨다. 이는 향후 검증 기준이며, 검사가 끝나기 전 통과로 기록하지 않는다.
- 2026년 11월처럼 6주가 필요한 달, 2028년 2월 윤년, 28/30/31일 달을 검사한다.
- 마지막 주 날짜와 일기 사진, 일정 점, 터치 영역이 탭 상단보다 위에 있어야 한다.
- 42개 날짜 칸 모두에서 두 자리 날짜 숫자, 사진, 일정 표시가 서로 겹치지 않아야 한다. 요일 중심은 각 열과 일치하고 표 선이 글자나 사진을 통과하지 않아야 한다.
- 320×568pt 화면에서 실제 `calendarCellContents` 배치를 얹어 날짜 숫자와 사진/일정 표시가 42개 모든 칸 안에 들어가는지 확인한다. 6주가 필요한 달에서도 일곱째 주를 추가하지 말고 기존 6행에 정확히 배치한다.
- 코드 좌표 검사는 실제 렌더링 확인을 대체하지 않는다. 배포 전 대표 화면 크기의 시뮬레이터/기기 스크린샷을 확인한다.


## Published original artwork — 20261109-grid-v3

Five city backgrounds were edited as actual images, encoded as WebP, and published to `character-illustrations/calendar-themes/20261109-grid-v3/`. The walking background and paper/leaf sprites are unchanged compatibility assets. All 18 uploaded files were downloaded again and matched the SHA-256 manifest in `calendar-grid-v3-manifest.json`.

The authenticated `calendar-theme` function serves this revision when requested. Older clients continue receiving their original revision to avoid combining old hit areas with new artwork. Updated clients migrate previously installed v2 themes to the new files and remove each obsolete local theme only after successful download. Dates remain dynamic app text; the artwork contains blank cells, never a fixed month.

Stair artwork now contains six actual rows. Office pointer no longer overlaps cells. Frame coordinates were measured against the edited images, not merely assumed from generation prompts. Device visual verification is still required; geometry and cache migration tests do not replace simulator checks.


## 2026-11-11 신규 시안 상태

원본 1–10번 시안은 생성 프롬프트에 기준 좌표, 빈 7×6 격자, 정면 구도, 좌우 끝까지 채우기, 장면별로 다른 달력 형태를 지시했다. 출력 파일은 959×1640 px(10번은 959×1641 px)이고, 목표 900×1752 px와 다르다. 일부 달력판에는 좌우 여백도 남았다. 실제 이미지별 overlay 좌표, 셀 수, 달력판 밑변과 탭 간격은 아직 검증하지 않았다. 따라서 이 시안들은 규격 통과한 산출물이 아니며 런타임 등록 또는 업로드 대상으로 사용하지 않는다. 상세 기록은 calendar-large-board-production.md의 실행 기록과 생성 JSON의 prototypeAudit을 따른다.
