# 로그인 없는 구매와 유료 다운로드

구매·복원은 RevenueCat SDK 익명 ID를 사용한다. 기존 Supabase 기반 identified ID가 캐시에 있으면 첫 초기화에서 SDK logOut으로 익명 ID로 전환한다. 유료 고객이 없는 시점의 전환이며, 기존 테스트 지급 권한을 이전하지 않는다. 실제 과거 구매가 있다면 사용자가 구매 복원 버튼을 눌러야 한다. 매 실행마다 익명 ID를 재생성하지 않는다.

다운로드 요청에는 StoreKit currentEntitlements에서 기기 검증이 끝난 JWS만 포함한다. 서버는 Apple 공식 SignedDataVerifier와 고정 Apple Root CA G3로 서명·인증서·앱·환경을 검증한다. 유효 상품(monthly/yearly/lifetime), 만료·revocation·upgrade 여부를 확인하고 App Store Server API getTransactionInfo로 최신 거래를 조회하여 다시 검증한 뒤 저장소 서명 URL을 발급한다. 클라이언트의 Pro 플래그나 RevenueCat ID는 신뢰하지 않는다. JWS는 로그에 기록하지 않는다. 서명 구매 정보는 bearer proof이므로 유출되면 만료/취소 전까지 재사용될 수 있다.

## 서버 설정과 배포

서버 전용 secret: APPLE_IAP_PRIVATE_KEY (In-App Purchase .p8), APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID. App Store Connect에서 발급한 IAP 키를 사용하며 앱의 EXPO_PUBLIC 환경변수에 넣지 않는다. bundle ID com.yonghee.pokit, Apple app ID 6762331629는 코드로 고정했다.

일반 함수 진입점은 Production, 이름이 `-sandbox`로 끝나는 별도 함수 진입점은 Sandbox 검증을 명시적으로 주입한다. 요청 본문이나 공유 secret의 환경 값으로 이 정책을 바꿀 수 없다. 운영은 Production을 먼저 검증하고, Apple 인증서·서명·앱 ID 검증을 통과한 환경 불일치에만 Sandbox 검증을 재시도해 App Review 구매를 지원한다. Sandbox에서도 서명과 최신 거래를 검증한다. Xcode/Test Store 증명은 허용하지 않는다. 비밀키 미설정·Apple 장애는 503으로 거부한다. 네 함수(calendar-store, calendar-theme, calendar-artwork-download, character-pack)를 앱 업데이트와 맞춰 배포해야 한다. 기존 앱의 JWT-only 유료 요청은 새 서버에서 거부된다. 무료 콘텐츠는 계정 없이 다운로드 가능하다. Storage 버킷을 public으로 변경하지 않는다.

네이티브 로컬 Expo 모듈을 추가했으므로 pod install 및 새 iOS 빌드가 필요하다. OTA만 배포하면 안 된다. Android 유료 다운로드 증명은 이번 iOS 구현 범위에 포함되지 않으며 Apple 증명이 없어 거부된다. 기존 AI 기능의 별도 Supabase 인증은 구독과 무관하게 유지한다.

## 출시 전 실기기 검증

별도 Sandbox 함수에 연결한 TestFlight 빌드 설치 → Sandbox 구매 → Pro 및 유료 파일 확인 → 같은 App Store 테스트 계정의 두 번째 기기에서 복원 → 양쪽 Pro 및 다운로드 확인. 만료·환불 후 신규 다운로드 거부도 확인한다. 로컬 mock 테스트는 Apple 실서버 구매 테스트를 대체하지 않는다.

## 2026-11-21 확인 상태

RevenueCat의 In-app purchase key와 App Store Connect API key는 모두 Valid credentials이며 서로 다른 키다. 복원 정책은 Transfer to new App User ID이다. 기존 RevenueCat 키는 유지하고, 사용자가 새로 발급한 다운로드 서버용 IAP 키를 운영 Supabase의 APPLE_IAP_* 네 설정에 등록했다. 원본과 저장된 값의 SHA-256 digest를 비교하여 줄바꿈을 포함한 일치를 확인했다. 키 원문은 저장소나 앱에 넣지 않았다. Apple Production 서버의 거래 조회에서 새 키가 인증 오류 없이 transaction-not-found(4040010)를 반환하는 것을 확인했다. 이는 실제 구매 승인 테스트를 의미하지 않는다.

