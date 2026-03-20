# LockFlow 기획서

잠금 화면처럼 **가볍게 열고**, 루틴에 **깊게 잠기는** 집중 루틴 앱 **LockFlow** 의 기획/설계 문서입니다.  
이 문서는 제품 컨셉, 주요 플로우, 도메인 모델, 상태관리, 데이터 영속화, 기술 구조를 한 번에 정리합니다.

---

## 1. 제품 개요

### 1.1 목표

- 사용자가 **하루 루틴을 정의**하고  
- 그 루틴을 **실제 루틴 실행(RoutineExecution) 단위로 실행**하며  
- 잠금 화면 위젯 같은 **가벼운 카드 UI** 로 진행 상황을 확인할 수 있게 한다.
- 별도 서버 없이 **로컬(LocalStorage)** 기반으로 빠르게 동작하는 **개인 집중 루틴 도구**를 지향한다.

### 1.2 핵심 아이디어

- **Routine**: 아침, 점심, 저녁, Deep Work 등 시간대/상황별 “템플릿”
- **RoutineTask**: 루틴에 포함된 세부 액션들의 리스트
- **RoutineExecution**: 특정 시간에 실제로 실행되는 루틴 인스턴스(루틴 한 번 실행)
- **Today 대시보드**: 오늘 진행 중/예정된 루틴 실행들을 한눈에 보여주는 홈 화면

LockFlow 는 “해야 할 일을 많이 적는 투두 앱”이 아니라,  
**미리 정의된 루틴을 실행(RoutineExecution)하며 흐름(flow)에 들어가는 앱**이다.

---

## 2. 주요 사용자 페르소나

### 2.1 집중형 지식 노동자

- 평일 오전/오후에 **Deep Work 블록**을 만들고 싶은 사람
- 개발자, 디자이너, 기획자, 연구자 등
- 특징
  - 이미 투두/캘린더는 쓰고 있지만, **집중 구간을 보호하는 도구**가 필요함
  - “지금 해야 할 것만 보여주는 간결한 UI” 를 선호

### 2.2 루틴 지향 라이프스타일 사용자

- 아침 루틴, 자기 전 루틴 등 **반복되는 패턴**을 만들고 싶은 사람
- 운동, 명상, 독서 등 **습관성 태스크**를 관리하는 데 관심
- 특징
  - 체크리스트보다 **“루틴의 흐름”** 에 집중
  - 완료율/연속성보다는 **당일 진행도**를 직관적으로 보고 싶어 함

---

## 3. 핵심 사용자 시나리오

### 3.1 오늘의 루틴 실행 (Today / 홈)

1. 사용자는 아침에 앱을 연다.
2. Today 화면에서 **“현재/다가오는 세션 카드(CurrentSessionCard)”** 를 본다.
3. 카드를 탭해 세션을 시작/재개한다.
4. 각 태스크 진행 시, 카드의 **프로그레스 바와 % 텍스트**가 실시간으로 업데이트된다.
5. 세션이 끝나면 “오늘 계획 1개 완료” 같이 가벼운 피드백을 제공한다.

### 3.2 새로운 루틴 만들기 (Routine Setup)

1. 사용자는 “루틴 추가” 버튼을 눌러 새로운 루틴을 만든다.
2. 루틴 이름/카테고리/아이콘/색상을 정한다. (예: Morning Energy)
3. 태스크들을 순서대로 추가한다. (예: 물 마시기 5분, 스트레칭 10분, 계획 세우기 10분)
4. 태스크 순서와 예상 소요 시간으로 **전체 루틴 길이**를 확인한다.
5. 저장 후, 이 루틴을 Today 대시보드에서 루틴 실행으로 실행할 수 있다.

### 3.3 추천 루틴 둘러보기 (Discover)

1. 사용자는 Discover 탭을 열어 **추천 루틴 카드 리스트**를 본다.
2. 상단 필터 칩(All / Morning / Focus / Relax 등)을 눌러 관심 카테고리만 본다.
3. 마음에 드는 카드를 눌러 상세 설명을 확인한 뒤, 내 루틴으로 복사/커스터마이징한다.

---

## 4. 도메인 모델 설계

LockFlow 의 핵심 도메인 엔티티는 다음과 같다. (실제 타입/모델은 `src/entities` 에 정의)

- **Routine**
  - 하루 또는 특정 시간대를 위한 반복 가능 단위
  - 예시 필드: `id`, `title`, `description`, `category`, `tags`, `color`, `icon`, `defaultTasks[]`
