# 계절 · 겨울 유료 일러스트 캘린더

2026-11-14 등록. 스토어 → 일러스트 캘린더 → 계절 → 겨울. 기존 Pro 구독/paywall을 사용하며 겨울 팩은 기능 플래그와 관계없이 Pro 상품이다.

## 포함된 그림

1. 눈길 산책
2. 썰매를 끄는 오후
3. 얼음 위의 두 사람
4. 작은 눈사람
5. 눈꽃을 날리는 순간

최초 연한 겨울 시안 대신 최근 진한 색의 네 장과 추가 생성 한 장을 등록했다.

## 파일과 서버

- `output/season-winter-v1/manifest.json`: 실제 크기, MD5/SHA-256, 저장 경로, 업로드 검증 결과.
- WebP 품질 92, 총 1,088,678 bytes. 원본 비율 유지.
- Storage bucket: `character-illustrations`
- Storage prefix: `calendar-themes/season-winter/20261114-v1/`
- 다운로드 함수: `calendar-theme`, revision `season-winter-v1`
- 업로드 후 5개를 다시 다운로드하여 SHA-256 일치를 확인했다. 다운로드 함수 배포 완료.

## 그림과 날짜

사용자가 기존 달력 제작 규격을 따르지 않도록 명시한 시리즈다. 그림에는 날짜나 격자를 인쇄하지 않았으며, 각 이미지의 실제 종횡비를 기록했다. 앱이 위쪽 설원의 빈 공간에 월·요일·날짜를 덧그린다. 이미지 전체를 표시하여 아래 인물과 그림자를 자르지 않는다. 썸네일도 겨울 그림 전체를 표시한다.

## 생성

내장 image_gen 도구 사용. 공통 프롬프트: portrait winter editorial gouache illustration, high overhead view, tiny figures below center, vast textured ivory snow, long slate-blue shadows, rich saturated clothing colors, natural anatomy, no dates/calendar/UI/borders.

각 장면: scarlet/navy couple walking; mustard coat pulling a child on a red sled; burgundy/cobalt ice skaters; forest-green coat making a snowman; cobalt coat and red scarf tossing snow beside a cream dog.

## 2026-11-14 비율 수정본 교체 (v2)

사용자 요청으로 기존 디자인을 참조해 위아래 설원을 확장한 비율 수정본을 배포했다. 신규 디자인 시안은 채택하지 않았다.

- 현행 manifest: `output/season-winter-v2/manifest.json`
- 실제 픽셀: 823×1912, 824×1908, 823×1912, 841×1870, 841×1870. 요청한 고해상도 출력에 도달한 것은 아니며, 사용자에게 알린 후 교체 지시를 받았다. 추가 업스케일 없이 WebP 품질 95로 저장했다.
- 현행 Storage: `calendar-themes/season-winter/20261114-v2/`
- 서버 및 앱 revision: `season-winter-v2`; 구형 로컬 파일은 v2 설치 완료 후 정리한다.
- 새 5종 업로드 및 재다운로드 SHA-256 검증 완료 후 v1 파일 제거.
- 원본 비율로 미리보기 표시. 메인에서는 전체 화면을 채우며, 날짜는 화면 좌표에 배치한다.
