# 큰 달력판 테마 제작 기준

갱신일: 2026-11-11

각 배경은 원본 장면에 맞춰 달력의 실루엣, 재료, 설치 방식을 독창적으로 디자인한다. 타일 벽화, 천 주머니, 기계식 행선표처럼 테마마다 물리적 형태가 분명히 달라야 한다. 한 디자인을 복제하거나 상단 손잡이를 반복하지 않는다. 달력판의 바깥 좌우 끝은 캔버스 양 끝(x=0과 x=1)에 닿게 해 좌우 여백 없이 화면 폭을 채운다. 기준 캘린더의 전체 위치와 크기를 고정하고, 장면에 맞추려고 위나 아래로 옮기거나 크기를 바꾸지 않는다. 인물과 장면을 달력 주변으로 재구성한다. 날짜 overlay 좌표와 달력 바깥 밑변도 모든 테마에서 공통으로 고정한다.

## 이미지에 포함할 요소

- 기존 테마의 인물, 장면, 재질, 조명과 장식.
- 장면에 자연스럽게 어울리는 빈 달력. 실루엣, 재료, 부착 방식과 장식은 테마별로 독창적으로 디자인한다.
- 7개의 같은 너비 열과 6개의 같은 높이 행으로 이루어진, 얇고 반듯한 빈 격자선.
- 글자가 없는 월/연도 머리글, 별도의 요일 띠, 날짜 격자. 세 영역의 정규화 좌표와 크기는 기준 캘린더와 똑같이 맞춘다.
- 테마 연출에 어울리는 빈 표면과 장식. 날짜 칸으로 쓰는 메모지나 칸막이 소품은 좌표를 규칙적으로 배치할 수 있다.
- 화면 네 변까지 이어지는 배경. 휴대전화 프레임이나 흰 외곽 여백은 없다.

## 앱에서만 렌더링할 요소

- 연도, 월, 월 이동 화살표.
- 요일, 날짜, 오늘/선택한 날짜의 강조.
- 실제 기록 사진과 사진 장식.
- 연동 일정 표시와 날짜 터치 영역.
- 상태바, 노치, 설정 아이콘, 하단 탭과 모든 조작 버튼.

배경 파일에는 숫자, 글자, 가짜 사진, 사진 자리표시자, 이벤트 원, 앱 UI를 절대로 합성하지 않는다. 배경에는 정확히 7열 × 6행, 총 42칸의 빈 격자선을 그린다. 달력 전체는 앱에서 검증된 24-home-cooking 원본의 위치와 크기를 고정 기준으로 따른다. 장면이 겹치거나 공간이 부족하면 인물, 소품, 배경을 재구성하며 달력을 이동하지 않는다. 기준 좌표는 900×1752 캔버스에서 월/연도 머리글 [0.100000, 0.426561, 0.800000, 0.032811], 요일 띠 [0.053566, 0.473439, 0.892855, 0.023439], 날짜 격자 [0.053566, 0.504689, 0.892855, 0.304689]로 고정한다. 달력판 바깥의 아래 끝은 y=0.84335에 둔다. 모든 이미지 manifest에 같은 좌표를 기록하고, 앱은 이 좌표에 월/요일/날짜 텍스트·기록 사진·인터랙션을 맞춘다. 격자 경계는 세로 8개, 가로 7개이며 앱에서 선을 다시 그리지 않는다.

## 제작 프롬프트 공통 제약

Production illustration background asset, NOT a screenshot or UI mockup. Use an exact 900 x 1752 px canvas for every theme.
Preserve the specific scene, character and illustration style. Invent a calendar silhouette, material, mounting method and decoration that belong to that scene. Make the physical design clearly different across themes. Do not repeat a generic framed board or top handle. A reference image may guide the immutable full calendar bounds, shared overlay coordinates and bottom-edge position, never the calendar form, handle, trim or material. Do not move or resize the calendar to make room for the scene. Recompose the scene around the fixed calendar area.
Draw a blank grid with exactly seven equal-width columns and six equal-height rows: exactly eight vertical boundaries and seven horizontal boundaries forming 42 cells. Use thin, straight, continuous lines. Use exactly the same normalized rectangles on every image: month/year [0.100000, 0.426561, 0.800000, 0.032811], weekdays [0.053566, 0.473439, 0.892855, 0.023439], date grid [0.053566, 0.504689, 0.892855, 0.304689]. Keep all 42 cells front-facing and unobstructed.
The physical calendar must reach both canvas edges horizontally, x=0 to x=1, with no empty side margins. Keep the complete calendar in the same fixed position and at the same size as the approved reference. Its top and bottom must not drift between themes. The usable header and date grid retain their shared inset coordinates. The visible outer calendar must end at normalized y=0.84335 on every image. Never move it upward to create more room below. Preserve this shared bottom edge so the calendar-to-tab spacing matches after the app applies its common aspect-preserving placement. Do not move or resize the shared overlay regions for a theme.
The calendar object shape and styling vary by theme inside the fixed calendar footprint while overlay coordinates, full position, size and bottom edge stay fixed. Recompose the scene around that footprint. Its outer left and right edges touch the canvas edges. Keep the face front-facing and free of perspective. No person, hand, prop, rope, fold, shadow or decoration may enter overlay areas. Measure the rendered output and record the common rectangles and bottom edge in each manifest. Do not include text, letters, numerals, dates, year or month, weekday names, arrows, event markers, photographs, polaroid thumbnails, photo placeholders, status bar, notch, app controls, tabs, phone frame, or watermark. The app overlays content using the recorded geometry and must not draw a second set of grid lines.
Extend the illustration naturally to all four canvas edges. Keep decorations and shadows outside the usable calendar areas.

