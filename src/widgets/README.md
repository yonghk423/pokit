# widgets (FSD)

**여러 feature/entity를 조합한 복합 UI 블록**을 담는 레이어입니다.

- 페이지를 구성하는 큰 덩어리 (예: 오늘 요약 대시보드 블록, 플로우 리스트+필터 블록)
- 단일 feature보다 크고, 페이지 전체보다 작은 단위
- 각 위젯은 `ui/`, `model/` 등 슬라이스 구조를 가질 수 있습니다.

## active-session-card

세션 진행 중 앱 내에서 보여주는 카테고리별 커스텀 카드.

- `ReadingSessionCard` — 독서 카테고리 전용 (지표 + 진행 바 + 실시간 타이머)
- `RunningSessionCard` — 러닝 전용 (히어로 대형 타이머 + 벤토: 목표 거리 / 위치 / 칼로리)
- `ChecklistSessionCard` — 오늘 플로우 체크리스트 (완료/진행 중/예정)
- `ActiveSessionCard` — categoryKey 기반 라우터 (`segment`로 벤토-only / 체크리스트-only 분할 가능)

**Live Activity(잠금화면)와 별개 디자인**: 이 위젯은 Swift Live Activity UI와 동기화 의무가 없다.
잠금화면 미리보기(`goal-detail-settings/ui/category/`)는 여전히 Swift 기준이지만,
세션 화면의 인앱 카드는 RN 전용으로 자유롭게 발전시킨다.