운영 프로젝트 wvvtyaxsedpqiscogrwk에 calendar-store, calendar-theme, calendar-artwork-download, character-pack 네 함수를 배포했다. `node scripts/verify-subscription-downloads.cjs`의 운영 HTTP 검사 15개가 통과했다. 네 유료 경로는 증명 누락·위조·클라이언트 Pro 주장 요청을 모두 403으로 거부했고, 무료 캘린더와 캐릭터 미리보기는 Supabase 사용자 세션 없이 정상 응답했다. 무료 이미지의 서명 URL에서 실제 파일 다운로드도 확인했다.

공개 App Store 배포 및 실기기 구매·복원 검증은 아직 완료하지 않았다. 테스트 빌드 2.3.1(139)는 TestFlight 내부 테스트용으로 배포했다. 당시에는 Production 전용이었으며, 현재 App Review 지원은 아래 최신 기록을 따른다. TestFlight 테스트용 `-sandbox` 함수 네 개를 별도로 배포했고, 운영과 Sandbox 각각 실제 HTTP 검사 15개가 통과했다. 실제 유효 구매 증명으로 유료 파일을 받는 성공 경로, 두 기기의 복원, 실제 만료·환불 전파는 출시 전 실기기 검증 항목으로 남아 있다.

관련 Jest 11개 suite / 84개 test, Deno 서버 오류 처리 2개 test 및 TypeScript 검사가 통과했다. 네 다운로드 함수의 Deno type check도 통과했다.

iOS Debug 시뮬레이터 전체 빌드(arm64, x86_64)가 통과했다. 첫 빌드의 React Native Debug 심볼 누락은 로컬 prebuilt 캐시를 동일 버전 0.86.3의 Debug 아카이브로 다시 추출해 해결했다. 이 캐시 복구는 앱 소스 변경이 아니다.


## TestFlight 구매 테스트 빌드

`eas build --platform ios --profile testflight`는 `EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT=Sandbox`를 앱에 포함한다. 구매는 같은 RevenueCat 앱의 실제 iOS SDK 키로 진행하며, 유료 다운로드만 `-sandbox` 함수로 연결한다. 개발자 ID 허용 목록이나 무료 Pro 지급은 사용하지 않는다. Sandbox 경로 역시 Apple 서명과 Sandbox 서버의 최신 거래를 검증해야 파일을 발급한다. 두 경로는 같은 저장소 파일을 제공한다. 운영은 검증된 심사 Sandbox 구매도 지원하고, Sandbox 전용 경로는 Production 구매로 전환하지 않는다.

운영 App Store 제출에는 반드시 `production` 프로필로 새로 빌드한다. Sandbox 고정 TestFlight 빌드를 공개 배포용으로 승격하지 않는다. App Review의 Sandbox 구매 지원은 서버에 반영하고 자동 검사 및 실제 Apple 서명 거래로 검증했다.

기기에서 확인할 순서:
1. TestFlight에서 새 빌드를 설치한다.
2. Pro 구매 후 Pro 상태와 유료 테마 다운로드·적용을 확인한다.
3. 두 번째 기기의 App Store 구매 계정이 같은지 확인하고 같은 TestFlight 빌드를 설치한다.
4. 앱의 구매 복원을 누른 후 두 기기 모두 Pro 상태와 새 유료 테마 다운로드를 확인한다.
5. 복원 확인을 위해 기존 앱을 삭제하지 않는다. 로컬 일기 데이터가 삭제될 수 있다.

TestFlight 구매에는 실제 요금이 청구되지 않는다. 이 문서의 자동 검사 성공은 실제 구매·복원 성공을 대신하지 않는다.


### 준비한 테스트 설치 파일

