---
name: lockflow-dev-guide
description: LockFlow 프로젝트에서 디렉토리 구조, 도메인 모델, zustand 상태관리, LocalStorage 영속화, Expo CLI 사용 정책을 모두 고려해 코드를 설계·제안할 때 사용한다. LockFlow 관련 기능 추가, 리팩터링, 데이터 저장/불러오기, 화면 설계, 상태 분리 위치를 물을 때 이 스킬을 적용한다.
---

# LockFlow 개발 가이드 (구조 · 상태 · 데이터 · Expo)

## 사용 시점

- LockFlow 프로젝트에서 **새 기능을 설계**하거나 코드를 제안해야 할 때
- **상태 관리(zustand) 위치/설계**, **LocalStorage 기반 영속화 방식**, **디렉토리 구조**를 함께 고민해야 할 때
- Today/홈, Discover, Routine Setup 등 **주요 플로우 관련 코드**를 작성·수정할 때
- Expo 기반이지만 **CLI 명령 실행은 피하고 코드 레벨 제안**에 집중해야 할 때

에이전트는 아래 규칙을 항상 우선 적용한다.

**한글 사용자 대면 문구**는 `.cursor/rules/LockFlow-Expo.mdc` §7.0.1에 따라 **「플로우」**를 쓴다(「루틴」「리듬」표기 금지). 코드·타입·스토어 이름의 `Routine` / `routine` 등은 기존대로 둔다.

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

### 2.1 Today / 홈 화면 관련 요청

- **사용 도메인**
  - `RoutineExecution`, `Routine`, `RoutineTask`
- **기본 경로**
  - 도메인 타입/로직 → `src/entities/routine-execution`, `src/entities/routine`
  - 전역 상태(zustand) → `src/entities/routine-execution/model/routineExecutionStore.ts`
  - Today 전용 UI/상태 → `src/features/today-dashboard/ui`, `src/features/today-dashboard/model`
  - 페이지 → `src/pages/today`

### 2.1.1 제안 원칙

- Today 관련 UI를 만들 때는 **락스크린 위젯 느낌의 `CurrentRoutineExecutionCard` 스타일 컴포넌트**를 우선 제안한다.
- **남은 시간/진행률 계산**은 React 컴포넌트가 아니라
  - `routineExecutionStore` 의 **selector** 또는
  - 별도의 **helper 함수**
  에서 계산하도록 설계한다.
- 컴포넌트는 **스토어 훅을 구독해 이미 계산된 값(진행률 %, 남은 시간 텍스트 등)을 받는 형태**로 제안한다.

---

### 2.2 Discover 관련 요청

- **사용 도메인**
  - `Routine` (+ 추천/태그/카테고리 메타 정보)
- **기본 경로**
  - 추천/소팅/필터 로직 → `src/features/discover-routines/model`
  - 플로우(추천 Routine) 리스트/카드/필터 칩 UI → `src/features/discover-routines/ui`
  - 페이지 → `src/pages/discover`

### 2.2.1 제안 원칙

- Discover UI는 기본적으로 **카드 리스트 + 상단 검색/필터 바(칩)** 패턴을 사용한다.
- 추천/정렬/필터링 로직은 **zustand 스토어 또는 feature `model` 레벨 함수**로 두고,
  컴포넌트에서는 **필터 상태와 결과 리스트를 props/훅으로만 소비**하게 제안한다.

---

### 2.3 Routine Setup(사용자 카피: 플로우 생성/편집) 관련 요청

- **사용 도메인**
  - `Routine`, `RoutineTask`
- **기본 경로**
  - 폼 상태/검증/정렬 로직(zustand 포함) → `src/features/routine-setup/model`
  - 태스크 리스트/타임라인/입력 폼 UI → `src/features/routine-setup/ui`
  - 페이지 또는 라우트 → `src/pages/routines` 하위 (예: 상세/모달)

### 2.3.1 제안 원칙

- Routine 편집 중 상태(태스크 리스트, 순서, 임시 입력 값 등)는
  - `Routine` 도메인 스토어 또는
  - `RoutineSetup` feature 전용 스토어
  로 분리해서 설계한다.
- “오늘 계획 30% 완료” 같은 요약 값은
  - 가능하면 **Today 대시보드와 공유 가능한 selector/헬퍼**로 설계하고,
  - 중복 로직을 페이지/컴포넌트 안에 직접 쓰지 않는다.

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
  - `RoutineExecutionStore`
    - 현재 플로우 실행, 남은 시간, 진행률, 현재 태스크 id 등
  - `RoutineStore`
    - 사용자의 플로우 목록, 선택된 플로우, 편집 중인 플로우 등
- **feature 스토어**
  - `TodayDashboardStore`
    - Today 화면 전용 UI 상태 (예: 모달 열림 여부, 선택된 카드 등)
  - `RoutineSetupStore`
    - 편집 중 태스크 리스트, 드래그 정렬 정보, 유효성 여부 등

에이전트가 스토어를 설계할 때는 다음 요소를 포함해 제안한다.

- **원시 상태 필드** (예: `routineExecutions`, `currentRoutineExecutionId`, `editingRoutine` 등)
- **상태를 변경하는 action** (예: `startRoutineExecution`, `completeTask`, `updateRoutine` 등)
- **뷰에서 자주 쓰는 파생 값 selector**
  - 예: 진행도 %, 남은 시간 텍스트, 오늘 해야 할 태스크 리스트 등

### 3.3 제안 시 행동

상태가 복잡해 보이거나 여러 컴포넌트에서 공유될 것 같으면, 에이전트는 다음 순서를 따른다.

1. **zustand 스토어의 위치/이름을 먼저 제안**
   - 예: `src/entities/routine-execution/model/routineExecutionStore.ts`
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
- `src/shared/lib/storage/routineStorage`
  - `loadRoutines`, `saveRoutines` 등 도메인별 저장/로드 헬퍼
- 각 도메인/feature 의 zustand 스토어
  - 초기화 시 `loadXXX` 를 사용해 LocalStorage 값을 불러온다.
  - action 내부에서 `saveXXX` 를 호출해 LocalStorage 와 동기화한다.

### 4.4 제안 시 행동

사용자가 “데이터를 저장/불러오기” 기능을 요청하면, 에이전트는 다음 순서를 따른다.

1. **어떤 도메인 엔티티를 쓸지 결정**
   - 예: `Routine`, `RoutineExecution`, `Stats` 등
2. 해당 도메인에 맞는 **zustand 스토어 + storage 헬퍼 모듈 위치를 제안**
3. 컴포넌트에서는 **스토어 훅만 사용**하도록 코드를 제안하고,
   LocalStorage 접근은 항상 공용 스토리지 모듈을 경유하도록 유도한다.

---

## 5. Expo CLI 사용 가이드

### 5.1 기본 정책

- LockFlow 가 Expo 기반이라도, 에이전트는 **코드/구조 설명과 수정 제안**에 우선 집중한다.
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

LockFlow 관련 요청에 이 스킬을 사용할 때, 에이전트는 다음을 따른다.

- **항상 한국어로 응답**한다.
- 코드 제안 시
  - **어느 계층(`entities` / `features` / `pages` / `shared`)에 둘 코드인지 먼저 설명**한다.
  - 그다음에 **파일 경로와 함께 코드 예시**를 제시한다.
- 상태/영속화가 얽힌 복잡한 기능일수록
  - **zustand 스토어 설계 → storage 헬퍼 설계 → 컴포넌트 예시** 순서로 제안한다.

