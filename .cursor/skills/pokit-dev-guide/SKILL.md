---
name: pokit-dev-guide
description: pokit 프로젝트에서 디렉토리 구조, 도메인 모델, zustand 상태관리, LocalStorage 영속화, Expo CLI 사용 정책을 모두 고려해 코드를 설계·제안할 때 사용한다. pokit 관련 기능 추가, 리팩터링, 데이터 저장/불러오기, 화면 설계, 상태 분리 위치를 물을 때 이 스킬을 적용한다.
---

# pokit 개발 가이드 (구조 · 상태 · 데이터 · Expo)

## 사용 시점

- pokit 프로젝트에서 **새 기능을 설계**하거나 코드를 제안해야 할 때
- **상태 관리(zustand) 위치/설계**, **LocalStorage 기반 영속화 방식**, **디렉토리 구조**를 함께 고민해야 할 때
- Day Plan, `activity-session`, 목표 상세 설정, 통계 등 **주요 플로우 관련 코드**를 작성·수정할 때
- Expo 기반이지만 **CLI 명령 실행은 피하고 코드 레벨 제안**에 집중해야 할 때

에이전트는 아래 규칙을 항상 우선 적용한다.

**한글 사용자 대면 문구**는 `.cursor/rules/pokit-Expo.mdc` §7.0.1에 따라 **「루틴」**을 쓴다(「리듬」표기 금지). 코드·타입·스토어 이름은 `day-plan`, `customFlow`, `flow` 등 현재 도메인 식별자를 따른다.

**UI/UX·비주얼 리팩터** 시 [`docs/design/DESIGN_CONCEPT.md`](../../docs/design/DESIGN_CONCEPT.md)(레트로 시티팝·Flat Brutalism Lite)와 [`docs/design/city-pop-minimalist.md`](../../docs/design/city-pop-minimalist.md)(색·타이포·간격 토큰)를 우선 참고한다. 코드 토큰은 `src/shared/config/retroFlat.ts`·`theme.ts`와 동기화한다.

---

## 1. 위치 결정 가이드

### 1.1 상위 분류

새 기능/요청을 보면 먼저 **아래 네 가지 중 어디에 속하는지 분류**하고, 그에 맞는 경로를 제안한다.

- **도메인 개념/모델/비즈니스 규칙** → `src/entities`
  - 순수 TS/비즈니스 로직, 타입, 모델, 밸리데이션, 도메인 서비스 등
- **특정 유저 기능 (검색, 목록, 상세, 실행, 편집 등)** → `src/features/<feature-name>`
  - 하나 이상의 `entities` 를 조합해 실제 유즈케이스를 구현
  - 내부 구조는 기본적으로 `model/`, `ui/`, `lib/`
- **라우트(스크린) 단위 화면** → `src/pages/<route-name>`
  - feature 들을 조합해 화면을 구성하는 레벨 (배선 역할)
- **공용 UI/훅/유틸/테마** → `src/shared/...`
  - 특정 도메인에 묶이지 않는 진짜 공용 코드만 위치

에이전트는 코드 제안 시 **“이 로직이 어느 계층에 속하는지”를 먼저 말하고, 해당 경로를 명시**한 뒤 코드를 제시한다.

---

## 2. 주요 플로우별 동작 가이드

### 2.1 Day Plan (`day-plan`) 관련 요청

- **사용 도메인**
  - `DayPlan`, `DayPlanBlock`, `dayPlanDraftStore`, `dayPlanRuntimeStore`
- **기본 경로**
  - 도메인 타입/로직 → `src/entities/day-plan`
  - 전역 상태(zustand) → `src/entities/day-plan/model/dayPlanStore.ts`, `dayPlanDraftStore.ts`, `dayPlanRuntimeStore.ts`
  - 알림 동기화 → `src/features/day-plan-notifications`, `src/features/category-reminder-notifications`
  - 페이지 → `src/pages/day-plan`
  - 복합 UI → `src/widgets/day-plan-priority-order`, `src/widgets/daily-rhythm-time-field`

### 2.1.1 제안 원칙

- 데이플랜 UI는 **우선순위 순서·담기(카탈로그)·빠른 메모** 중심으로 설계한다. 시간표를 촘촘히 채우는 UX를 기본으로 두지 않는다.
- **하루 시작·마무리 시각**은 `DailyRhythmOnboardingGate`·설정·데이플랜 에디터에서 설정하며, 저장은 `HH:mm`, 표시는 한글 시계 규칙을 따른다.
- 남은 시간·진행률·다음 블록 파생 값은 React 컴포넌트가 아니라 **스토어 selector 또는 `entities/day-plan/lib` 헬퍼**에서 계산한다.
- 라우팅(`expo-router`)은 **페이지(`src/pages`) 또는 `app/`** 에서만 처리하고, feature/widget은 콜백 props만 받는다.