## 산출물 확인

- 생성 지시만으로 좌표가 정확하다고 간주하지 않는다. 실제 산출물에서 분리된 빈 머리글/요일 영역, 경계선 8×7개, 42칸, 최소 정규화 크기, 가림/겹침 없음, 날짜와 사진을 놓을 충분한 셀 안쪽 공간을 확인하고 이미지별 정규화 좌표를 기록한다.
- 모든 산출물을 정확히 900×1752 px로 정규화하고, 리사이즈나 가장자리 보정이 장면을 자르거나 왜곡하지 않았는지 확인한다.
- 사진이나 글자가 들어간 시안은 런타임 배경으로 사용하거나 업로드하지 않는다.
- 배경 격자선과 앱의 글자/사진/터치 영역은 동일한 좌표 변환을 사용한다. 화면 크기에 따라 배경만 확대하고 좌표를 별도로 배치하지 않는다.
- 날짜 격자 각 칸은 모든 1–31 날짜 숫자와 해당 날짜의 사진/일정 표시를 겹치지 않고 담아야 한다. 최소 지원 화면 크기에서 앱의 실제 `calendarCellContents` 배치를 적용해 확인한다.
- 이미지 원본 비율을 유지한다. 화면을 채우고 탭 높이를 반영하는 fitCalendarArtwork의 실제 배치로 날짜 격자와 달력 바깥 밑변을 모두 7개 화면 크기에서 계산한다. 각 테마의 밑변과 탭 상단 간격은 기준 캘린더와 같아야 하며, 검사에 이 밑변 간격 항목을 포함한다.

## 폐기할 목업

앞선 생성 배치에는 고정 날짜, 예시 사진, 상태바, 하단 탭이 포함된 잘못된 지시가 들어갔다. 해당 결과는 디자인 참고용일 뿐 실제 적용 대상이 아니다. 이번 수정 조건을 충족하는 새 산출물만 채택한다.


## 2026-11-11 원본 1–10 시안 실행 기록

생성 도구에 장면별 달력 형태, 빈 머리글·요일·7×6 격자, 정면 구도, 좌우 끝까지 채우기, 공통 좌표와 아래 여백을 지시했다. 이는 생성 프롬프트에 조건을 넣었다는 기록이며, 산출물이 그 조건을 충족했다는 뜻은 아니다.

1–3번 시안은 output/calendar-rules-first-three-v2/에, 4–10번 시안은 output/calendar-rules-next-seven/에 보관했다. 생성 도구 출력은 1–3번이 모두 959×1640 px, 4–9번이 959×1640 px, 10번이 959×1641 px였다. 목표 캔버스 900×1752 px와 일치하지 않는다. 좌우 끝까지 채우라는 지시도 일부 이미지에서 달력판에 좌우 여백이 남아 충족되지 않았다. 공통 overlay 좌표, 모든 이미지의 실제 7×6 셀 수, 달력판 밑변과 탭 간격은 산출물별로 측정·검증하지 않았다.

원본 11–30 시안도 동일한 위치 고정을 검증하지 않은 초기 생성 시도이며 생산용으로 승인하지 않았다. 따라서 현재 생성한 시안들은 컨셉 시안이다. 런타임 등록이나 업로드 대상으로 간주하지 않는다. 다음 보정에서는 캔버스 비율을 왜곡하지 말고 정확한 캔버스에 맞추며, 필요한 경우 빈 장면을 확장한다. 달력판의 전체 bounding box와 좌우 끝, 머리글·요일·격자의 공통 좌표와 바깥 밑변을 원본별로 측정한다. 그 좌표를 실제 앱 배치에 넣어 7개 화면 크기에서 마지막 날짜 줄과 달력판 밑변 각각의 하단 탭 여백을 기준 캘린더와 비교한다. 통과 여부는 이미지별 검사 결과로 기록한다.


2026-11-11에 첨부된 무대 뒤·치과·천문대·탁구장 시안 4장을 다시 생성했지만, 재생성 결과에서도 달력 위치가 기준과 다르게 나왔다. 생성 프롬프트만으로 고정 좌표를 보장할 수 없음을 확인했다. 이 네 장을 포함해 현재 배치는 모두 미승인 시안이며, 좌표 고정 후 검증 전까지 후속 90장 제작에 기준으로 사용하지 않는다.