- **RoutineTask**
  - 루틴을 구성하는 개별 태스크
  - 예시 필드: `id`, `routineId`, `title`, `type`, `duration`, `order`, `isLocked`
- **RoutineExecution**
  - 실제 실행 중인 루틴 인스턴스(루틴 한 번 실행). 시작/종료, 진행률, 현재 태스크 등
  - 예시 필드: `id`, `routineId`, `startTime`, `endTime`, `progress`, `currentTaskId`
- **Stats**
  - 일별/주별 루틴 완료율, 태스크 수행 기록 등 요약 통계

도메인 레벨 코드는 `src/entities` 아래에서 관리하며,  
React/라우팅에 의존하지 않는 **순수 TypeScript 비즈니스 로직**을 지향한다.

---

## 5. 화면 구조 및 UX 컨셉

### 5.1 탭/페이지 구조

- `Today` 탭 (`src/pages/today`)
  - 오늘의 루틴 실행, 현재 진행 중인 루틴 카드
- `Discover` 탭 (`src/pages/discover`)
  - 추천 루틴 리스트, 카테고리/태그 필터
- `Routines` 탭 (`src/pages/routines`)
  - 내가 만든 루틴 리스트 및 관리
- `Settings` 탭 (`src/pages/settings`)
  - 앱 환경 설정 (알림, 테마 등). 로그인/Profile은 계획 없음.

각 페이지는 feature 들을 조합해 화면을 구성하고,  
복잡한 비즈니스 로직은 `entities`/`features` 레벨에 둔다.

### 5.2 카드 기반 레이아웃

- **큰 카드**로 현재 루틴 실행/추천 루틴을 강조
- 섹션별 **카드 리스트**로 나머지 컨텐츠를 배치
- 섹션 헤더 + “See all” 패턴을 기본으로 사용
- 진행도는 항상 **프로그레스 바 + % 텍스트**로 표시
- 상단에 **필터 칩(All/Morning/Focus …)** 을 두어 빠르게 맥락 전환

### 5.3 주요 컴포넌트 아이디어

- `CurrentRoutineExecutionCard`
  - Today 화면의 핵심 카드
  - 현재 루틴 실행 제목, 남은 시간, 진행률, 다음 태스크 등을 보여줌
- `RoutineSummaryCard`
  - 루틴 리스트/추천 리스트에서 사용
  - 카테고리/색상/예상 소요 시간/태스크 수 등 요약 정보 제공

---

## 6. 기술 구조 및 폴더링

LockFlow 는 `entities / features / pages / shared` 4단계 구조를 따른다.

### 6.1 디렉토리 역할

- `src/entities`
  - 도메인 엔티티, 타입, 모델, 비즈니스 로직
  - 예: `routine`, `routineTask`, `routineExecution`, `stats` 등의 모델과 도메인 서비스
- `src/features`
  - 사용자 기능 단위 (Today 대시보드, Discover, Routine Setup 등)
  - 내부 구조: `model/`, `ui/`, `lib/`
- `src/pages`
  - 라우트(스크린) 컴포넌트
  - 역할: feature 조합, 데이터 배선, 레이아웃
- `src/shared`
  - 공용 UI, 훅, 유틸, 테마, 라우팅 헬퍼 등
  - 예: `ThemedText`, `use-theme-color`, 공용 storage 클라이언트 등

새 기능을 구현할 때는 먼저 **이 네 가지 중 어디에 속하는지 분류**한 뒤, 해당 경로에 파일을 추가한다.

---

## 7. 상태관리 (Zustand) 전략

### 7.1 원칙

- 여러 페이지/feature 에서 공유되는 상태는 **zustand 스토어**로 관리한다.
- 스토어 위치:
  - 도메인 레벨 상태 → `src/entities/<domain>/model/<domain>Store.ts`
  - 특정 feature 전용 상태 → `src/features/<feature>/model/<feature>Store.ts`
- React 컴포넌트 안에는 **비즈니스 로직을 두지 않고**,  
  가능한 한 **스토어의 actions/selectors** 로 몰아넣는다.

### 7.2 예시 스토어

- `RoutineExecutionStore`
  - 현재 루틴 실행, 남은 시간, 진행률, 현재 태스크 id
- `RoutineStore`
  - 루틴 목록, 선택된 루틴, 편집 중 루틴
- `TodayDashboardStore`
  - Today 전용 UI 상태 (선택된 카드, 모달 열림 여부 등)
- `RoutineSetupStore`
  - 편집 중 태스크 리스트, 정렬 정보, 유효성 상태

스토어는 다음을 제공한다.

- 원시 상태 필드
- 상태 변경 actions
- 파생 값 selectors (진행률 %, 남은 시간 텍스트 등)

