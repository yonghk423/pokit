# POKIT Pro · 구독 & iCloud 동기화 기획

> 상태: **피드백 중 (일부 결정 확정)**  
> 목적: 유료 구독(`pokit_pro`)과 iCloud 동기화 기능을 같은 문서에서 정의하고, 구현 전에 결정 사항을 합의한다.  
> 업데이트: 대화에서 합의된 내용만 이 문서에 반영한다.

---

## 1. 한 줄 목표

**POKIT Pro 구독자만** Apple 기기 간 **iCloud 동기화**를 쓸 수 있게 한다.  
로컬(기기) 사용은 무료로 유지한다.

---

## 2. 핵심 전제 (확정)

- **iOS 전용** — Android 출시 계획 없음
- **로그인/회원 관리 없음** — 별도 계정 시스템을 만들지 않음
- **동기화 = iCloud (CloudKit)** — 자체 서버·백엔드 없음. Apple ID가 기기에 이미 있으므로 사용자에게 별도 로그인을 요구하지 않음
- **참고 모델: [Bear](https://bear.app/)** — 무료는 로컬, Pro 구독 시 iCloud 동기화

---

## 3. 현재 코드·인프라 상태 (2026-08-16)

### 3.1 있는 것

| 영역 | 위치 / 내용 |
|------|-------------|
| Entitlement ID | `pokit_pro` (`src/shared/config/revenueCat.ts`) |
| 상품 ID (의도) | `monthly`, `yearly`, `lifetime` |
| SDK 설정 | `features/subscriptions` — configure, hydrate, paywall, restore, Customer Center |
| Pro 판별 | `selectIsPro` / `isProEntitlementActive(customerInfo)` |
| iOS public key | 로컬 `.env.local`의 `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (`appl_…`) |
| RevenueCat iOS 앱 | Bundle `com.yonghee.pokit` + App Store Connect IAP `.p8` 연동 |

### 3.2 없는 것 / 미완

| 영역 | 상태 |
|------|------|
| RevenueCat Offering + App Store 상품 연결 | 미설정 → offerings empty 로그 |
| EAS production env에 RC 키 | 미반영 (로컬 `.env.local`만) |
| 설정 UI Pro 섹션 | `SHOW_POKIT_PRO_SETTINGS = false` 로 숨김 |
| iCloud/CloudKit 동기화 | **미구현** |

### 3.3 데이터 저장 (현재)

- 1차 저장소: **LocalStorage** (`pokit:*` 키)
- iCloud 연동 없음 → 기기 변경·재설치 시 데이터 복구 불가

---

## 4. 시스템 구조

```
[App Store] ──구매──▶ [RevenueCat] ──entitlement pokit_pro──▶ [앱 selectIsPro]
                                                                │
                                                                ▼
[Apple ID (기기 내장)] ──▶ [iCloud / CloudKit] ◀── Pro일 때만 sync ── [cloud-sync feature]
```

- **RevenueCat**: "돈 내고 Pro인가?"
- **iCloud/CloudKit**: "같은 Apple ID 기기 간 데이터 동기화" (자체 서버 불필요)
- 로그인 화면 없음 — Apple ID는 기기 설정에 이미 있음

---

## 5. 제품 스코프

### 5.1 Pro에 넣는 것

- [x] **iCloud 동기화** (핵심 가치)
- [ ] (나중에) 추가 Pro 기능 — *미정*

### 5.2 무료로 유지할 것

- [x] 데이플랜 · 세션 · 노트 등 **단일 기기** 로컬 사용
- [x] 기존 핵심 플로우 전부 잠그지 않음

### 5.3 동기화 대상 데이터 (후보 — 우선순위 미정)

| 우선 | 도메인 | 저장 키 예 | 메모 |
|------|--------|------------|------|
| P0? | DayPlan / draft / runtime | `pokit:day-plan` 등 | 충돌 정책 중요 |
| P0? | History | `pokit:history-*` | |
| P1? | Goal detail settings | `pokit:goal-detail-settings` | |
| P1? | Settings / 하루 주기 | `pokit:settings` 등 | |
| P2? | 스터디 노트 문서 | 노트 관련 키 | 용량·충돌 큼 |

*합의 후 표에 ✅ / 제외 표시.*

---

## 6. 구현 레이어 제안 (FSD)

| 레이어 | 역할 |
|--------|------|
| 기존 `features/subscriptions` | Pro 상태, paywall, restore (유지) |
| `features/cloud-sync` (신규) | iCloud pull/push, conflict, on/off, 마지막 동기화 시각 |
| `entities/*` | 동기화 가능한 스냅샷 타입·직렬화 규칙 |
| `shared/lib/storage` | 로컬 I/O (기존) |
| `shared/lib/icloud` (신규) | CloudKit 접근 래퍼 (네이티브 모듈 또는 라이브러리) |
| `pages/settings` | 「iCloud 동기화」「POKIT Pro」 UI 배선 |

라우팅/페이월 호출은 pages(또는 app)에서, feature는 콜백·API만.

---

## 7. 결정 사항

### 확정됨

| ID | 결정 | 내용 | 날짜 |
|----|------|------|------|
| D3 | 계정(로그인) | **없음.** Apple ID가 기기에 내장되어 있으므로 별도 로그인/회원 관리 없음 | 2026-08-16 |
| D4 | 백엔드/동기화 기술 | **iCloud / CloudKit.** 자체 서버·Supabase·Firebase 사용 안 함 | 2026-08-16 |
| D8 | Android | **출시 계획 없음.** iOS(iPhone/iPad) 전용 | 2026-08-16 |

### 열린 결정 (피드백 필요)

#### D1. Pro의 핵심 가치
- A) iCloud 동기화만
- B) 동기화 + 기타 Pro 기능 묶음
- C) 기타: ___

#### D2. 무료 범위
- A) 로컬 전부 유지, Pro는 동기화만
- B) 일부 고급 로컬 기능도 Pro
- C) 기타: ___

#### D5. Pro 만료 시 동기화
- A) sync 중단, 로컬 데이터 유지 (읽기·편집 가능)
- B) sync 중단 + iCloud 데이터는 보관 N일
- C) 기타: ___

#### D6. 충돌 정책 (같은 데이터가 두 기기에서 수정)
- A) Last-write-wins (단순)
- B) 필드/문서 단위 merge
- C) 사용자에게 선택 UI
- D) 미정 (MVP는 A)

#### D7. 출시 순서
- A) 먼저 Pro 결제만 (동기화는 이후)
- B) 결제 + 동기화 MVP 동시
- C) 동기화만 먼저(내부), 결제 게이팅은 직전

---

## 8. 로드맵 (초안)

### Phase 0 — 결제 기반 (앱 스토어 연동)
1. App Store Connect 상품 (`monthly` / `yearly` / `lifetime`)
2. RevenueCat Products + Offering + `pokit_pro` entitlement
3. EAS production에 `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
4. 설정 Pro UI 재노출 및 샌드박스 구매 테스트

### Phase 1 — iCloud 최소 동기화 MVP
1. CloudKit 컨테이너 설정 (Xcode Capabilities)
2. RN ↔ CloudKit 브릿지 (네이티브 모듈 또는 라이브러리)
3. 동기화 대상 P0만 (§5.3)
4. 설정: 동기화 토글 → 비 Pro면 paywall
5. 기본 충돌 정책 (last-write-wins)

### Phase 2 — 안정화
1. 충돌·용량·오프라인 큐 고도화
2. 노트 등 P1/P2 데이터
3. 복구 UX, 마지막 동기화 시각, 오류 안내

---

## 9. 검증 체크리스트 (나중에 채움)

- [ ] 샌드박스에서 구독 → `pokit_pro` active
- [ ] 복원 구매
- [ ] Pro 없이 동기화 진입 시 페이월
- [ ] Pro로 두 기기 iCloud 동기화
- [ ] 만료 후 로컬 유지 / sync 차단 (D5)
- [ ] offerings empty 해소

---

## 10. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-08-16 | 초안 작성. 코드 현황·시스템 분리·열린 결정 D1–D8·Phase 로드맵 기록 |
| 2026-08-16 | D3·D4·D8 확정. 클라우드 → iCloud/CloudKit으로 전환. Android 제외. Bear 모델 참고. 문서 전체 재구성 |

---

## 11. 이 문서로 피드백 받는 방법

1. 위 **§7 열린 결정**에 A/B/C로 답한다.
2. 합의된 항목은 "확정됨" 표로 옮기고 날짜를 적는다.
3. 구현 착수 전에 Phase 0 vs 1 범위를 한 번 더 잠근다.
