# Daylight

**사진과 글로 꾸미는 나만의 다이어리.**

Daylight는 일상의 사진에 짧은 글을 더하고, 취향에 맞는 달력으로 하루하루를 돌아보는 포토 다이어리 앱입니다. 평범한 식사, 산책, 친구와 보낸 시간처럼 기억하고 싶은 순간을 사진과 기록으로 남깁니다.

## 주요 경험

- **Diary** — 날짜별로 글과 사진을 기록하고, 계획·메모·이벤트를 정리합니다.
- **Photo** — 사진을 폴라로이드로 꾸미고, 월별로 모아 추억을 돌아봅니다. 밝기·대비 등 사진 보정과 필름 필터 미리보기를 제공합니다.
- **Calendar** — 날짜를 눌러 사진을 추가하고, 해당 날짜의 기록을 달력에서 확인합니다. 일반 달력과 장면별 일러스트 달력을 선택할 수 있습니다.
- **Store** — 달력과 다이어리 장식 아이템을 고르고 적용합니다. 일러스트 팩은 대표 이미지를 확인한 뒤 다운로드하고, 완료 후 개별 디자인을 선택합니다.

일반 캘린더는 무료로 이용할 수 있습니다. Pro는 유료 일러스트 캘린더 팩, 다이어리 장식, 필름 필터의 적용·저장·공유 등을 제공합니다. 실제 이용 범위는 앱의 상품·구독 상태와 운영 정책을 따릅니다.

## 문서 시작점

- [전체 문서](docs/README.md)
- [제품 정체성과 용어](docs/product/identity.md)
- [현재 기능과 공개 상태](docs/product/current-product.md)
- [디자인 문서](docs/design/README.md)
- [이미지 로딩과 캐시 정책](docs/ops/image-loading-and-cache.md)
- [개발 구조와 작업 원칙](docs/development.md)
- [회귀 확인 목록](docs/regression-checklist.md)

## 로컬 개발

Expo · React Native · TypeScript · Expo Router를 사용합니다. 실행 명령과 의존성은 [package.json](package.json)을 기준으로 확인합니다.

```sh
npm install
npm start
npm run typecheck
npm test -- --runInBand
npm run lint
```

위 명령은 개발자가 로컬에서 실행하는 예시입니다. 에이전트의 Expo CLI 실행 범위는 [프로젝트 규칙](.cursor/rules/pokit-Expo.mdc)을 따릅니다.

외부 서비스 설정은 [데이터와 외부 서비스](docs/product/data-and-services.md)를 참고합니다. 다운로드형 캘린더는 Supabase에서 제공하며, 대표 썸네일은 앱에 포함해 다운로드 삭제 후에도 표시합니다. 실제 키 값은 문서에 적지 않습니다.

## 이름과 식별자

현재 제품명은 **Daylight**입니다. ‘오늘의 주인공’과 ‘yourday’는 이전 이름이며, 현재 앱 소개에는 사용하지 않습니다. 과거 문서·코드의 주인공, 장면, 메이트는 해당 기능의 맥락에서 구분합니다.

저장소·Expo slug·URL scheme·저장 키 등의 `pokit` 식별자는 기존 데이터와 배포 호환성을 위해 유지합니다. 기기 표시 이름은 `locales/*.json`, Expo 기본 설정은 [app.json](app.json)에서 관리합니다.