---

## 8. 데이터 영속화 (LocalStorage)

### 8.1 기본 전략

- LockFlow 는 별도 백엔드 없이 **LocalStorage 를 1차 데이터베이스**로 사용한다.
- **zustand 스토어 = Single Source of Truth**
- LocalStorage = 스토어 상태를 디스크에 저장하는 계층
- 컴포넌트는 `window.localStorage` 를 직접 호출하지 않는다.

### 8.2 구조

- `src/shared/lib/storage/localStorageClient`
  - `getItem`, `setItem`, `removeItem` 등의 안전한 래퍼 (try/catch, JSON 직렬화 포함)
- 도메인별 storage 헬퍼 (예: `routineStorage`, `routineExecutionStorage`)
  - `loadRoutines`, `saveRoutines` 등 도메인 단위 API 제공

키 네이밍 규칙:

- `lockflow:routines`
- `lockflow:routine-executions`
- `lockflow:settings`

LocalStorage 에 저장되는 데이터 구조는 `src/entities` 의 타입/모델 정의를 그대로 따른다.

---

## 9. Expo/개발 관련 메모

- 이 프로젝트는 Expo 기반이지만, **자동화된 에이전트는 Expo CLI 명령을 직접 실행하지 않는다.**
- 필요 시 개발자는 직접 아래와 같은 명령을 터미널에서 실행한다.

```bash
npm install
npx expo start
```

기획/설계 관점에서는 Expo 를 **런타임/빌드 인프라**로만 사용하고,  
도메인/상태/데이터 구조는 위에서 정의한 원칙에 맞춰 유지한다.

---

## 10. 앞으로의 확장 아이디어

- 루틴 실행/루틴 기반 **간단한 통계 화면** (주간 완료율, 가장 많이 실행한 루틴 등)
- 루틴 공유/템플릿 갤러리 (초기에는 로컬만, 이후 서버 연동 고려)
- 알림/리마인더와의 연동 (아침 루틴 시작 알림 등)

LockFlow 는 “루틴의 흐름을 존중하는 잠금 화면 스타일 집중 앱”이라는 방향성을 유지하면서,  
위 기능들을 점진적으로 추가해 나가는 것을 목표로 한다.

---

## 11. iOS 잠금화면 중심 기획 (추가)

현재 LockFlow의 핵심 경험은 앱 내부 화면만이 아니라,  
**iOS 잠금화면에서 "지금 해야 할 리듬"을 실시간으로 확인하고 제어**하는 데 둔다.

### 11.1 제품 목표 (iOS 우선)

- Android는 현재 계획 범위에서 제외하고, iOS에 집중한다.
- 잠금화면에서 아래 정보를 즉시 제공한다.
  - 현재 리듬 제목/보조 설명
  - 남은 시간(실시간)
  - 진행도(프로그레스)
  - 핵심 액션(일시정지/완료)
- 앱 내부 `ActivitySession` 화면은 잠금화면 경험의 보조/백업 UI로 유지한다.

### 11.2 FSD 책임 분리 (잠금화면 기준)

- `entities`
  - `day-plan`: 오늘 블록 순서/시간 구간/다음 블록 파생
  - `routine-execution`: 실행 상태(진행/일시정지/완료)와 진행 계산
  - 필요 시 `live-session`: 잠금화면 payload 타입과 변환 규칙
- `features`
  - `session-control`: 시작/일시정지/재개/완료/건너뛰기 유즈케이스
  - `live-activity-sync`(iOS): 도메인 상태를 잠금화면 Live Activity로 동기화
- `pages`
  - `day-plan`: 시작 블록 선택/배선
  - `activity-session`: 상세/디버그 성격의 세션 컨트롤 화면
- `application`
  - hydrate 및 잠금화면 동기화 부트스트랩

### 11.3 실시간 동기화 원칙

- 타이머는 단순 tick 감소값보다 **절대 시각 기반 계산**을 우선한다.
- 상태 변경 이벤트(`pause/resume/finish/skip`)는 아래 순서를 따른다.
  1. 도메인 상태 갱신
  2. 잠금화면 상태 업데이트
- 앱 재실행/재진입 시 저장된 도메인 상태를 기준으로 잠금화면 상태를 복원한다.

### 11.4 MVP 단계

1. 잠금화면에 현재 리듬/남은 시간/진행도 노출
2. 잠금화면 일시정지/완료 액션 연동
3. 완료/건너뛰기 시 다음 리듬 자동 반영
4. 코칭 문구/점수/고급 시각효과 확장

