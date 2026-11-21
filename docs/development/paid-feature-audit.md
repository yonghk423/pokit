# Daylight 유료 기능 검증

검증일: 2026-11-21. 진행 중이며 **전체 실기기 검증 완료 보고가 아니다**.

## 검증 환경

- 현재 iPhone 16 Pro 설치본: 2.3.1 (135), `builtByDeveloper: true`.
- TestFlight 배포 빌드: 2.3.1 (140). 기기에서는 설치 버튼이 표시됐다.
- 사용자가 현재 설치본에서 진단하라고 요청했으므로 TestFlight 교체와 앱 데이터 백업은 수행하지 않았다.
- 새 구독 구매는 Apple Sandbox 테스트 전용 화면(청구 없음)으로 진행했으나 앱 오류로 실패했다.
- 기기의 RevenueCat 상세 로그: `Apple In-App Purchase Key is invalid or not present`.
- RevenueCat 앱 설정의 기존 IAP 키 6972DQ4542를 재검증한 결과 `Credentials need attention`: 키가 유효하지 않거나 Bundle ID와 호환되지 않음.
- 새 IAP 키 6SFHZR96WP는 기존 다운로드 검증 서버에 설정되어 있다. RevenueCat에 사용자 직접 새 파일 입력 후 Key ID/Issuer ID 일치 및 `Valid credentials`를 확인했다. 사용자가 Save changes를 누른 뒤 저장된 키 재검증도 `Valid credentials`로 통과했다. 현재 개발 앱에서 구매 복원 성공 후 Pro 활성화와 유료 캘린더 다운로드가 정상 동작했다. App Store Connect API 키와 IAP 키는 서로 다른 설정이다.

## 기능별 범위와 증거

| 기능 | 자동 검사 | 이번 실기기 상태 |
| --- | --- | --- |
| 구매·복원·만료·환불 | RevenueCat 상태/구매 정책/서버 검증 검사. 이전 실제 Apple 만료·환불 JWS 거부 확인은 별도 구독 문서 참고 | 현재 개발 빌드 신규 구매에서 IAP 키 오류 발견. 수정 후 재검증 필요 |
| 사진 캘린더 5종 | 전체 서버 항목의 활성/거부/검증 장애 경로 검사, 관련 운영 파일 존재 확인 | 만료 상태의 Lemon Slice 선택이 Pro 안내로 이동함. 이전 TF 실제 다운로드와 이번 검사는 구분 |
| 다이어리 꾸미기 67종 | 모든 ID의 미다운로드 적용 방지, Pro 적용, 만료 후 숨김/선택 보존, 재활성화 복원, 해제 | 활성 구독 확보 후 각 꾸미기 슬롯의 다운로드·적용·화면 확인 필요 |
| 기본 카메라 5종·휴지통 12종 | 모든 종류의 만료 시 무료 대체·선택 보존·재활성화 검사 | 활성 구독 후 유료 항목 실제 적용 필요 |
| 필름 16종(유료 12종) | 모든 필름 × 무료/Pro × 저장/공유 권한 검사. 기존 효과/미리보기/내보내기 렌더 준비 검사 포함 | 실제 픽셀 출력·사진 저장·공유 시트 확인 필요 |
| 다이어리 글자색·배경색 | Pro 변경 저장, 만료 후 열린 선택기 콜백 쓰기 차단, 무료 Pro 안내 검사 | 활성 구독 후 실제 편집·재열기 확인 필요 |
| 일러스트 아이콘 선택기 | 무료 진입 차단·Pro 펼침 검사, character-pack 다운로드 서버 검사 | 실제 선택·삽입·저장·재열기 확인 필요 |
| 일러스트 캘린더 | 서버의 6개 유료 컬렉션, 총 320개 장면 전체 권한 경로 검사 | 활성 구독 후 각 컬렉션 실제 다운로드·적용 필요 |
| Apple 캘린더 | 무료 API 차단, 일정 로딩/표시 검사 | 무료 Manage iPhone calendars가 Pro 안내로 이동함. Pro 권한 요청·선택·일정 표시 확인 필요 |
| Google 캘린더·Tasks | 무료 SDK/일정/Tasks 접근 차단 및 API 단위 검사 | 무료 Connect Google Calendar가 Pro 안내로 이동함. Pro OAuth 및 실제 일정/Tasks 표시 확인 필요 |