---

### 2.2 Activity Session (`activity-session`) 관련 요청

- **사용 도메인**
  - `dayPlanRuntimeStore`(실행 중 블록), `dayPlanStore`(일정 갱신)
- **기본 경로**
  - 세션 UI·배선 → `src/pages/activity-session/ui/ActivitySessionPage.tsx`
  - Live Activity 동기화(레거시, 필수 아님) → `src/features/live-activity-sync`
  - 공용 포맷 → `src/shared/lib/formatDurationMinKo.ts` 등

### 2.2.1 제안 원칙

- 세션 화면이 **제품의 주 실행 경험**이다. 타이머·진행도·일시정지/완료는 **절대 시각·도메인 상태** 기반으로 계산한다.
- 세션 UI를 재사용 가능한 블록으로 분리할 때는 `widgets` 슬라이스를 새로 두되, **같은 레이어 슬라이스 간 import는 금지**한다.
- 과거 `active-session-card` 위젯·목표 상세 `*Preview.tsx`는 **제거됨**. 미리보기 UI를 다시 만들지 않는다.

---

### 2.3 목표 상세 설정 (`goal-detail-settings`) 관련 요청

- **사용 도메인**
  - `GoalDetailSettings`, 카테고리별 설정 모듈(`reading`, `water`, `medicine` 등)
- **기본 경로**
  - 페이지 조립 → `src/pages/goal-detail-settings/ui/GoalDetailSettingsPage.tsx`
  - 카테고리별 설정 UI → `src/pages/goal-detail-settings/ui/category/<category>/ui/*Settings.tsx`
  - 완료 후 검토·시작 → `src/pages/flow-review` (`goal-detail-settings` 완료 핸들러에서 이동)

### 2.3.1 제안 원칙

- 목표 상세는 **설정(`*Settings.tsx`)만** 제공한다. 잠금화면형/세션형 RN 미리보기는 현재 스코프에 없다.
- 배경 장식용 원형·블롭 UI는 `.cursor/rules/pokit-Expo.mdc` §7.2.8에 따라 **금지**한다.

---

### 2.4 통계·설정·기타 화면

- **통계** → `src/pages/day-plan-statistics`, `src/entities/history` (`historyStore`)
- **설정** → `src/pages/settings`, `src/shared/lib/storage`의 `settings` 키
- **담기(우선순위 카탈로그)** → `app/(tabs)/priority-catalog.tsx` → `src/pages/day-plan` 내 패널/탭 연동
- **위젯 설정** → `src/pages/widget-settings`
- **하루 주기 설정** → `app/daily-rhythm-settings.tsx`

---

## 3. Zustand 사용 가이드

### 3.1 새 기능 설계 시 상태·스토어 판단 순서

에이전트는 상태가 등장하면 아래 순서로 판단하고 제안한다.

1. **한 페이지/컴포넌트 안에서만 쓰이는 상태인지?**
   - 예: 특정 모달 열림 여부, 일회성 폼 입력
   - → `useState` 또는 `useReducer` 로 **로컬 상태**부터 시작 제안
2. **여러 feature/page 에서 공유되거나, 앱 전반에 중요한 도메인 상태인지?**
   - 예: 현재 세션, 플로우 목록, 오늘의 계획, 사용자 설정 등
   - → 해당 도메인 또는 feature 의 **zustand 스토어**를 설계/추가하도록 제안
3. **비즈니스 규칙/검증/파생 값 계산 위치**
   - React 컴포넌트 안이 아니라
   - **zustand 스토어의 action 또는 selector** 안에 배치하도록 유도

### 3.2 스토어 설계 패턴

- **도메인 스토어 (entities 레벨)**
  - `dayPlanStore` — 오늘 일정 본문(블록·우선순위·완료 상태 등)
  - `dayPlanDraftStore` — 데이플랜 화면 드래프트(모드·시작·마무리·순서 등)
  - `dayPlanRuntimeStore` — 실행 중 세션 런타임(현재 블록, 일시정지, 타이머 기준 시각)
  - `historyStore` — 일별 집중·완료 지표, 배지/마일스톤
  - `localNotificationsStore` — OS 알림 권한 상태
- **feature 스토어**
  - 현재 feature 전용 zustand 스토어는 두지 않는 것을 기본으로 한다. 알림·Live Activity 등은 `lib` + bootstrap/page 배선으로 처리한다.

에이전트가 스토어를 설계할 때는 다음 요소를 포함해 제안한다.

- **원시 상태 필드** (예: `blocks`, `activeBlockId`, `pausedAt` 등)
- **상태를 변경하는 action** (예: `startBlock`, `pauseSession`, `completeBlock` 등)
- **뷰에서 자주 쓰는 파생 값 selector**
  - 예: 진행도 %, 남은 시간 텍스트, 다음 우선 블록 등

### 3.3 제안 시 행동

