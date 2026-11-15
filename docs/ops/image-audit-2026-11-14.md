# 이미지 용량 및 사용 현황 점검

점검일: 2026-11-14

현재 소스와 새 iOS production export의 `assetmap.json`을 대조했습니다. 파일 크기는 원본 파일 기준이며 IPA 다운로드 크기와 다릅니다. 이미지를 수정·삭제하지 않았습니다.

## 규모

| 대상 | 개수 | 용량 |
|---|---:|---:|
| assets 래스터 이미지 | 1047 | 132.77 MiB |
| iOS JS 번들에 포함된 로컬 이미지 | 733 | 14.21 MiB |
| 이번 iOS JS 번들에 미포함 | 314 | 118.56 MiB |

## 실제 포함된 이미지 중 최적화 우선순위

| 이미지 | 파일 용량 | 해상도 | 디코딩 픽셀 RGBA 환산 |
|---|---:|---|---:|
| `assets/textures/polaroid-handled-v1.png` | 2.141 MiB | 1024×1536 | 6.0 MiB |
| `assets/textures/polaroid-stock-v1.png` | 1.898 MiB | 1086×1448 | 6.0 MiB |
| `assets/control-illustrations/sage-enamel-trash-bin.png` | 1.326 MiB | 1199×1312 | 6.0 MiB |
| `assets/control-illustrations/sage-enamel-trash-bin-paper.png` | 1.290 MiB | 1199×1312 | 6.0 MiB |
| `assets/control-illustrations/ivory-ceramic-trash-bin.png` | 0.851 MiB | 1312×1199 | 6.0 MiB |
| `assets/control-illustrations/ivory-ceramic-trash-bin-paper.png` | 0.848 MiB | 1312×1199 | 6.0 MiB |
| `assets/control-illustrations/personal-camera-hands.webp` | 0.374 MiB | 1254×1254 | 6.0 MiB |
| `assets/classic-diary/classic-pocket-3d.webp` | 0.270 MiB | 894×900 | 3.07 MiB |
| `assets/color-textures/wrinkled-paper-v1.jpg` | 0.231 MiB | 941×1672 | 6.0 MiB |
| `assets/classic-diary/classic-corner-3d.webp` | 0.206 MiB | 900×897 | 3.08 MiB |
| `assets/store-cameras/instax-mini-evo.png` | 0.181 MiB | 512×341 | 0.67 MiB |
| `assets/store-previews/city-animation-couch.webp` | 0.157 MiB | 830×1896 | 6.0 MiB |

상위 6개가 번들 이미지 원본 용량의 58.8%를 차지합니다.

- 폴라로이드 질감 PNG 2개는 `HeroPolaroidSurface.tsx`에서 실제 사용합니다. 두 텍스처를 사진마다 겹쳐 그립니다. 낮은 표시 불투명도를 고려해 해상도 축소·압축 포맷 비교 또는 작은 타일 질감 대체를 우선 검토합니다. 원본 품질·질감 보존 비교 전 삭제하면 안 됩니다.
- 세이지·아이보리 휴지통의 빈/채운 PNG 4개는 약 1200px급입니다. 스토어의 작은 표시 크기에 비해 큽니다. 작은 썸네일과 실제 다이어리용 크기를 분리하거나, 필요한 최대 표시 픽셀에 맞춰 축소하는 것을 우선 검토합니다. 투명도 문제의 이력이 있으므로 무조건 WebP로 재변환하지 않습니다.
- 파일을 압축해도 픽셀 크기가 같으면 디코딩 메모리는 거의 줄지 않습니다. 해상도와 표시 크기까지 같이 점검해야 합니다. 위 메모리는 픽셀 환산값으로 실제 런타임 측정값이 아닙니다.

## 번들 미포함 및 정리 후보

- `assets/calendar-illustrations/citypop-retro/`: 100개(PNG 50개와 WebP 50개), 합계 약 105.78 MiB. 이번 iOS JS 번들에는 포함되지 않습니다. `scripts/build-citypop-retro-pack.cjs`가 이 폴더를 사용하므로 제작·업로드 원본으로 분류하며, 앱에서 안 보인다고 자동 삭제하지 않습니다.
- `assets/development/`: 50개, 약 2.95 MiB. production 번들에는 없지만 개발용 mock 데이터가 코드에서 참조합니다.
- `assets/store-previews/black-photo-wall.png`: 약 1.61 MiB. 이번 번들에 없으므로 구형 미리보기 정리 후보입니다. 상세 JSON의 코드·스크립트 파일명 참조 후보와 비교한 뒤 판단합니다.
- 기타 미포함 파일에는 원격 업로드용 에셋, 옛 미리보기, 미사용 원본 후보가 섞여 있습니다. 파일별 번들 포함 여부와 파일명 참조 후보는 상세 JSON에 기록했습니다.
- 바이트 단위로 같은 파일은 `assets/calendar-bindings/kraft-clip.webp`와 `assets/calendar-store/calendars/kraft-clip-binding.webp` 한 쌍입니다. 앱용과 서버 업로드용 역할이 다를 수 있으므로 바로 중복 삭제하지 않습니다.

## 판정 한계 및 보호 대상

- JS 번들 미포함은 삭제해도 된다는 뜻이 아닙니다. 앱 아이콘·스플래시는 `app.json`과 iOS 네이티브 빌드가 별도로 사용합니다.
- `@2x`·`@3x` 파일도 Metro assetmap의 `files` 전체를 대조했습니다. 단순 파일명 검색보다 실제 포함 여부를 우선했습니다.
- Android·웹·개발 모드·네이티브 위젯·문서·제작 스크립트 전용 사용은 iOS production JS 그래프에 없을 수 있습니다. 파일명 참조 후보는 같은 이름의 다른 파일이나 테스트 참조도 포함할 수 있습니다.
- 사용자 기기의 사진, 다운로드 팩, 캐시 및 Supabase 원본은 이번 점검에 포함하지 않았습니다. 로컬 파일 정리와 앱 설치 용량 감소를 구분해야 합니다.

## 재현

```sh
npx expo export --platform ios --dump-assetmap --output-dir /tmp/yourday-image-audit-export
```

이번 export는 성공했습니다. 상세 목록: [image-audit-2026-11-14.json](image-audit-2026-11-14.json).
