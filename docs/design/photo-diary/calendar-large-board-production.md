# 큰 달력판 테마 제작 기준

갱신일: 2026-11-10

사용자가 승인한 두 번째 구성으로 기존 50개 테마를 다시 제작한다. 아래 조건은 화면 목업이 아닌 앱에서 소비할 배경 이미지의 필수 조건이다.

## 이미지에 포함할 요소

- 기존 테마의 인물, 장면, 재질, 조명과 장식.
- 위쪽의 일러스트와 아래쪽의 크게 확대한 빈 달력판.
- 글자가 없는 연도/월 공간과 요일 공간.
- 테마 연출에 어울리는 빈 표면과 장식. 날짜 칸으로 쓰는 메모지나 칸막이 소품은 좌표를 규칙적으로 배치할 수 있다.
- 화면 네 변까지 이어지는 배경. 휴대전화 프레임이나 흰 외곽 여백은 없다.

## 앱에서만 렌더링할 요소

- 연도, 월, 월 이동 화살표.
- 요일, 날짜, 오늘/선택한 날짜의 강조.
- 실제 기록 사진과 사진 장식.
- 연동 일정 표시와 날짜 터치 영역.
- 상태바, 노치, 설정 아이콘, 하단 탭과 모든 조작 버튼.

배경 파일에는 달력 격자선, 숫자, 글자, 가짜 사진, 사진 자리표시자, 이벤트 원, 앱 UI를 절대로 합성하지 않는다. 2026년 11월을 포함한 특정 달력 구조도 그리지 않는다. 2026년 11월처럼 6주가 필요한 달에도 날짜 칸을 덮을 수 있도록 앱이 동일한 7열 × 6행 구조를 그린다.

## 제작 프롬프트 공통 제약

Production illustration background asset, NOT a screenshot or UI mockup.
Preserve the theme's scene and materials while enlarging the empty calendar board.
The upper illustration and lower wide calendar surface must follow the approved second composition while retaining the unique theme concept and its props.
Leave the month/year area, weekday area, and all 42 date surfaces blank. Add no printed calendar structure: the app draws all seven columns, six rows, and text as one responsive layer using measured normalized geometry. Keep themed blank notes or physical board ornaments only when they belong to the scene.
No grid lines, text, letters, numerals, dates, year or month, weekday names, arrows, event markers, photographs, polaroid thumbnails, photo placeholders, status bar, notch, app controls, tabs, phone frame, or watermark.
Extend the illustration naturally to all four canvas edges. Keep decorations outside the usable header and cell areas.

## 산출물 확인

- 생성 지시만으로 좌표가 정확하다고 간주하지 않는다. 실제 산출물의 빈 머리글 영역과 7×6 격자를 확인한다.
- 사진이나 글자가 들어간 시안은 런타임 배경으로 사용하거나 업로드하지 않는다.
- 배경과 앱의 글자/사진/터치 영역은 동일한 좌표 변환을 사용한다. 화면 크기에 따라 배경만 확대하고 좌표를 별도로 배치하지 않는다.
- 이미지의 원본 비율을 유지하고, 화면을 채우는 배치에서 달력의 실제 사용 영역이 노치나 탭에 잘리지 않게 확인한다.

## 폐기할 목업

앞선 생성 배치에는 고정 날짜, 예시 사진, 상태바, 하단 탭이 포함된 잘못된 지시가 들어갔다. 해당 결과는 디자인 참고용일 뿐 실제 적용 대상이 아니다. 이번 수정 조건을 충족하는 새 산출물만 채택한다.
