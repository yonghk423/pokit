# widgets (FSD)

**여러 feature/entity를 조합한 복합 UI 블록**을 담는 레이어입니다.

- 페이지를 구성하는 큰 덩어리 (예: 데이플랜 우선순위 순서 편집, 하루 주기 시간 필드)
- 단일 feature보다 크고, 페이지 전체보다 작은 단위
- 각 위젯은 `ui/`, `model/` 등 슬라이스 구조를 가질 수 있습니다.

## 현재 슬라이스

| 슬라이스 | 역할 |
|----------|------|
| `day-plan-priority-order` | 데이플랜 우선순위 순서 편집 UI |
| `daily-rhythm-time-field` | 하루 시작·마무리 시각 입력 필드 |

**참고:** 세션 실행 UI는 현재 `widgets`가 아니라 `src/pages/activity-session` 페이지 내부에 있다. 과거 `active-session-card` 위젯은 제거되었다.