AI 업그레이드는 현재 feature flag가 꺼져 있어 현행 유료 서비스 범위에 포함하지 않는다. 폐기된 캘린더 디자인도 재등록하지 않는다.

## 실행 결과

- 최종 관련 Jest **27 suites / 354 tests** 통과. 꾸미기·카메라·휴지통 모델은 84 tests 포함.
- 최종 `npx tsc --noEmit` 및 `git diff --check` 통과.
- `node scripts/verify-subscription-server.cjs`: **2,448** 권한 검사 통과. 서버 catalog의 꾸미기 67개, 기타 유료 스토어 16개, 일러스트 장면 320개를 Production/Sandbox 각각 활성·거부·검증 장애 시나리오로 검사한다. 기존 대표 4경로와 무료 경로 검사도 유지했다.
- `node scripts/verify-subscription-server.cjs --asset-manifest /private/tmp/daylight-paid-asset-paths.json`은 실제 핸들러가 서명하는 파일 경로를 수집한다. 저장소 존재 확인과는 별도이다.
- 2026-11-21 20:08 KST, 운영 Storage의 관련 경로와 실제 character-pack 목록을 읽기 전용 HEAD로 조회: **520 / 520** 존재·100바이트 초과, 실패 0. 관리자 키는 프로세스 메모리에서만 사용했으며 출력·파일 저장하지 않았다. 이는 파일 존재/크기 확인이며 Pro 구매 권한 또는 이미지 시각 품질 검증을 대신하지 않는다.
- character-pack fixture 파일명 `p7-1.webp`는 실제 상품이 아니므로 실제 Storage 목록으로 치환해 조회했다.

## 테스트 정비

- HeroCanvasNote: WebView 전환·idle loader·저장소 null 응답·최신 expandedTop 좌표에 맞춰 오래된 테스트 설정 수정. 색/배경색/아이콘 Pro 게이트 검사 추가.
- HeroCalendarDesigns: 폐기된 emerald 대신 현행 cream-kitten을 검증하고 artwork/무료 종이 설치 fixture를 명시.
- DiaryThemeGallery: 현행 고해상도 v4 캐시 키에 맞게 fixture 수정.
- HeroPolaroidEditor: 모든 필름의 무료/Pro 저장·공유 행렬 추가.
- paidDiaryAccess: 꾸미기 67종과 기본 카메라/휴지통 전체 만료·복원 검사 추가.

## 완료에 필요한 후속 확인

1. RevenueCat 새 IAP 키 저장 후 유효성 재검증.
2. 현재 개발 앱에서 구매 재시도 후 Pro 권한·실제 서버 다운로드 확인.
3. 위 표의 Pro 실기기 항목 완료. 새로운 민감 권한/OAuth 동의 또는 구매 최종 승인 단계만 사용자에게 직접 요청한다.
4. 검사 중 기능 수정이 발생하면 관련 검사와 타입 검사 재실행. 모든 결과를 자동/실기기로 나누어 최종 기록한다.

## 20:22 KST 실기기 갱신

- RevenueCat IAP 새 키 저장 및 재검증 성공. 개발 앱 135번을 교체하지 않고 Restore purchases 성공.
- 유료 사진 캘린더 5종 모두 Applied 상태 확인. Sunshine Yellow/Kissing Shadows/Daylight Cassette/Mint Sneakers는 Downloading → Applied 확인, Lemon Slice는 복원 후 Applied. Mint Sneakers 메인 달력 배경과 사진 렌더 확인.
- Faded memories Pro 필름 실제 미리보기 적용, 공유 시트에 PNG 이미지 1.7MB 생성 확인 후 외부 전송 없이 닫음. 사진 추가 전용 권한 허용 후 Saved to Photos 성공 알림 확인.
- 2026-12-01 글 편집에서 파란 글자색·노란 배경색·책 일러스트 인라인 삽입 각각 확인. Done 후 11/30으로 이동했다가 12/01 재열기에서도 모두 유지. 이 날짜의 테스트 색상/책 아이콘은 현재 남아 있다(기존 본문은 대체하지 않음).
- 위 실기기 결과는 대표 필름/아이콘 확인이며 모든 필름의 실제 GPU 출력 또는 모든 아이콘 삽입 확인을 뜻하지 않는다. 전체 필름 권한은 자동 검사로 별도 확인했다.

## 20:32 KST 실기기 진행

