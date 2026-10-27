# 사용 설명서 그림

앱 안의 설명서는 현재 공개된 화면과 실제 UI 라벨을 기준으로 만듭니다. 주인공·장면·메이트를 구분하고 기능 플래그가 꺼진 화면을 대표 동작으로 안내하지 않습니다.

- 설명 내용: `src/pages/guide-book/lib/guideBookPages.ts`
- 그림 구현: `src/pages/guide-book/ui/GuideBookFigures.tsx`
- 화면 조립: `src/pages/guide-book/ui/GuideBookPage.tsx`

이미지를 추가할 때는 실제 에셋 등록 방식을 먼저 확인합니다. 존재하지 않는 스크린샷 맵이나 예전 파일명을 가정해 require 경로를 만들지 않습니다. 실기기 캡처는 앱 UI를 임의로 재구성하지 않고 지원 언어와 현재 화면에 맞춥니다.

제품 기준은 [정체성](../../docs/product/identity.md), 시각적 기준은 [종이와 만년필 디자인](../../docs/design/paper-and-ink.md)을 참고합니다.
