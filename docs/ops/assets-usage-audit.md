> 2026-10-19 업데이트: 루틴·템플릿·통계·퍼즐의 장식 사진 배경과 하단 스트립을 제거했습니다. `assets/unsplash-routine/`의 미사용 사진 16장(1,868,290 bytes)과 `src/shared/ui/routine-atmosphere/` 모듈을 삭제하고 앱 시작 프리패치도 제거했습니다. 온보딩에서 사용하는 `morning-brunch.webp`, `sunset-ridge.webp` 및 다이얼·개발용 샘플 앨범에서 사용하는 `assets/puzzle/`은 유지합니다. 아래 표는 이전 점검 당시 기록입니다.

# assets 이미지 사용 현황 점검

점검일: 2026-10-19

현재 존재하는 이미지 87개를 대상으로 검사했습니다. 앞서 삭제한 assets/routine 파일은 제외했습니다. 점검 후 사용자 요청에 따라 아래 미사용 이미지 32개를 삭제했습니다. 앱 코드는 변경하지 않았습니다. 현재 남은 이미지는 55개입니다.

## 결과

- 코드·설정 참조 있음: 55개
- 코드·설정 참조 없음: 32개, 2,281,856바이트 (약 2.28 MB / 2.18 MiB)

## 점검 방법과 한계

- TypeScript 구문 분석으로 import/export/require 등 문자열 경로를 추출하고 상대 경로 및 별칭을 실제 파일 경로로 해석했습니다.
- app 폴더의 진입점부터 소스 파일 연결을 추적했습니다. 참조가 있는 모든 이미지는 앱 소스 연결 경로에서 도달 가능합니다. 타입 전용 import와 배럴 export도 포함한 보수적인 판정이므로 실제 화면에 표시되는 횟수까지 의미하지는 않습니다.
- app.json의 아이콘·알림·스플래시 설정, scripts의 이미지 생성 입력, iOS 리소스 설정 및 전체 저장소 파일명 검색을 추가 확인했습니다.
- 폴더를 통째로 읽는 동적 이미지 로더나 assets 전체를 강제로 포함하는 별도 설정은 검색에서 발견되지 않았습니다.
- 옛 용량 최적화 문서나 코드 주석의 언급은 실행 참조로 보지 않았습니다.
- 최종 배포 빌드의 이미지 목록·설치 크기는 측정하지 않았습니다. 이미 번들에서 빠지는 미사용 파일은 삭제해도 설치 크기가 같은 만큼 줄지 않습니다.

## 삭제 완료한 미사용 이미지 목록

| 파일 | 크기 (KiB) |
|---|---:|
| `assets/icon-with-green-postit-label.webp` | 45.4 |
| `assets/icon-with-green-postit.webp` | 42.3 |
| `assets/icon-with-multi-postit-labels.webp` | 46.2 |
| `assets/main.webp` | 53.4 |
| `assets/onboarding/end-thumb.jpg` | 9.4 |
| `assets/onboarding/start-thumb.jpg` | 11.3 |
| `assets/puzzle/collage.webp` | 266.7 |
| `assets/puzzle-guide/board-collage.png` | 338.0 |
| `assets/splash.webp` | 76.1 |
| `assets/splash2.webp` | 53.3 |
| `assets/splash6.webp` | 38.3 |
| `assets/unsplash-routine/collage.webp` | 266.7 |
| `assets/unsplash-routine/goals-patch.webp` | 108.2 |
| `assets/widget/_refs/edit-note-list.jpg` | 91.1 |
| `assets/widget/_refs/edit-note.jpg` | 73.4 |
| `assets/widget/_refs/gallery-bookstore.jpg` | 82.2 |
| `assets/widget/_refs/gallery-note.jpg` | 77.7 |
| `assets/widget/_refs/gallery-routine.jpg` | 79.0 |
| `assets/widget/_refs/gallery-today.jpg` | 78.5 |
| `assets/widget/_refs/today-routine-marks-list.jpg` | 37.4 |
| `assets/widget/_refs/today-routine-marks.png` | 53.9 |
| `assets/widget/edit-bookstore-list.webp` | 26.4 |
| `assets/widget/edit-bookstore.webp` | 18.6 |
| `assets/widget/edit-note-list.webp` | 25.8 |
| `assets/widget/edit-note.webp` | 19.6 |
| `assets/widget/edit-routine-list.webp` | 13.5 |
| `assets/widget/edit-routine.webp` | 17.9 |
| `assets/widget/gallery-bookstore.webp` | 24.5 |
| `assets/widget/gallery-note.webp` | 22.3 |
| `assets/widget/gallery-routine.webp` | 23.5 |
| `assets/widget/gallery-today.webp` | 21.6 |
| `assets/widget/tutorial/pokit-widget-notebook-hero-turn.webp` | 85.9 |

