# 이미지 점검 — 2026-11-10

assets 이미지 861개, 총 61.34 MiB. 로컬 소스 용량이며 설치 앱 크기가 아니다.

## 우선 정리 후보
- blue-clipboard-clip.png: 1.48 MiB. 런타임은 WebP 사용; PNG 원본은 정리 후보.
- ivory-linen-v1.png 및 webp: 약 3.00 MiB. 파일명 참조 없음; 외부 작업용 여부 확인 후 정리.
- upload-candidate-v6/v8: 업로드·보정 스크립트용, 합계 약 23 MiB. 런타임 이미지로 확인되지 않음. 스크립트 재실행용 원본이므로 자동 삭제하지 않음.

## 최적화 후보
- polaroid-handled-v1.png: 2.14 MiB, polaroid-stock-v1.png: 1.90 MiB. HeroPolaroidSurface에서 실제 사용. 질감 품질 비교 후 WebP 전환 후보.
- splash-polaroid-quote.png: 1.32 MiB. 네이티브 스플래시 사용, 플랫폼 형식 유지 필요.

## 판정 제한
- 파일명 참조가 없는 325개를 모두 미사용으로 판단하면 안 됨. @2x/@3x는 자동 해상도 선택 대상으로 포함되어 있음.
- background.webp처럼 같은 파일명이 여러 폴더에 있는 경우 파일명 검색만으로 사용 여부를 판단할 수 없음.
- iOS 앱 아이콘·스플래시의 원본과 네이티브 복사본은 필요한 중복.
- 사용자 기기 캐시 및 다운로드 데이터, 최종 앱 번들 크기는 이번 점검에 포함하지 않음.
- 파일 삭제 및 변환은 수행하지 않음.
