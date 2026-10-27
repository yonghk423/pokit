# 복합 UI 레이어

`src/widgets`는 여러 기능·도메인을 조합하는 화면 내부의 UI를 둡니다. 라우트 전체는 `src/pages`, 작은 공용 조작부는 `src/shared/ui`에 둡니다.

## 현재 슬라이스

| 위치 | 역할 |
|---|---|
| `daily-mate-time-field` | 메이트 시각 입력과 다이얼 |
| `day-plan-priority-order` | 메이트·항목의 순서와 행 구성 |
| `day-plan-spine-timeline` | 하루 항목의 타임라인 |
| `day-plan-meal-slot-timeline` | 식사 구간 타임라인 |
| `custom-flow-template-session` | 템플릿·실행 관련 복합 UI |
| `study-note-document` | 노트 문서와 키보드 대응 |
| `puzzle-history-board` | 퍼즐 기록 보드; 공개 여부는 기능 플래그 확인 |

작업 기준은 [개발 구조](../../docs/development.md)와 [디자인](../../docs/design/paper-and-ink.md)을 따릅니다. 디렉터리가 존재한다는 이유로 숨긴 기능을 공개하지 않습니다.
