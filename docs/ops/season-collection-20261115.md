# 봄·여름·가을 캘린더 팩

기존 `output/season-collection-v2/artwork`의 15종을 등록. 이후 생성한 사실적인 바다/자전거 시안은 포함하지 않는다.

- 각 계절 Pro 5종. 다운로드 n/5 완료 후 목록 열기와 개별 적용, 삭제는 기존 팩 흐름 사용.
- 대표 표지는 `assets/store-previews/season-{spring,summer,autumn}.webp`로 내장. 다운로드 삭제와 독립적.
- 배경만 WebP 품질 92로 업로드. 날짜/요일/연월은 공통 좌표 JSON으로 앱에서 검정색 렌더링.
- Storage: `character-illustrations/calendar-themes/season-{spring,summer,autumn}/20261115-v1/`
- 함수 `calendar-theme`: `season-{spring,summer,autumn}-v1` revision 및 서버 허용 목록에 따른 서명 URL.
- 15개 재다운로드 SHA-256 일치: `docs/ops/season-collection-20261115-records/storage-verification.json`.
- 기존 다운로드/팩 테스트 21개 통과. 전체 타입 검사는 기존 HeroCalendarDesigns, HeroInlineNote/Polaroid/IllustrationThemeCard 테스트 오류로 실패.
- 공통 검증기는 manifest 계약 및 구형 인쇄 경계에 의존해 이번 입력으로 통과하지 않았다. 통과로 간주하지 않는다. 별도 `check-layout.cjs`에서 신규 15종의 실제 앱 좌표로 7개 크기 하단 탭 간격만 검사. 기기에서 시각 검수 필요.

## 로컬 제작 산출물 정리

사용자 요청으로 프로젝트 `output/` 전체를 삭제했다. 원본 시안·중간 파일·App Store 출력물도 포함된다. 앱 런타임은 이 폴더를 참조하지 않는다. 배포된 Supabase 파일과 앱 내장 표지는 유지했다. 이번 15종 manifest, 업로드 검증, 좌표 검증 기록은 이 문서 옆 `season-collection-20261115-records/`로 옮겼다. 과거 제작 스크립트의 output 입력 파일은 재실행 전에 다시 준비해야 한다.
