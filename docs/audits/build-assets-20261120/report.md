# 빌드 용량 점검 — 2026-11-20

## 점검 범위

현재 작업 트리에서 `npx expo export --platform ios --output-dir /tmp/pokit-build-asset-audit --dump-assetmap` 실행 성공. 개발 서버가 아닌 프로덕션 Metro/Hermes 출력의 실제 assetmap을 집계했다. 앱 코드나 원본 자산은 변경하지 않았다. iOS Xcode 리소스 목록도 별도로 읽었다. IPA/App Store 압축 용량 또는 Android APK 실측은 아니다.

- Metro 자산 파일: 1,153개, 원본 합계 46,113,074 bytes (46.11MB)
- Hermes JS 번들: 약 12MB (Expo 표시값)
- 아이콘·스플래시·위젯·네이티브 라이브러리는 별도 추가되므로 설치 용량과 같지 않다.
- 파일 내용이 완전히 같은 자산 중복은 1,566 bytes로 미미하다.

## 우선 정리 후보

1. **사용하지 않는 아이콘 폰트: 3,664,404 bytes**
   실제 출력에 vector-icons 폰트 19개(4,076,840 bytes)가 들어간다. 앱 소스는 Feather와 MaterialIcons만 참조한다. `src/pages/day-plan/ui/HeroAppliedCalendarIcon.tsx`의 `import { Feather } from '@expo/vector-icons'`가 전체 진입점을 참조한다. 개별 경로 `@expo/vector-icons/Feather`로 전환한 뒤 다시 export하여 나머지 17개가 빠지는지 확인할 가치가 가장 높다. 아직 변경 전이므로 절감량은 후보 원본 기준이다.
2. **폴라로이드 PNG 질감: 합계 4,235,763 bytes**
   사용 중인 파일이므로 삭제 대상은 아니다. `polaroid-stock-v1.png`(1,990,687 bytes)와 `polaroid-handled-v1.png`(2,245,076 bytes)가 포함된다. 같은 픽셀 크기 WebP quality 90 시험 인코딩은 각각 58,348 / 105,786 bytes. 약 4,071,629 bytes 절감 후보. 투명도·흰 테두리·작은 인쇄 질감의 시각 검증 후 교체 필요. `HeroPolaroidSurface.tsx`, `classicDiaryCatalog.ts` 참조.
3. **유료 사진 달력 원본도 번들에 포함: 777,884 bytes**
   `freePhotoCalendars.ts`에서 Pro 5개 모두 background와 thumbnail을 동일 로컬 원본 require로 등록하여, Supabase 다운로드와 별개로 앱 안에도 원본이 포함된다. 서버 전용 원본 + 작은 로컬 썸네일 구조로 바꾸면 일부 절감 가능. 다운로드 전 미리보기와 오프라인 fallback, 위젯 동작 점검이 필요하다. 같은 파일을 두 번 require한 것 자체는 이중 복사가 아니다.

아이콘 폰트 정리 + 질감 변환의 단순 원본 기준 절감 후보 합계는 약 7.74MB. 최종 압축 배포 크기 절감량은 달라진다.

## 크지만 실제 사용 중인 항목

- HiMelody: 12,622,312 bytes. 앱 UI 기본 글꼴 및 위젯에서 사용. 불필요 파일로 판단하면 안 된다.
- 프로젝트의 다른 글꼴: 합계 13,437,404 bytes. 설정/카드 글꼴 선택 및 미리보기에서 사용한다. 선택 시 loadAsync여도 정적 require로 파일은 번들에 포함된다.
- 이 글꼴들은 서버 다운로드/서브셋 도입 시 추가 절감 여지가 있지만 다국어와 위젯 호환성을 검증해야 한다.
- 위젯 타깃에 HiMelody, Ownglyph, Cafe24 2종이 별도 Resources로 등록돼 있다. 위젯 기능에 쓰이므로 즉시 삭제 대상으로 분류하지 않았다. IPA에서 메인 앱/확장 리소스 실제 중복 크기는 추가 실측 필요.
- 스토어 미리보기·유료 테마 썸네일은 구매 전 전시용으로 사용 중이다.

## 폴더에 있지만 Metro에 없는 항목

- `output/` 약 491MB: 이번 export 자산에 포함되지 않는다.
- `ios/Pods/` 약 777MB: 소스/의존성 폴더 크기로 앱에 통째 복사되는 것이 아니다. 링크된 코드 크기는 별도 네이티브 빌드 실측 필요.
- `assets/pro-photo-walls/`의 원본들: 이번 assetmap에 없음.
- 폰트 라이선스 PDF 약 3.96MB: 이번 assetmap에 없음. Xcode Resources에는 작은 LICENSE.txt만 등록되어 있다.
- `assets/`에서 Metro에 없는 파일 총 11.53MB 중 앱 아이콘과 스플래시는 Xcode 자산 카탈로그를 통해 별도 포함되므로, 전부 불필요하다고 판단하면 안 된다.

## 다음 적용 순서

아이콘 개별 import → 질감 WebP 교체/시각 확인 → 유료 사진 달력 원본/썸네일 분리 → 동일 명령 재실행으로 전후 비교. 이번 요청은 점검으로 이해해 삭제나 교체는 수행하지 않았다.
