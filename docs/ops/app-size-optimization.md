# 앱 용량 최적화 메모

나중에 App Store / 인앱 업데이트 안내에 옮길 때 참고용.  
관련 작업일: 2026-09-21 (WebP 전환)

---

## 한 줄 요약 (스토어·릴리즈 노트용 초안)

- 앱에 포함된 일러스트·스플래시 이미지를 WebP로 바꿔 **에셋 용량을 크게 줄였어요.**
- (영문 초안) Reduced bundled illustration assets by converting PNGs to WebP.

한국어 사용자 대면 예시:

> 앱 용량을 줄이기 위해 이미지 포맷을 최적화했어요.

너무 기술적이면 「용량 최적화」정도만 적어도 됨.

---

## 이번 WebP 작업 — 사실 관계

### 측정 (소스 `assets/` 폴더)

| | 용량 |
|--|------|
| 변경 전 | 약 **20.0 MB** (PNG 위주) |
| 변경 후 | 약 **4.6 MB** |
| 절감 | 약 **15.4 MB (−77%)** |

`npx expo export --platform ios` 후 `dist`는 JS·압축이 섞여 **약 10MB 전후** 감소로 체감될 수 있음.  
**설치 IPA(~130MB대) ≠ dist** — 네이티브(Firebase 등)는 별도.

### WebP로 바꾼 파일 (25)

- `assets/splash.webp` ~ `splash6.webp`
- `assets/pokit4.webp`, `assets/main.webp`
- `assets/routine/screen-1.webp` ~ `screen-17.webp`
- quality **80**, 해상도는 유지 (리사이즈 없음)

코드 `require(...png)` → `require(...webp)` 갱신:

- `src/application/splashAssets.ts`
- `src/shared/lib/welcome-intro-assets.ts`
- `src/shared/ui/routine-atmosphere/routineAtmosphereAssets.ts`
- `src/shared/ui/settings-atmosphere/settingsAtmosphereAssets.ts`
- `src/widgets/daily-rhythm-time-field/ui/DayCycleDial.tsx`

### PNG로 남긴 파일 (의도)

| 파일 | 이유 |
|------|------|
| `assets/pokit5.png` | 앱 아이콘 / 알림 아이콘 / favicon (`app.json`) |
| `assets/splash-collage.png` | `expo-splash-screen` 네이티브 스플래시 |

남은 `assets` 용량의 대부분은 위 두 PNG (~3.7MB).

### 원래부터 JPG

- `assets/onboarding/*.jpg` (히어로·썸네일) — 변경 없음

---

## 다음에 할 수 있는 것 (아직 안 함)

1. **`splash-collage.png` WebP 전환** — Expo splash 플러그인 WebP 호환 확인 후
2. **해상도 축소** — UI에 맞게 768 이하 등 (추가 절감)
3. **폰트 선택 로드** — `@expo-google-fonts` 6종·다수 weight를 시작 시 전부 로드 중
4. **네이티브 의존성** — Firebase 등 (IPA 쪽, dist와 별개)

---

## 용량 확인 방법

```bash
# JS + 번들 에셋 산출물
npx expo export --platform ios
du -sh dist

# 소스 에셋만
du -sh assets
```

`react-native-bundle-visualizer`는 Expo에서 `@react-native-community/cli`가 없어 실패할 수 있음 → `expo export` 권장.

최종 설치 용량은 EAS/Xcode App Thinning 리포트로 확인.

---

## 관련 룰

- 앱스토어 **소개 스크린샷** 합성: `.cursor/rules/app-store-screenshots.mdc`  
  (소개 이미지는 앱 번들에 넣지 말 것 — `require` 금지)