2026-11-21: Expo 월간 무료 iOS 빌드 한도 때문에 `eas build --platform ios --profile testflight --local`로 2.3.1(139)를 생성했다. Release 아카이브의 bundle ID, 버전, StoreKit 모듈 포함, Sandbox 경로 포함을 확인했다. `expo prebuild`는 실행하지 않았다. IPA는 `/private/tmp/daylight-testflight.ipa`에 있다. 기존 Team (Expo) 내부 그룹을 대상으로 TestFlight 제출을 완료했다. Apple build ID `c9f97d80-b0e7-4f5c-82cb-f3c5132ca51b`의 processingState=VALID, internalBuildState=IN_BETA_TESTING 및 내부 그룹 연결을 Apple API로 확인했다. Expo의 유료 changelog 기능은 사용하지 않았다.

실행한 추가 검증: 운영/Sandbox 실제 HTTP 검사 각 15개, 실제 핸들러의 권한/저장소 호출 순서 및 환경 주입 fixture 검사 30개, 클라이언트 경로·구매 정책 Jest 19개, TypeScript 및 Deno 8개 진입점 타입 검사.

## 실기기 검증 및 Edge Runtime 호환성 수정 (2026-11-21)

iPhone 16 Pro에 TestFlight 2.3.1(139)를 설치했다. 기존 Sandbox 연간 구독의
구매 복원 성공 메시지와 Pro 상태를 확인했다. 새 구독 결제는 실행하지 않았다.
처음 Pro 캘린더 다운로드는 403으로 실패했으며, 서버 로그에서 Supabase의
불완전한 Node X509Certificate 구현 및 jsonwebtoken EC 곡선 이름 불일치를 확인했다.

Apple 라이브러리 3.1.0의 검증기를 MIT 라이선스와 함께 고정 복사하고,
누락된 인증서 연산은 jsrsasign, ES256 JWS/API JWT 처리는 jose Web Crypto로
호환시켰다. 루트 신뢰 체인, Apple 인증서 OID, 유효기간, 온라인 OCSP,
앱 ID/환경, 최신 거래 조회와 환불/만료 정책은 유지한다.
자세한 변경 범위는 `supabase/functions/_shared/apple-verifier/README.md` 참조.
일시적인 OCSP 장애는 구독 없음(403) 대신 검증 불가(503)로 처리한다.

수정 후 같은 아이폰에서 Sunshine Yellow Pro 캘린더의 다운로드,
'적용 중' 표시, 실제 Diary 화면 렌더링을 확인했다.
운영 및 Sandbox 8개 함수에 호환성 수정본을 배포했다.
운영/Sandbox HTTP 검사 각 15개, 핸들러 fixture 검사 30개,
정책·클라이언트 Jest 20개, 인증서·Web Crypto·API 토큰 Deno 7개가 통과했다.
앱 TypeScript 검사도 통과했다.

이 결과는 한 기기의 기존 Sandbox 구매 복원 및 유료 다운로드 검증이다.
신규 구매, 두 기기 동시 사용/복원, 실제 환불·만료 전파, Production 실제 구매는
별도 실기기 검증이 필요하다. App Store 공개 배포는 실행하지 않았다.

추가 실기기 확인: Everyday Cinema Pro 일러스트 묶음은 화면에
'다운로드 완료 100/100'이 표시될 때까지 확인했다. 테스트 후 원래의
Cream Kitten 캘린더를 다시 적용하고 Diary 화면을 확인했다.
서버 로그에서도 Pro 캘린더 요청의 HTTP 200 응답을 확인했다.
최종 Deno 8개 함수 진입점 타입 검사 및 git diff --check가 통과했다.

### 두 기기 복원 실측 (2026-11-21)

Mac용 TestFlight를 설치하고 동일 빌드 2.3.1(139)의 iPad용 앱을 Apple Silicon
Mac에서 실행했다. 초기에는 Pro가 아니었고, 구매 복원 후 성공 메시지 및
Pro 구독 관리 표시를 확인했다. Mac에서 Lemon Slice 유료 캘린더를 새로
다운로드·적용했다. 이후 iPhone 16 Pro에서 설정 화면의 Pro 이용 중 표시와
Kissing Shadows 유료 캘린더 신규 다운로드·적용을 확인했다. 양쪽 모두
Cream Kitten 캘린더로 원복했다. 앱 삭제 및 로컬 데이터 초기화는 하지 않았다.

