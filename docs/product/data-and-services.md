# 데이터와 외부 서비스

확인일: 2026-10-27

## 사용자 기록

일기·장면·할 일·메모와 설정은 로컬 저장 경로를 기준으로 확인합니다.

- 공용 저장 접근: `src/shared/lib/storage/localStorageClient.ts`
- 일기와 장면: `src/pages/day-plan/lib/heroDiaryStorage.ts`, `heroDayStorage.ts`
- 메이트와 실행 상태: `src/entities/day-plan`, `src/shared/lib/storage`

기존 `pokit:*` 키와 일기·장면 ID는 사용자 기록과 연결됩니다. 제품 이름이나 문서 변경을 이유로 바꾸거나 초기화하지 않습니다. 새 일기 이름은 해당 일기에 저장하며 다른 일기나 새 초안에 전달하지 않습니다.

## 외부 서비스의 역할

| 서비스 | 역할 | 확인 위치 |
|---|---|---|
| OpenWeather | 현재 위치를 바탕으로 날씨 조회 | `src/pages/day-plan/ui/WeatherSummary.tsx` |
| Supabase | 앱 공지 등 해당 구현에서 명시한 원격 콘텐츠 | `src/entities/announcement/api/fetchAnnouncements.ts` |
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

확인 시점에 `REVENUECAT_ENABLED`와 설정 화면의 `SHOW_POKIT_PRO_SETTINGS`는 모두 `false`입니다. SDK 코드가 있다는 이유로 구독을 판매 중이라고 설명하지 않습니다.

개인 일기의 기기 간 iCloud/CloudKit 동기화가 제공된다고 확인할 수 있는 구현은 이번 문서 점검에서 찾지 못했습니다. 이전의 구독·iCloud 로드맵은 현재 확정 사양으로 사용하지 않습니다. 동기화를 다시 기획하면 대상 데이터, 복구, 충돌 처리, 기기 간 검증 결과를 먼저 명시합니다.

## 언어

앱 UI는 `src/shared/lib/i18n/model/locale.ts`의 `ko`, `en`, `ja`, `zh-TW`를 기준으로 합니다. 공지의 서버 스키마와 앱의 전체 지원 언어는 동일하지 않습니다. 현재 공지 locale은 `ko`, `en`, `ja`이며, 번체 중국어 앱에서 공지는 영어로 폴백합니다. 변경 시 서버 스키마와 클라이언트 처리를 함께 확인합니다.
