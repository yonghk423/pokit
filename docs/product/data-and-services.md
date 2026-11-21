# 데이터와 외부 서비스

갱신일: 2026-11-17. Daylight의 현재 데이터·서비스 역할과 구현 시작점을 기록합니다. 외부 계정의 판매·배포 상태는 별도 확인합니다.

## 사용자 기록

날짜별 다이어리·사진·폴라로이드 편집 정보, 계획·메모·이벤트와 설정은 로컬 저장 경로를 기준으로 확인합니다. 기존 장면·메이트 데이터는 각 도메인의 저장 구조를 유지합니다.

- 공용 저장 접근: `src/shared/lib/storage/localStorageClient.ts`
- 일기와 장면: `src/pages/day-plan/lib/heroDiaryStorage.ts`, `heroDayStorage.ts`
- 메이트와 실행 상태: `src/entities/day-plan`, `src/shared/lib/storage`

기존 `pokit:*` 키와 일기·장면 ID는 사용자 기록과 연결됩니다. 제품 이름이나 문서 변경을 이유로 바꾸거나 초기화하지 않습니다. 새 일기 이름은 해당 일기에 저장하며 다른 일기나 새 초안에 전달하지 않습니다.

## 외부 서비스의 역할

| 서비스 | 역할 | 확인 위치 |
|---|---|---|
| OpenWeather | 현재 위치를 바탕으로 날씨 조회 | `src/pages/day-plan/ui/WeatherSummary.tsx` |
| Supabase | 공지와 다운로드형 달력·일러스트 등 원격 에셋 제공 | `src/entities/announcement/api/fetchAnnouncements.ts`, `src/pages/day-plan/lib/illustrationCalendarAssets.ts` |
| Google Drive | 사용자가 실행하는 날짜별 백업·복구 | [백업 범위와 설정](../google-drive-backup.md) |
| RevenueCat | 구독 SDK와 구독 상태 처리 코드 | `src/shared/config/revenueCat.ts`, `src/features/subscriptions` |
| 도서 검색 | 책 찾기·관련 정보 조회 | `src/features/aladin-book-search`, `src/features/open-library-book-search` |

공지용 원격 연결이 있다는 사실만으로 사용자 일기가 클라우드에 동기화된다고 설명하지 않습니다.

## 설정과 비밀 값

- OpenWeather 설정 이름은 `EXPO_PUBLIC_OPENWEATHER_API_KEY`입니다. 로컬 개발 설정과 EAS 환경에 필요한 값을 각각 등록합니다.
- 다른 설정 이름은 해당 서비스가 읽는 `process.env`와 프로젝트 설정을 기준으로 확인합니다.
- 문서·예제·커밋·로그에 실제 키나 웹훅 값을 넣지 않습니다.
- `EXPO_PUBLIC_` 값은 클라이언트 앱에 포함되는 값입니다. 서버 전용 비밀을 보호하는 저장 방식으로 설명하지 않습니다.
- 날씨 실패 시 화면에 오류 문구를 계속 남기지 않고 요약 영역을 숨기는 현재 동작을 유지합니다.

## 구독과 동기화 상태

한국 스토어의 Daylight Pro 책정가는 월 3,900원, 연 27,900원입니다.

설정의 Pro 화면은 RevenueCat의 현재 Offering에서 월간·연간 패키지와 현지화 가격을 조회하고, 구매·복원 결과의 `daylight_pro` 권한을 구독 상태에 반영합니다. 개발 빌드는 SDK가 활성화되며, 배포 빌드는 `EXPO_PUBLIC_REVENUECAT_ENABLED=true`를 명시해야 활성화됩니다. 개발·배포 모두 플랫폼별 실제 SDK 키(iOS `appl_`, Android `goog_`)를 사용하며 Test Store 키와 개발용 폴백은 사용하지 않습니다. 테스트는 스토어 Sandbox 구매·복원으로 진행합니다. RevenueCat은 로그인 없이 익명 고객 ID를 관리하고, 유료 다운로드 서버는 Apple 구매 증명을 검증합니다. 제품 소개의 명칭은 **Daylight Pro**입니다. 기존 구독자의 `yourday_pro` 권한도 인정합니다.

유료 일러스트 팩·장식과 유료 필름 적용·저장·공유에는 Pro 권한 처리가 연결되어 있습니다. 일반 캘린더와 무료 필름·수동 보정은 무료입니다. 정확한 혜택은 [현재 기능](current-product.md), `featureFlags.ts`와 해당 기능 코드를 함께 확인합니다. 코드 연결 여부와 실제 스토어 판매·결제 검증은 별개이며, 구매·취소·복원·만료는 스토어 샌드박스에서 확인합니다.

Google Drive 날짜별 백업·복구는 수동 동작이며 실시간 기기 간 동기화와 구분합니다. 범위와 실패 복원 정책은 [백업 문서](../google-drive-backup.md)를 따릅니다. 과거 iCloud/CloudKit 로드맵을 현재 확정 사양으로 사용하지 않습니다.

## 언어

앱 UI는 `src/shared/lib/i18n/model/locale.ts`의 `ko`, `en`, `ja`, `zh-TW`를 기준으로 합니다. 공지의 서버 스키마와 앱의 전체 지원 언어는 동일하지 않습니다. 현재 공지 locale은 `ko`, `en`, `ja`이며, 번체 중국어 앱에서 공지는 영어로 폴백합니다. 변경 시 서버 스키마와 클라이언트 처리를 함께 확인합니다.

### 구독 플랜 변경

구독 중에도 설정의 Pro 항목은 앱의 Pro 화면을 엽니다. 활성 권한의 상품과 현재 Offering을 비교해 현재 플랜을 표시하고, `expirationDate`와 `willRenew`로 다음 갱신일 또는 이용 종료일을 표시합니다. 플랜 변경 버튼은 구매 스토어의 `managementURL`로 연결하며 iOS는 URL이 없으면 네이티브 구독 관리 시트, Google Play는 구독 관리 페이지로 연결합니다. 앱 복귀 및 관리 화면 종료 시 고객 정보를 다시 조회합니다. 화면에서 연간을 선택한 것만으로 구독 상태를 변경하지 않으며 기존 구독자의 추가 신규 구매를 차단합니다.

Test Store 구독에는 전용 안내를 표시합니다. 실제 월간·연간 전환 시점과 예약 변경은 App Store/Google Play 샌드박스에서 검증해야 합니다. iOS 판매 준비 시 두 상품을 같은 구독 그룹·동일 서비스 등급으로 설정하고 양방향 전환을 확인합니다. 다음 플랜·적용일은 스토어 관리 화면에서 확인하도록 안내하며 앱은 현재 확인된 활성 플랜을 표시합니다.