현재 복원된 Sandbox 연간 구독의 다음 갱신 시각은 2026-11-22 15:27:18 KST다.
일반 Apple 구독 관리에는 별도의 Production 월간 구독이 표시되어 이 화면에서는
취소/환불을 실행하지 않았다. 테스트 빌드의 Sandbox 구매 검증 화면은
EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT=Sandbox일 때만 노출하고, 환불 요청 직전
RevenueCat의 최신 entitlement.isSandbox=true를 확인한다.

### Sandbox 환불 검증 진행 (빌드 140)

Sandbox 전용 `purchase-sandbox` 화면을 추가했다. 최신 RevenueCat 구독 상태
새로고침, Sandbox 구독만 허용하는 환불 요청, 캐시 파일을 사용하지 않는
유료 다운로드 권한 요청을 제공한다. 설정 메뉴와 화면 모두 Sandbox 빌드로
제한한다. 새 화면의 TypeScript 및 ESLint 검사가 통과했다.
로컬 EAS Release 빌드 140 및 TestFlight 내부 제출을 완료했으며 Apple의
VALID / IN_BETA_TESTING / 내부 그룹 할당 상태를 확인했다. 양쪽 기기에 설치했다.

아이폰의 Apple 환불 시트는 '연결할 수 없음'을 반복 반환했다.
Mac에서는 사용자 Apple 재로그인 후 '환불 요청 [TestFlight]' 시트가 열렸다.
자동 승인 검토가 에이전트의 최종 환불 제출을 거부하여 사용자가 직접 제출했다.
이후 '요청이 제출되었습니다' 및 Sandbox 요청 자동 승인 안내를 확인했다.

제출 이후 Apple Sandbox 거래 조회에는 아직 revocationDate가 없고,
아이폰의 최신 CustomerInfo는 pro=true, sandbox=true이며 신규 다운로드도
allowed=true였다. 따라서 환불 후 권한 회수 테스트가 통과했다고 보고하지 않는다.
App Store Connect에서 5분 갱신으로 설정된 Sandbox 테스트 계정 1개를 확인했다.
빠른 자연 만료 검증에는 해당 계정 로그인과 별도 테스트 구매가 필요하다.

Apple 반영 추가 확인: 2026-11-21 17:34:24 KST에 기존 연간 Sandbox 거래의
revocationDate가 기록됐고 revocationReason=0을 확인했다. 환불 제출 직후에는
반영 지연이 있었으며, 최종 Apple 거래 상태로 환불 반영을 확인했다.
기존 Sandbox 테스트 계정에 로그인하고 미디어 구매 계정을 잠시 로그아웃한 뒤,
Sandbox 구독 목록의 정상 응답과 5분 갱신 설정을 확인했다.
월간 테스트 구독 재시작 화면까지 준비했고, 최종 갱신 구매는 사용자에게 맡겼다.

환불 후 실제 서버 거부 검증: Apple Sandbox 서버가 반환한 환불 완료 연간
거래 JWS를 calendar-store-sandbox에 전송하여 HTTP 403 /
subscription_required를 확인했다. 키·거래 JWS·서명 URL은 출력하지 않았다.
이는 mock이 아닌 실제 Apple 서명/환불 거래에 대한 배포 서버 테스트다.

기존 Sandbox 계정의 월간 구독을 사용자가 다시 구입했고 자동 갱신을 중지했다.
아이폰에서 최신 CustomerInfo의 pro=true / sandbox=true 및
expires=2026-11-21T08:44:14Z, 신규 다운로드 allowed=true를 확인했다.
자연 만료 시각은 2026-11-21 17:44:14 KST다.

갱신 중지 정정: 처음 취소 확인창 전환 중 클릭이 실제 취소로 적용되지 않아
월간 구독이 한 번 더 갱신됐다. 최신 만료 시각은 17:49:14 KST로 바뀌었다.
17:46경 Apple Sandbox 화면에서 '구독을 취소했습니다'를 확인한 후에만
자동 갱신 중지가 적용된 것으로 판단했다. 앞선 17:44 만료 예상은 폐기한다.

### 최종 실측 결과 (2026-11-21 17:51 KST)

