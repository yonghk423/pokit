# 캘린더 이미지: Supabase 원본 그대로 사용

2026-11-22 사용자 지시에 따라 일러스트 캘린더의 별도 썸네일 축소·재압축을 전면 폐지했다. 기존 180px 썸네일 및 임시 복구용 720px 썸네일은 제거했다.

- 개별 테마 320개와 팩 대표 이미지 9개는 Supabase 다운로드 파일을 바이트 그대로 복사한다. `assets/paid-calendar-originals`에는 별도 해상도 변형이 없다.
- 다운로드가 있는 테마는 검증된 기기 원본을 우선 표시하고, 아직 다운로드하지 않은 테마는 동일 바이트의 앱 내장 원본을 표시한다.
- 카드의 `allowDownscaling`은 false로 지정했다. `storeArtwork`도 캘린더 대표 이미지를 디코딩할 때 768px 제한을 적용하지 않는다.
- 제작기는 파일 복사만 하며 원본 덮어쓰기·축소·재인코딩을 하지 않는다. PNG를 임의 변환해 서버 파일 대신 쓰는 것도 거절한다. 재실행 결과는 같은 원본과 바이트 단위로 동일하다.
- Supabase 파일 320개는 11월 19일 스토어 축소 이전 앱에 등록된 해시와 일치한다. 대부분 원본 크기는 830×1896이다. 이번 작업에서 운영 Supabase 파일·다운로드 경로·날짜 좌표는 변경하지 않았다.

```sh
# 원본 폴더는 audit의 remotePath 구조를 그대로 유지한다.
node scripts/build-paid-thumbnails.cjs --source-root output/calendar-quality-repair/server-originals
python3 scripts/test-calendar-quality-assets.py
```

기존 명령 이름은 호환성을 위해 남겼지만 더 이상 썸네일을 만들지 않는다. 실행 정책은 `calendar-image-quality.json`, 파일별 SHA-256·크기 검증 기록은 `docs/audits/calendar-quality-repair-20261122.json`이다. 원본을 앱에 내장하므로 번들 크기는 축소 버전보다 커진다.

새 고해상도 다운로드 제작이 필요할 때만 별도 원본 manifest를 아래 명령에 전달한다. 가로 1290px 미만 원본은 거절하고 확대하지 않으며 lossless WebP를 별도 버전 폴더에 생성한다. 이 명령은 업로드하지 않는다. 신규 그림의 시각·공통 좌표·7개 뷰포트 검수와 스토리지 readback이 별도로 필요하다.

```sh
python3 scripts/build-calendar-quality-assets.py --download-manifest masters.json --download-output output/calendar-hd-new-revision
```