- 추가 다운로드 → Applied 확인: Clover Clip, Clover Bin(빈/가득 참 에셋), Letter Camera, Letter Wall Decor, Strawberry Embroidery 사진틀(분할 에셋), Clover Tab Decor, Cocoa Cat Date Label, Bunny Ears Bookmark.
- 하단 Store 탭의 Clover 장식 실제 렌더 확인.
- Everyday Cinema는 Downloaded 100/100 완료 확인. Warm Sepia 100개, City Pop Retro 50개, Textured Watercolor 50개는 다운로드 시작 및 진행 수치 확인했으며 **완료 확인은 아직 안 됨**. 다운로드 작업은 pack별 전역 작업으로 유지되어 분류 이동 시 취소하지 않는다.
- 계절 팩 목록 및 꾸미기 분류 목록 일부에서 미러링 scroll/drag 입력이 이동을 만들지 않아 사용자에게 기기 자체 스크롤 여부 확인 요청 중. 이것만으로 앱 결함이라고 단정하지 않았다.
- 아직 미확인: 꾸미기 memo/corner/pin/charm/pocket 슬롯 대표 실기기 적용, 기본 유료 카메라/휴지통/집게, 모든 일러스트 팩 완료 및 실제 날짜 적용, Apple/Google 연동 Pro 경로.

- 20:35 KST: noteIllustrationSources가 합치는 control/routine/generated 소스의 이미지 파일 257개 전체를 Pillow verify로 검사: 257/257 성공, 누락·디코딩 실패 0. UI에서 257개 전부를 삽입했다는 뜻은 아니다.
- 사용자가 직접 기기에서 Seasons 목록 및 작은 꾸미기 분류 영역 스크롤이 가능함을 확인하고 아래 항목을 표시했다. 앱 스크롤 결함으로 판정하지 않는다. 봄/여름/가을/겨울 팩 5개씩 전체 다운로드도 시작했다.

## 사용자 범위 조정

사용자가 “다이어리는 넘어가줘 내가 확인했어”라고 지시했다. 이후 다이어리 검사는 사용자 확인 완료로 표시하고 에이전트 실기기 미확인 범위와 구분한다. 메모지/사진 코너/핀/참/주머니의 추가 수동 검사는 생략한다. 분류 펼치기 버튼 보완 시도는 최종 변경에 포함하지 않는다. 남은 범위는 일러스트 팩 다운로드·적용, Apple/Google 캘린더 연동이다.

- 추가 cityCalendarPack 단위 검사 7개 통과. 비활성 legacy 캐릭터 갤러리 검사도 탐색 실행했으나 기존 SDK Jest 설정 및 폐기 캐릭터 수/이름 수정 UI에 대한 오래된 기대값 때문에 실패했다. 현재 활성 Pro 기능의 통과 수에 합산하지 않는다. 이 별도 갤러리 테스트를 억지로 통과시키기 위한 변경은 포함하지 않는다.

## 20:48 KST Apple 연동

- 사용자에게 iOS 캘린더 전체 접근 범위를 설명하고 허용 동의를 받음. Settings > Daylight > 캘린더 > 전체 접근 및 OS 확인창 허용 완료.
- 권한 변경으로 개발 앱 재시작. 설치 교체 없이 기존 Expo 서버(현재 프로젝트, 8081) 최근 연결을 선택해 복구. 앱 데이터/Pro/다운로드된 꾸미기 유지 확인. 진행 중 전역 다운로드 작업은 OS 재시작으로 중단될 수 있어 각 팩 완료 상태 재확인이 필요하다.
- 기기 캘린더 목록 조회 성공. 대한민국 공휴일 캘린더 1개 선택. 2026-12-25 상세 > Calendar > All에서 크리스마스 종일 일정과 Subscribed Calendars 출처 실제 표시 확인. Settings의 Apple connected 유지 확인.
- Apple 필터는 iCloud/Apple 계정 공급자만 표시하므로 구독형 공휴일(Subscribed Calendars)은 All에서 확인했다. 일반 CalDAV/구독 캘린더를 Apple 공급자로 잘못 단정하지 않는 현행 정책은 유지한다.

- 사용자 지시 “구글 연동 통과해줘 확인했어”: Google 연동도 사용자 확인 완료로 기록한다. 에이전트는 무료 차단과 Pro 로그인 진입 및 취소까지만 직접 확인했으며, OAuth 완료·실제 Google 일정/Tasks 표시는 사용자 확인 결과와 구분한다. 새 Google 권한은 부여하지 않고 로그인 안내를 취소했다.
