# Design Concept & UI/UX Strategy — POKIT

포킷(POKIT)이 추구하는 **「단정하고 정돈된 일상과 루틴」**의 가치를 시각적으로 전달하기 위한 디자인 시스템 가이드라인입니다. 80–90년대 에세이 표지 및 **레트로 시티팝(Retro City-Pop)** 일러스트 무드를 현대적인 **미니멀 플랫 UI**로 재해석합니다.

색·타이포·간격 수치는 [`city-pop-minimalist.md`](./city-pop-minimalist.md)를 단일 기준으로 한다.  
스토리북 도입 전까지 이 문서 + 위 토큰 MD가 **UI 리팩터링·컴포넌트 작업의 레퍼런스** 역할을 한다.

---

## 1. Design Concept — Key Identity

| 항목 | 내용 |
|------|------|
| **컨셉 무드** | 레트로 시티팝, 미니멀 일러스트, 에세이 톤앤매너 |
| **핵심 가치** | 과한 욕심과 화려함을 걷어낸 담백함, 복잡한 생각을 비워내는 정적이고 평화로운 여백 |
| **비주얼 모토** | 「단정하고 산뜻하게 정돈된 하루」 |
| **스타일 명칭** | **City Pop Minimalist** + **Flat Brutalism Lite** |

앱 정식 명칭은 **POKIT**, 저장소·내부 식별자는 **pokit** (소문자). 사용자 대면 UI는 한글([`.cursor/rules/pokit-Expo.mdc`](../../.cursor/rules/pokit-Expo.mdc) §7.0.1).

---

## 2. Visual Style Guidelines (UI/UX 컴포넌트 규칙)

### Line & Shape (선과 형태)

- **클리어 라인:** 모든 인터랙티브 요소(버튼, 입력, 카드)에 **일정한 두께의 검은 윤곽선**을 명확히 적용한다.  
  - RN 코드 기본: `RETRO_BORDER_WIDTH = 2`, 색 `#000000` (라이트) / `#F1EFFF` (다크).
- **미니멀 라운딩:** 기본 `border-radius: 0`. 구간 배지·소형 칩 등 메타 UI만 **최대 4px**까지 허용.

### Flat Aesthetic (평면성 유지)

- **효과 배제:** blur 그림자(`shadowRadius`), `backdrop-filter`, 화려한 그라데이션 **금지**.
- **단색 채우기:** 면은 100% 단색. 깊이는 **톤 레이어링** + **solid shadow**(4px 오프셋 단색 블록)로만 표현.
- **버튼 pressed:** 누를 때 **배경·테두리·글자색·opacity가 바뀌지 않게** 한다. 피드백은 햅틱·눌림 translate만.
- **Primary CTA:** 저장·확인·적용 버튼 면은 **민트**(`bgMint` / `primaryContainer`). 검정·네이비 면 CTA 금지.
- **일러스트:** 제품 UI 본문에 큰 일러스트 박스를 기본으로 두지 않는다. empty state·스토리 WebView 등 **의도된 화면**만 예외.

### Color Palette (뮤티드 파스텔)

자극적 원색 대신 톤 다운된 팔레트. 상세 hex는 [`city-pop-minimalist.md`](./city-pop-minimalist.md) frontmatter 참고.

| 역할 | Hex (예) | 무드 |
|------|----------|------|
| **Main Background** | `#F5F2EB` Warm Beige | 아날로그 종이 질감 |
| **Primary Accent** | `#356668` Mint / `#2B3A67` Indigo 계열 | 집중·완료·구조 |
| **Secondary Accent** | `#D4A5A5` Dusty Pink | 삭제·긴급·하이라이트 (절제) |
| **Sub Accent** | `#A8DADC` / `#A8C3B8` Soft Mint | 루틴·구간·활성 칩 |

### Spacing & Typography

- **여유로운 여백:** `padding`·`gap`을 넉넉히. 섹션 간 `lg`(48px) 리듬 권장.
- **타이포:** Hanken Grotesk. 헤드라인 700–800, 본문 넉넉한 line-height, 라벨은 uppercase + letter-spacing.
- **아날로그 텍스처 (선택):** 배경 noise 2–3% — 에셋 있을 때만.

### Layout

- **모바일:** 단일 컬럼, 좌우 `margin-mobile` 20px.
- **데스크톱/Web:** max-width **800px** 중앙 정렬 (타임라인·에세이형 레이아웃 참고).
- **카드 기반:** 현재 상태를 한눈에 — 프로그레스·수치 텍스트 병행.

---

## 3. 화면별 적용 메모 (현재 제품)

| 영역 | 가이드 |
|------|--------|
| **오늘 / 데이플랜** | flat 행·칩·타임라인. 카테고리별 accent 아이콘으로 단조 방지. |
| **목표 상세 설정** | 배경 장식용 원형·블롭 **금지** (규칙 §7.2.8). |
| **하단 탭** | 아이콘 only, pill 형태 |
| **설정** | `RetroFlatColors` 테마별 surface/ink — 라이트 카드에 다크 텍스트 혼용 금지 |

---

## 4. Cursor / AI 리팩터링 프롬프트

컴포넌트 스타일 리팩터 시 아래를 컨텍스트로 제공한다.

```text
Refactor the styling to match our "Retro City-Pop Flat" identity per docs/design/DESIGN_CONCEPT.md and docs/design/city-pop-minimalist.md.

1. Remove blur box-shadows, modern gradients, and backdrop blur.
2. Use solid fills from the muted pastel palette (Warm Beige, Mint #356668, Indigo tertiary, Dusty Pink sparingly).
3. Apply crisp solid borders (2px in RN code; 1–2px in spec) on actionable components.
4. Default border-radius 0; chips/badges up to 4px only.
5. Ample padding and vertical rhythm (8px base, 48px section gaps).
6. Depth via tonal layering + 4px solid shadow offset, not blur.
7. User-facing copy in Korean (app name POKIT only in English).
```

---

## 5. 관련 파일 (구현)

| 용도 | 경로 |
|------|------|
| 디자인 토큰 | `src/shared/config/retroFlat.ts` |
| 테마·폰트 | `src/shared/config/theme.ts` |
| 탭 pill | `src/shared/lib/ui/tabPillColors.ts` |
| FSD·UX 규칙 | `.cursor/rules/pokit-Expo.mdc` §7 |
| 개발 가이드 | `.cursor/skills/pokit-dev-guide/SKILL.md` |

---

## 6. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-04 | 초안 — City Pop Minimalist 토큰 + PokitStory 컨셉 통합 저장 (스토리북 대체) |