assets/widget/_refs의 참고 이미지도 향후 사용하지 않는다는 사용자 요청에 따라 삭제했습니다.

## 코드·설정에서 참조하는 파일 전체 목록

| 파일 | 크기 (KiB) | 참조 위치 |
|---|---:|---|
| `assets/app-icon3.png` | — | `app.json` icon / notification / adaptive / favicon |
| `assets/onboarding/hero.jpg` | 102.0 | `src/pages/day-plan/lib/dailyRhythmOnboardingAssets.ts:11` |
| `assets/pokit4.webp` | 43.6 | `src/shared/lib/welcome-intro-assets.ts:13` |
| `assets/puzzle/basketball.webp` | 45.7 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:20` |
| `assets/puzzle/desk-stretch.webp` | 70.7 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:22` |
| `assets/puzzle/garage-kettlebell.webp` | 87.8 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:25` |
| `assets/puzzle/hands-heart.webp` | 46.5 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:21` |
| `assets/puzzle/happy.webp` | 166.0 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:29` |
| `assets/puzzle/lake-jump.webp` | 263.9 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:23` |
| `assets/puzzle/meal-prep.webp` | 84.0 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:24` |
| `assets/puzzle/open-book.webp` | 275.6 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:26` |
| `assets/puzzle/peace-shadow.webp` | 189.3 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:27`; `src/widgets/daily-rhythm-time-field/ui/DayCycleDial.tsx:57` |
| `assets/puzzle/rocky-shore.webp` | 338.0 | `src/shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed.ts:28` |
| `assets/puzzle-guide/photo.jpg` | 265.3 | `src/shared/lib/puzzle-guide-assets.ts:16` |
| `assets/puzzle-guide/target.jpg` | 262.6 | `src/shared/lib/puzzle-guide-assets.ts:15` |
| `assets/puzzle-guide/tip.jpg` | 222.8 | `src/shared/lib/puzzle-guide-assets.ts:17` |
| `assets/puzzle-guide/wall.jpg` | 208.5 | `src/shared/lib/puzzle-guide-assets.ts:14` |
| `assets/splash-artwork.png` | — | `app.json` expo-splash-screen ios.image; `WelcomeIntroPage.tsx` |
| `assets/splash3.webp` | 49.9 | `src/shared/lib/welcome-intro-assets.ts:12` |
| `assets/splash4.webp` | 54.8 | `src/shared/lib/welcome-intro-assets.ts:11` |
| `assets/splash5.webp` | 38.7 | `src/shared/lib/welcome-intro-assets.ts:14`; `src/shared/ui/settings-atmosphere/settingsAtmosphereAssets.ts:7` |
| `assets/unsplash-routine/basketball.webp` | 45.7 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:10` |
| `assets/unsplash-routine/cat-stretch.webp` | 55.4 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:12` |
| `assets/unsplash-routine/desk-stretch.webp` | 70.7 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:13` |
| `assets/unsplash-routine/garage-kettlebell.webp` | 87.8 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:18` |
| `assets/unsplash-routine/hands-heart.webp` | 46.5 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:11` |
| `assets/unsplash-routine/headphones.webp` | 28.2 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:14` |
| `assets/unsplash-routine/lake-jump.webp` | 263.9 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:15` |
| `assets/unsplash-routine/meal-prep.webp` | 84.0 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:16` |
| `assets/unsplash-routine/morning-brunch.webp` | 263.1 | `src/pages/day-plan/lib/dailyRhythmOnboardingAssets.ts:13`; `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:17` |
| `assets/unsplash-routine/open-book.webp` | 275.6 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:19` |
| `assets/unsplash-routine/peace-shadow.webp` | 189.3 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:20` |
| `assets/unsplash-routine/rock-climb.webp` | 24.4 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:21` |
| `assets/unsplash-routine/rocky-shore.webp` | 338.0 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:22` |
| `assets/unsplash-routine/runners-shadow.webp` | 201.9 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:27` |
| `assets/unsplash-routine/sunset-raise.webp` | 18.0 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:23` |
| `assets/unsplash-routine/sunset-ridge.webp` | 37.9 | `src/pages/day-plan/lib/dailyRhythmOnboardingAssets.ts:15`; `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:24` |
| `assets/unsplash-routine/tablet-collab.webp` | 65.5 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:25` |
| `assets/unsplash-routine/yoga-sunrise.webp` | 29.5 | `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts:26` |
| `assets/widget/tutorial/pokit-widget-notebook-01-intro-en.webp` | 85.3 | `src/shared/lib/widget-guide-assets.ts:23` |
| `assets/widget/tutorial/pokit-widget-notebook-01-intro-ja.webp` | 83.2 | `src/shared/lib/widget-guide-assets.ts:31` |
| `assets/widget/tutorial/pokit-widget-notebook-01-intro.webp` | 90.2 | `src/shared/lib/widget-guide-assets.ts:15` |
| `assets/widget/tutorial/pokit-widget-notebook-02-edit-en.webp` | 65.8 | `src/shared/lib/widget-guide-assets.ts:24` |
| `assets/widget/tutorial/pokit-widget-notebook-02-edit-ja.webp` | 60.5 | `src/shared/lib/widget-guide-assets.ts:32` |
| `assets/widget/tutorial/pokit-widget-notebook-02-edit.webp` | 61.9 | `src/shared/lib/widget-guide-assets.ts:16` |
| `assets/widget/tutorial/pokit-widget-notebook-03-bookstore-en.webp` | 79.8 | `src/shared/lib/widget-guide-assets.ts:25` |
| `assets/widget/tutorial/pokit-widget-notebook-03-bookstore-ja.webp` | 78.5 | `src/shared/lib/widget-guide-assets.ts:33` |
| `assets/widget/tutorial/pokit-widget-notebook-03-bookstore.webp` | 91.1 | `src/shared/lib/widget-guide-assets.ts:17` |
| `assets/widget/tutorial/pokit-widget-notebook-04-tip-en.webp` | 70.9 | `src/shared/lib/widget-guide-assets.ts:27` |
| `assets/widget/tutorial/pokit-widget-notebook-04-tip-ja.webp` | 66.1 | `src/shared/lib/widget-guide-assets.ts:35` |
| `assets/widget/tutorial/pokit-widget-notebook-04-tip-turn.webp` | 63.1 | `src/shared/lib/widget-guide-assets.ts:19` |
| `assets/widget/tutorial/pokit-widget-notebook-05-note-en.webp` | 63.2 | `src/shared/lib/widget-guide-assets.ts:26` |
| `assets/widget/tutorial/pokit-widget-notebook-05-note-ja.webp` | 60.4 | `src/shared/lib/widget-guide-assets.ts:34` |
| `assets/widget/tutorial/pokit-widget-notebook-05-note.webp` | 62.1 | `src/shared/lib/widget-guide-assets.ts:18` |

