# CRPG Grid Renderer (Clean-Room)

16-bit CRPG(Might & Magic/Wizardry) 감성을 목표로 한 **1인칭 그리드 렌더러**입니다.  
정확한 그리드 샘플링이 최우선이며, 미니맵을 **소스 오브 트루스**로 둡니다.

## 실행

```bash
npm install
npm run dev
```

## 조작

- 이동: ↑/↓ 또는 W/S
- 회전: ←/→ 또는 A/D (Q/E도 가능)
- 터치: 하단 D-pad / A/B 버튼
- 모달 닫기: B 또는 Esc

## 프로젝트 구조

- `src/world.ts` — 그리드/플레이어/이동/샘플링(정수 좌표만 사용)
- `src/renderer.ts` — 고정 depth 테이블 렌더러(샘플 결과만 사용)
- `src/minimap.ts` — 미니맵(그리드 정확도 검증)
- `src/main.ts` — 입력 처리, 렌더 루프, 모달
- `src/assets.ts` — 에셋 키 ↔ 경로 매핑
- `public/styles.css` — 레이아웃/UI 스타일
- `public/index.html` — 레이아웃/버튼/모달 DOM

## 에셋 교체 가이드 (픽셀아트 적용)

에셋은 `public/assets/**` 아래 PNG 파일로 분리되어 있습니다.  
**파일 이름만 그대로 유지**하면 코드 수정 없이 교체 가능합니다.

대표 경로:
- 월드: `public/assets/world/wall.png`, `floor.png`, `ceiling.png`, `gate_frame.png`
- UI: `public/assets/ui/dpad_*.png`, `btn_a.png`, `btn_b.png`, `panel.png`
- 모달: `public/assets/modal/frame.png`, `close.png`, `about.png`, `projects.png`

샘플 에셋 다시 만들기:
```bash
npm run gen:assets
```

> 픽셀아트 선명도를 위해 `image-rendering: pixelated` 적용됨.  
> 캔버스 내부 해상도는 640×480 고정(4:3).

## 스페셜 타일 / 모달

월드에는 4개의 스페셜 타일이 있습니다.
- about, gate1, gate2, gate3

해당 타일에 서면 모달이 열리고, 게이트는 링크로 이동합니다.  
플레이스홀더 페이지:
- `public/pages/gate1.html`
- `public/pages/gate2.html`
- `public/pages/gate3.html`

## 디버그

`src/renderer.ts`의 `DEBUG = true`로 변경 시:
- depth 사각형 외곽선 표시
- depth 숫자 라벨 표시
- 각 depth의 front/left/right 좌표 콘솔 출력

**미니맵과 1인칭이 다르면 1인칭 로직이 틀린 것**입니다.
