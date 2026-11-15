# 일러스트 캘린더 제작

다이어리용 일러스트 캘린더를 만들거나 교체할 때는 [공통 좌표 JSON](docs/design/photo-diary/city-calendar-template.json)을 원본으로 사용한다. 이 파일은 시티 애니메이션의 사무실 장면을 실측한 값이며, 제작기와 검증기가 함께 읽는다.

- 장면별 일러스트와 달력 재질을 디자인할 때는 [생성 프롬프트](docs/design/photo-diary/calendar-large-board-generation.json)를 사용한다. 최종 이미지에는 [제작 절차](docs/design/photo-diary/calendar-large-board-production.md)에 따라 장면에 맞는 정면 장식판과 하나로 이어진 빈 면을 만든다. 날짜 격자·요일칸·월 표시판 아래 구분선·판 하단 가로선을 그림에 넣지 않는다. 좌우 세로 테두리도 제거하고 상단 장식만 남긴다. 기존 참고 이미지의 양옆 레일은 폐기된 규격이다. 최신 디자인 정책은 JSON의 artwork를 따른다. 날짜 7열 × 6행은 앱 데이터 배치용 보이지 않는 좌표다.
- 신규 테마를 앱에 등록할 때는 같은 JSON의 `month`, `weekdays`, `grid`를 캔버스 크기로 정규화해 텍스트·사진·터치 영역에 사용한다. `monthPlate`와 `weekdayPlate`는 과거 실측 영역이며 신규 그림에 테두리를 인쇄하라는 뜻이 아니다.
- 완성한 PNG와 manifest가 있는 폴더를 `REVIEW_DIR`로 지정한다. 프로젝트 루트에서 [검증기](scripts/verify-city-calendar-preview.cjs)를 `node scripts/verify-city-calendar-preview.cjs "$REVIEW_DIR"`로 실행해 7개 화면 크기의 하단 탭 간격을 확인한다. 기존 검증기의 인쇄된 칸 경계 검사는 구형 규격 전용이므로 새 빈 면 규격에는 사용하지 않는다. 새 규격 대응 전에는 이 검사로 통과했다고 보고하지 않는다.

- 현행 빈 면 v2에서는 상단 장식만 각 일러스트 장면에 맞게 따로 설계한다. 승강장 프레임 복제나 색상만 바꾼 변형은 허용하지 않는다.

- 최신 추가 규격에서는 상단 장식 아래 밝은 빈 면이 이미지 맨 아래 끝까지 이어진다. 하단 탭 뒤까지 같은 면으로 채우며, 296px 바닥 장면을 다시 넣지 않는다. 좌우·하단 테두리와 하단 경계선도 제거한다.