## 삭제 전 확인한 동일 내용의 파일

SHA-256 해시가 동일한 파일입니다. 현재 사용되는 파일도 포함되므로 경로를 통일하지 않고 삭제하면 이미지 로딩이 깨질 수 있습니다. collage 복사본 2개는 미사용으로 삭제했고, 실제 스플래시 파일은 유지했습니다.

| 크기 (KiB/개) | 동일 파일 |
|---:|---|
| 45.7 | `assets/puzzle/basketball.webp` / `assets/unsplash-routine/basketball.webp` |
| 266.7 | `assets/puzzle/collage.webp` / `assets/unsplash-routine/collage.webp` |
| 70.7 | `assets/puzzle/desk-stretch.webp` / `assets/unsplash-routine/desk-stretch.webp` |
| 87.8 | `assets/puzzle/garage-kettlebell.webp` / `assets/unsplash-routine/garage-kettlebell.webp` |
| 46.5 | `assets/puzzle/hands-heart.webp` / `assets/unsplash-routine/hands-heart.webp` |
| 263.9 | `assets/puzzle/lake-jump.webp` / `assets/unsplash-routine/lake-jump.webp` |
| 84.0 | `assets/puzzle/meal-prep.webp` / `assets/unsplash-routine/meal-prep.webp` |
| 275.6 | `assets/puzzle/open-book.webp` / `assets/unsplash-routine/open-book.webp` |
| 189.3 | `assets/puzzle/peace-shadow.webp` / `assets/unsplash-routine/peace-shadow.webp` |
| 338.0 | `assets/puzzle/rocky-shore.webp` / `assets/unsplash-routine/rocky-shore.webp` |

퍼즐 폴더의 샘플 사진 10개는 개발용 목업 코드에서 참조됩니다. peace-shadow.webp는 실제 하루 시간대 다이얼에서도 사용됩니다. 따라서 퍼즐 폴더 전체를 미사용으로 판단하면 안 됩니다.