- 두 기기: 동일 TestFlight 빌드를 Mac과 iPhone 16 Pro에서 사용해 구매 복원,
  양쪽 Pro 유지 및 서로 다른 신규 유료 캘린더 다운로드·적용을 확인했다.
- 환불: 사용자가 제출한 TestFlight 연간 구독 환불이 Apple 거래의
  revocationDate에 반영됐고, 실제 환불 JWS의 다운로드 요청이 배포 서버에서
  HTTP 403 / subscription_required로 차단됐다.
- 자연 만료: Sandbox 월간 구독의 취소 적용 후 17:49:14 KST가 지나자
  아이폰의 강제 새로고침 결과가 pro=false로 바뀌었다. 신규 다운로드 요청도
  allowed=false / subscription_required로 바뀌었다. 만료 전에는
  pro=true / allowed=true였으므로 같은 실제 계정의 전후 전환을 확인했다.
- 복구: 아이폰의 미디어 및 구입 항목을 기존 일반 Apple 계정으로 다시
  로그인했고, 설정에서 구독 항목 복귀 및 구매 계정의 '설정' 표시 소멸을
  확인했다. iCloud 계정은 그대로 유지했다. 양쪽 캘린더는 Cream Kitten으로
  복구했다.
- 테스트 빌드는 2.3.1(140)이며 App Store 공개 배포는 실행하지 않았다.
  Production 실제 결제 환불과 Production 거래 만료는 이번 Sandbox 테스트
  범위에 포함하지 않는다. 앞선 '미확인' 상태는 당시 진행 기록이다.


## App Review 구매 검증 지원 (2026-11-21)

공개용 앱이 사용하는 일반 다운로드 함수는 Production 서명 검증을 먼저 시도한다.
고정된 Apple 루트 인증서, 체인, OID, 유효기간, 온라인 OCSP, ES256 서명과 bundleId
검증 이후 Apple 검증기가 INVALID_ENVIRONMENT를 반환할 때만 Sandbox 검증기로
다시 검증한다. 이 판별은 공식 검증기 VerificationException 인스턴스로 제한한다.
클라이언트의 환경 주장, 서명되지 않은 payload 또는 단순 Production 실패만으로
Sandbox로 전환하지 않는다. Sandbox 거래도 Sandbox API에서 최신 거래를 조회하고
재검증해 ID 일치·유효기간·환불 상태를 확인한다. 정상 Production 구매는
Production API에 머문다. Sandbox 전용 함수는 반대 방향 fallback을 하지 않는다.

추가 검증: 유효 심사 구매의 허용, 잘못된 서명·앱·환경·만료·환불·과다 입력 거부,
최신 거래의 환경 불일치 및 일시 장애 처리를 포함한 정책/클라이언트 Jest 34개,
기존 핸들러 권한 검사 30개, Deno 인증서/서명/API 검사 7개, TypeScript 및 8개
서버 진입점 타입 검사가 통과했다. 실제 Apple의 환불된 Sandbox JWS에서도
Production 검증의 환경 불일치 → Sandbox 서명 재검증 → 환불로 거부되는
경로를 확인했다. 같은 거래의 환경 payload만 변조하면 Sandbox 재시도 없이
서명 단계에서 거절됐다. 유효 기간 내 구매 허용은 주입 fixture 회귀 검사이며,
실제 Apple 심사 세션에서 결제를 수행한 것은 아니다.

서버 8개에 배포했다. 앱은 production 프로필로 새로 빌드해 일반 함수로 연결한다.
TestFlight 전용 빌드 140의 테스트 메뉴를 공개 배포하지 않는다.

배포 후 확인: 일반 함수 15개 + Sandbox 함수 15개 실제 HTTP 검사 모두 통과했다.
Apple이 실제 환불 처리한 Sandbox JWS를 일반 calendar-store 함수에도 전송해
403 / subscription_required를 확인했다. 실제 Apple 심사 구매의 새 활성 거래를
추가로 발생시킨 것은 아니며, 허용 경로는 fixture 검사, 서명 기반 환경 판별은
실제 Apple JWS 검사로 각각 확인했다. 공개 심사 제출은 별도 production 빌드로 진행한다.