상태가 복잡해 보이거나 여러 컴포넌트에서 공유될 것 같으면, 에이전트는 다음 순서를 따른다.

1. **zustand 스토어의 위치/이름을 먼저 제안**
   - 예: `src/entities/day-plan/model/dayPlanRuntimeStore.ts`
2. **해당 스토어가 가져야 할 상태/액션/selector 를 설계**
3. 그 다음에 **컴포넌트 코드에서는 스토어 훅만 사용하는 형태**로 예시 코드를 제공한다.

---

## 4. LocalStorage 연동 가이드

### 4.1 기본 원칙

- **zustand 스토어가 단일 진실의 원천(Single Source of Truth)** 이다.
- LocalStorage 는 이 스토어를 **디스크에 영속화하는 저장소 역할**만 한다.
- 데이터 흐름:
  - 컴포넌트 → zustand 스토어를 구독/액션 호출
  - zustand 스토어 → 필요 시 LocalStorage 와 동기화
- **컴포넌트에서는 `window.localStorage` 를 직접 호출하지 않는다.**

### 4.2 전형적인 플로우

- **앱 시작 시**
  - 공용 스토리지 모듈을 통해 LocalStorage 값을 읽는다.
  - 읽은 값을 각 도메인 zustand 스토어의 **초기 상태**로 주입한다.
- **상태 변경 시**
  - zustand 스토어의 action 안에서 **변경된 상태를 LocalStorage 에 반영**한다.
  - 이때도 컴포넌트 레벨에서는 LocalStorage 를 모르도록 설계한다.

### 4.3 모듈 구성 예 (위치 기준)

- `src/shared/lib/storage/localStorageClient`
  - `getItem`, `setItem`, `removeItem` 등 안전한 래퍼
  - try/catch, JSON 직렬화/역직렬화 포함
- `src/shared/lib/storage/storageKeys.ts`
  - `pokit:day-plan`, `pokit:history-daily-stats`, `pokit:goal-detail-settings` 등 키 상수
- 도메인별 storage 헬퍼 (예: `dayPlanStorage.ts`, `historyStorage.ts`, `goalDetailSettingsStorage.ts`)
  - `loadXxx`, `saveXxx` 등
- `src/application/useAppBootstrap.ts`
  - 앱 시작 시 storage → zustand hydrate, 알림·Live Activity(레거시) 동기화
- 각 도메인 zustand 스토어
  - 초기화 시 `loadXXX` 를 사용해 LocalStorage 값을 불러온다.
  - action 내부에서 `saveXXX` 를 호출해 LocalStorage 와 동기화한다.

### 4.4 제안 시 행동

사용자가 “데이터를 저장/불러오기” 기능을 요청하면, 에이전트는 다음 순서를 따른다.

1. **어떤 도메인 엔티티를 쓸지 결정**
   - 예: `DayPlan`, `History`, `GoalDetailSettings` 등
2. 해당 도메인에 맞는 **zustand 스토어 + storage 헬퍼 모듈 위치를 제안**
3. 컴포넌트에서는 **스토어 훅만 사용**하도록 코드를 제안하고,
   LocalStorage 접근은 항상 공용 스토리지 모듈을 경유하도록 유도한다.

---

## 5. Expo CLI 사용 가이드

### 5.1 기본 정책

- pokit 가 Expo 기반이라도, 에이전트는 **코드/구조 설명과 수정 제안**에 우선 집중한다.
- **사용자의 명시적인 허락 없이 어떤 Expo CLI 명령도 실행하지 않는다.**
  - 예: `expo start`, `expo prebuild`, `expo build`, `npx expo install ...` 등

### 5.2 제안 시 행동

- Expo 관련 작업이 필요해 보일 때는:
  1. **어떤 명령을 왜 실행해야 하는지** 먼저 설명한다.
  2. 사용자가 직접 터미널에서 실행할 수 있도록 **명령어 예시만 텍스트로 제공**한다.
- 사용자가 명시적으로 허락하지 않거나 응답이 없는 경우:
  - 에이전트는 Expo 명령을 **직접 실행하지 않는다**.
  - 대신, 사용자가 나중에 참조할 수 있도록 **필요한 명령을 정리해서 안내**하는 데 그친다.

---

## 6. 응답 스타일 가이드

pokit 관련 요청에 이 스킬을 사용할 때, 에이전트는 다음을 따른다.

- **항상 한국어로 응답**한다.
- 코드 제안 시
  - **어느 계층(`entities` / `features` / `pages` / `shared`)에 둘 코드인지 먼저 설명**한다.
  - 그다음에 **파일 경로와 함께 코드 예시**를 제시한다.
- 상태/영속화가 얽힌 복잡한 기능일수록
  - **zustand 스토어 설계 → storage 헬퍼 설계 → 컴포넌트 예시** 순서로 제안한다.

