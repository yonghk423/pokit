---
name: City Pop Minimalist
colors:
  surface: '#fbf8ff'
  surface-dim: '#d7d8f4'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2ff'
  surface-container: '#edecff'
  surface-container-high: '#e6e6ff'
  surface-container-highest: '#e0e0fc'
  on-surface: '#181a2e'
  on-surface-variant: '#404848'
  inverse-surface: '#2d2f44'
  inverse-on-surface: '#f1efff'
  outline: '#707979'
  outline-variant: '#c0c8c8'
  surface-tint: '#356668'
  primary: '#356668'
  on-primary: '#ffffff'
  primary-container: '#a8dadc'
  on-primary-container: '#306163'
  inverse-primary: '#9ecfd1'
  secondary: '#625e56'
  on-secondary: '#ffffff'
  secondary-container: '#e8e2d8'
  on-secondary-container: '#68645c'
  tertiary: '#436086'
  on-tertiary: '#ffffff'
  tertiary-container: '#b6d3ff'
  on-tertiary-container: '#3e5b81'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b9ecee'
  primary-fixed-dim: '#9ecfd1'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#1a4e50'
  secondary-fixed: '#e8e2d8'
  secondary-fixed-dim: '#ccc6bc'
  on-secondary-fixed: '#1e1b15'
  on-secondary-fixed-variant: '#4a463f'
  tertiary-fixed: '#d3e3ff'
  tertiary-fixed-dim: '#abc8f4'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#2a486d'
  background: '#fbf8ff'
  on-background: '#181a2e'
  surface-variant: '#e0e0fc'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 120px
---

# City Pop Minimalist — Design Tokens & Style Rules

POKIT 앱 UI의 **색·타이포·간격 단일 기준**. 코드 구현은 [`src/shared/config/retroFlat.ts`](../../src/shared/config/retroFlat.ts), [`src/shared/config/theme.ts`](../../src/shared/config/theme.ts)와 동기화한다.

한글 UX·레트로 시티팝 정체성은 [`DESIGN_CONCEPT.md`](./DESIGN_CONCEPT.md)를 함께 본다.

---

## Brand & Style

The brand personality is calm, nostalgic, and meticulously organized. It draws inspiration from Japanese city-pop aesthetics—specifically the clean, illustrative style of 80s album art—reinterpreted through a modern minimalist lens. The UI evokes the feeling of a tidy physical workspace at dusk: quiet, functional, and aesthetically pleasing.

The design style is **Flat Brutalism Lite**. It utilizes consistent 1px black outlines to define structure, avoiding all shadows, gradients, and 3D effects. The interface relies on flat color blocking, heavy whitespace, and a subtle grainy paper texture to provide a tactile, analog feel without the complexity of skeuomorphism.

> **코드 참고:** RN 구현에서는 가독성·터치 영역을 위해 테두리 `RETRO_BORDER_WIDTH = 2`를 쓰는 경우가 많다. blur 그림자는 쓰지 않고, **solid shadow**(4px 오프셋 단색 블록)만 허용한다.

---

## Colors

The palette is a sophisticated mix of "Retro-Pastels" and deep indigo.

- **Primary (Mint Green):** Used for focus states, primary actions, and "complete" indicators.
- **Secondary (Warm Beige):** The foundational surface color, providing a grainy, recycled paper feel.
- **Tertiary (Indigo Blue):** Reserved for high-contrast text and primary structural borders.
- **Accent (Dusty Pink):** Used sparingly for urgent tags, delete actions, or highlight markers.
- **Neutral:** A very dark charcoal (not true black) for all outlines and body text to maintain a softer, printed look.

Backgrounds should use a subtle noise overlay (2–3% opacity) to simulate paper texture when a texture asset is available.

### 다크 모드

라이트 토큰의 `inverse-*` 계열과 [`RetroFlatColors.dark`](../../src/shared/config/retroFlat.ts)가 대응한다.

---

## Typography

The system uses **Hanken Grotesk** across all levels to maintain a clean, contemporary feel that complements the geometric lines of the UI.

- **Headlines:** Use heavy weights (700–800) with tight letter spacing to mimic the bold titling found on Japanese vinyl sleeves.
- **Body:** Set with generous line height to ensure maximum legibility and a "breathable" layout.
- **Labels:** Always uppercase with increased letter spacing for small metadata, tags, and category labels.
- **Contrast:** High-contrast text (Indigo on Beige) is preferred for all functional content.

앱 폰트 로드: [`src/application/useCityPopFonts.ts`](../../src/application/useCityPopFonts.ts)

---

## Layout & Spacing

The design follows a **Fixed Column Grid** for desktop and a **Fluid Margin Grid** for mobile.

- **Desktop:** A centralized 8-column layout (max-width 800px) to keep the todo list focused and prevent eye strain.
- **Mobile:** Single column with 20px side margins (`margin-mobile`).
- **Rhythm:** An 8px base unit governs all padding and margins. Vertical rhythm is strictly enforced to create a "lined paper" effect. Elements should be separated by clear, generous whitespace (48px+) to prevent the interface from feeling cluttered.

---

## Elevation & Depth

Depth is achieved exclusively through **Tonal Layering** and **Line Weight**, never through blur shadows.

1. **Base Level:** Warm Beige texture.
2. **Interactive Level:** Elements (cards, inputs) are encased in a solid outline (Indigo / black).
3. **Active/Pressed State:** When an element is focused or active, it receives a **solid shadow** offset (a 4px block of Mint or Indigo shifted right and down) rather than a blur.
4. **Dividers:** Use outline lines to separate list items, echoing the aesthetics of a classic planner.

구현 헬퍼: `solidShadowBlock`, `SOLID_SHADOW_OFFSET` in `retroFlat.ts`.

---

## Shapes

The design system utilizes **Zero Roundedness (Sharp)** as the default. All containers, buttons, and input fields feature 90-degree corners. This reinforces the architectural and precision-based feel of the minimalist Japanese aesthetic. The only exception is the custom checkbox, which remains a sharp square to match the system.

> **예외:** 칩·구간 배지 등 메타 라벨은 `border-radius: 0` ~ `4px`까지 허용 ([`DESIGN_CONCEPT.md`](./DESIGN_CONCEPT.md) §2).

---

## Components

- **Todo Items:** Flat rows with a bottom border. On hover/press, the background shifts from Beige to a very pale Mint.
- **Buttons:** Sharp rectangles with an outline. Primary buttons use a Mint fill; secondary buttons are transparent with an outline. Text is always bold and centered.
- **Checkboxes:** Custom 20×20px sharp squares. When checked, they fill with Indigo and display a Mint "check" icon.
- **Input Fields:** Minimalist lines or sharp boxes with the "Label" floating in a small Indigo box on the top-left edge of the border.
- **Chips/Tags:** Small sharp boxes with a Dusty Pink or Indigo fill and white/beige text, used for categories.
- **Empty States:** Simple, geometric line-art illustrations (e.g., a stylized coffee cup or a sunset horizon) in 1px Indigo lines to maintain the City Pop vibe.

---

## 코드 매핑 (Quick Reference)

| 문서 토큰 | 코드 위치 |
|-----------|-----------|
| colors.* | `RetroFlatColors.light` / `.dark` |
| spacing.* | `CityPopSpacing` |
| typography.* | `CityPopTypography`, `Fonts` in `theme.ts` |
| solid shadow | `SOLID_SHADOW_OFFSET`, `solidShadowBlock()` |
| tab pill | `tabPillColors()` |
