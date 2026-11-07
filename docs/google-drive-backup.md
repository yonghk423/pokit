# Google Drive 날짜별 백업

수동 백업만 제공한다. 사용자 Google Drive의 앱 전용 공간(appDataFolder)에 이미지 원본과 JSON 매니페스트를 저장한다. 일반 Drive 파일을 읽는 권한은 요청하지 않는다. 매니페스트 업로드가 끝난 백업만 목록에 노출한다. 이전 백업은 삭제하지 않는다. 연결 해제도 백업을 삭제하지 않는다.

## Google Cloud 설정

1. 하나의 Google Cloud 프로젝트에서 Google Drive API를 활성화한다.
2. OAuth 동의 화면을 설정하고 `https://www.googleapis.com/auth/drive.appdata` 권한을 등록한다. 테스트 상태라면 테스트 계정을 추가한다.
3. iOS OAuth 클라이언트를 생성한다. Bundle ID는 `com.yonghee.pokit`이다.
4. Android OAuth 클라이언트를 생성하고 실제 패키지명과 개발/배포 서명 SHA-1을 각각 등록한다. Play App Signing 서명도 포함한다.
5. 필요 시 Web OAuth 클라이언트도 생성한다. 클라이언트 시크릿은 앱에 넣지 않는다.
6. `.env.local` 또는 빌드 환경에 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`를 설정한다.
7. `npx expo prebuild`로 네이티브 Google 로그인 플러그인을 반영하고 iOS/Android 앱을 다시 빌드한다. 기존 네이티브 수정 사항은 먼저 검토한다. Expo Go는 지원하지 않는다.

`app.config.ts`는 iOS 클라이언트 ID로 URL scheme을 생성한다. 실제 기기에서 연결 → 날짜 백업 → 다른 기기에서 복구까지 확인해야 한다. pokit-dc0f7 프로젝트의 OAuth 동의 화면과 iOS·Android 개발용 클라이언트를 등록했다. 실제 계정 왕복 검증 결과는 아래 진행 상태를 참고한다.

## 현재 데이터 범위

- 생성 이미지 갤러리: 생성 날짜별 원본과 제목·메모
- 날짜 키를 가진 만화 장면(모든 캐릭터)
- 일기: 생성한 날짜를 기준으로 전체 장면과 원본 이미지 포함
- 퍼즐: 생성한 날짜를 기준으로 진행 상황과 이미지 포함
- 날짜별 통계, 메모, 예약 루틴 배정
- 선택 날짜의 day plan. 현재 활성 계획이 다른 날짜이면 별도 날짜 아카이브에 보존한다. 이 아카이브를 과거 계획 화면에서 조회하는 UI는 아직 없다.

사용자 정의 루틴 카탈로그·그룹·카테고리/블록 설정·시작 시각은 날짜별 기록과 함께 연결 정보로 포함한다. 기존 정의와 충돌하는 사용자 루틴과 그룹은 별도 ID로 가져오고 해당 날짜의 참조도 함께 변경한다. 앱 표시 설정(글꼴·크기·테마·레이아웃)은 백업에 포함하며 복구 화면에서 사용자가 선택하면 적용한다. 기기별 알림 예약 ID와 로그인 토큰은 포함하지 않는다. 고정 루틴 세트 전체와 다른 날짜의 전역 목표까지 교체하지 않는다. 일기 생성 시각은 기기의 현지 날짜로 분류한다. 다른 시간대의 기기 간 분류 정책은 추가 정의가 필요하다.

## 복구와 실패

원본 이미지 파일이 없으면 백업을 완료 처리하지 않는다. 업로드 크기를 검증한다. 복구는 매니페스트와 날짜를 검증하고 이미지 전체를 다운로드해 크기를 확인한 뒤 날짜별 기록을 합친다. 다른 날짜의 기록 ID가 충돌하면 중단한다. 이미지 다운로드 실패 시 기존 기록을 변경하지 않는다.

복구 직전 원본 값은 기기 rollback.json과 로컬 rollback 키에 남긴다. 디스크 저장값 검증 실패 시 이전 값으로 되돌린다. 복구 작업 중 앱이 종료되면 다음 시작 시 pending 저널에서 기존 값을 복원한다.

## 공식 문서

- https://react-native-google-signin.github.io/docs/original
- https://developers.google.com/workspace/drive/api/guides/appdata
- https://developers.google.com/workspace/drive/api/guides/manage-uploads


## 이번 진행 상태

- `pokit-dc0f7`의 Google Auth Platform 앱 등록 완료(Testing / External).
- iOS OAuth 클라이언트 등록, `.env.local`의 공개 클라이언트 ID와 네이티브 URL scheme 반영.
- Android 개발용 OAuth 클라이언트 등록(`com.yonghee.pokit`, 저장소의 debug.keystore 서명). Play 배포에는 Play App Signing SHA-1용 클라이언트를 추가해야 한다.
- Drive API 활성화, 요청 권한은 `drive.appdata`만 등록.
- 사용자가 승인한 개발자 Google 계정을 테스트 사용자로 등록.
- CocoaPods 설치 완료. CDN HTTP/2 오류가 있어 이번 설치 과정에 한해 HTTP/1.1 전송을 사용했고 TLS 검증은 유지했다. 이 임시 처리 파일은 저장소에 포함하지 않는다.
- iOS 시뮬레이터 Debug 빌드 성공 및 iPhone 17에 설치. 포트 8082 개발 서버로 앱 실행 확인.
- 설정의 Google Drive 연결 버튼 → 시스템 로그인 확인 → accounts.google.com의 YOUR DAY 로그인 화면까지 전환 확인.
- 실제 Google 계정 로그인과 앱 전용 데이터 접근 동의 완료.
- 2026-11-05 생성 이미지 3장 및 연결 기록을 실제 Drive에 업로드하고, 같은 백업을 내려받아 복구 완료. 복구 완료 후 앱 재시작과 계정 연결 유지 확인.
- 원본 3장과 복구 파일 3장의 SHA-256 집합 일치, 복구 파일 존재 확인. 다른 날짜의 일기 데이터 변경 없음. 삭제된 저장소 키 없음. pending 복구 저널 해제 확인.
- 최초 서명 없는 시뮬레이터 빌드에서는 Google Keychain 저장 오류 발생. `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-`로 서명된 시뮬레이터 빌드를 다시 설치해 해결. Google 로그인 검증에는 서명을 끄면 안 된다.
- OAuth 콜백은 Expo Router에서 활성 화면을 바꾸지 않도록 처리하고, 콜드 시작 콜백은 설정으로 보낸다. 인증 코드·토큰을 화면 경로나 로그에 남기지 않는다.
- 이번 왕복 검증은 같은 iOS 시뮬레이터에서 수행했다. Android 실기기 및 기기 간 이전은 별도 검증이 필요하다.
- 표시 설정 선택 복구·기존 사용자 루틴 충돌 보존·연결 ID 재매핑·이미지 경로 재구성 관련 테스트 포함 30개 통과.
