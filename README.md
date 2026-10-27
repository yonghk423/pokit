# 오늘의 주인공

**장면을 골라 내 하루를 만드는 다이어리.**

주인공과 그림 장면으로 하루를 구성하고, 장면마다 할 일과 메모를 남깁니다. 오늘의 메이트와 반복 설정은 하루를 준비하고 실행하는 일을 돕습니다. 종이 질감과 만년필 선으로 기록을 가볍게 시작할 수 있는 경험을 만듭니다.

## 문서 시작점

- [전체 문서](docs/README.md)
- [제품 정체성과 용어](docs/product/identity.md)
- [현재 기능과 공개 상태](docs/product/current-product.md)
- [종이와 만년필 디자인](docs/design/paper-and-ink.md)
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

외부 서비스 설정은 [데이터와 외부 서비스](docs/product/data-and-services.md)를 참고합니다. 실제 키 값은 문서에 적지 않습니다.

## 이름과 식별자

제품을 설명할 때는 **오늘의 주인공**을 사용합니다. 저장소·Expo slug·URL scheme·저장 키 등의 `pokit` 식별자는 기존 데이터와 배포 호환성을 위해 유지합니다. 기기 표시 이름은 `locales/*.json`, Expo 기본 설정은 `app.json`에서 관리하며 문서의 이름 변경만으로 배포 설정이 바뀌지는 않습니다.
