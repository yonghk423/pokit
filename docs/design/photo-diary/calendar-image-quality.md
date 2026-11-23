# 캘린더 이미지: Supabase 원본 그대로 사용

2026-11-23: 앱에는 팩 대표 이미지 9개만 내장한다. 개별 달력 320개는 내장하지 않으며 팩 다운로드로 저장한 파일을 미리보기와 적용 화면에서 사용한다.

- 대표 이미지는 Supabase WebP를 바이트 그대로 복사한다. 축소·재압축하지 않는다.
- 개별 테마 카드는 `illustrationCalendarBackgroundUri(themeId)`의 다운로드 파일을 직접 표시한다. 미다운로드 상태에서 내장 원본으로 대체하지 않는다.
- 카드의 `allowDownscaling`은 false를 유지한다. 캘린더 대표 이미지의 디코딩에도 768px 제한을 적용하지 않는다.
- 제작기는 대표 이미지만 복사하며 개별 테마 내장 파일이나 require 목록을 생성하지 않는다.
- Supabase 파일·다운로드 경로·해시 검증·날짜 좌표는 변경하지 않는다.

```sh
# 원본 폴더는 audit의 remotePath 구조를 그대로 유지한다.
node scripts/build-paid-thumbnails.cjs --source-root output/calendar-quality-repair/server-originals
python3 scripts/test-calendar-quality-assets.py
```

기존 명령 이름은 호환성을 위해 남겼지만 더 이상 썸네일을 만들지 않는다. 실행 정책은 `calendar-image-quality.json`, 파일별 SHA-256·크기 검증 기록은 `docs/audits/calendar-quality-repair-20261122.json`이다. 개별 테마를 다시 앱에 내장하지 않는다.

새 고해상도 다운로드 제작이 필요할 때만 별도 원본 manifest를 아래 명령에 전달한다. 가로 1290px 미만 원본은 거절하고 확대하지 않으며 lossless WebP를 별도 버전 폴더에 생성한다. 이 명령은 업로드하지 않는다. 신규 그림의 시각·공통 좌표·7개 뷰포트 검수와 스토리지 readback이 별도로 필요하다.

```sh
python3 scripts/build-calendar-quality-assets.py --download-manifest masters.json --download-output output/calendar-hd-new-revision
```
