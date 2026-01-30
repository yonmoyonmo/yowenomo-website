import { Sample, TileType } from "./world";
import { SpriteKey, SpriteStore } from "./assets";

// 화면상의 사각형(렌더링 계산용)
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 렌더링 파라미터(로직이 맞는 상태에서만 튜닝)
const MAX_DEPTH = 8; // 깊이 테이블 크기
const SCALE_BASE = 0.95; // depth 증가 시 완만한 스케일 감소
const VIEW_W = 640; // 캔버스 내부 해상도
const VIEW_H = 480;
const WALL_HEIGHT_RATIO = 0.52; // 벽 높이 비율
const WALL_CENTER_Y = 0.48; // 벽 세로 중심 위치
const DEBUG = false; // 디버그: 외곽선/라벨/콘솔 로그
const FOG_STRENGTH = 0.8; // 0..1, 멀수록 더 어둡게
const FOG_OVERLAY = 0.48; // 포그 오버레이 강도
const FOG_COLOR = "#0f141b"; // 포그 색

// 에셋이 없을 때 사용하는 기본 색상
const COLORS = {
  wall: "#6d7278",
  sideL: "#5b6066",
  sideR: "#565b61",
  gate: "#4fd36c",
  floor: "#2a2f36",
  ceiling: "#1f252c"
};

// 스페셜 타일 여부
function isSpecial(tile: TileType) {
  return tile === "about" || tile === "gate1" || tile === "gate2" || tile === "gate3";
}

export function createRenderer(canvas: HTMLCanvasElement, sprites: SpriteStore) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  // 패턴 캐시(타일링 시 성능 향상)
  const patternCache = new Map<SpriteKey, CanvasPattern | null>();

  function scaleAtDepth(depth: number) {
    // depth별 스케일 곡선(완만한 원근)
    return Math.pow(SCALE_BASE, depth - 1);
  }

  function rectAtDepth(depth: number): Rect {
    // depth에 대응하는 전면 벽 사각형 계산
    const scale = scaleAtDepth(depth);
    const w = VIEW_W * 0.72 * scale;
    const h = VIEW_H * WALL_HEIGHT_RATIO * scale;
    const centerY = VIEW_H * WALL_CENTER_Y;
    return {
      x: (VIEW_W - w) / 2,
      y: centerY - h / 2,
      w,
      h
    };
  }

  function depthLimit(samples: Sample[]) {
    // 전면 벽을 만나면 그 depth에서 시야 종료
    for (const s of samples) {
      if (s.front.tile === "wall") {
        return s.depth;
      }
    }
    return Math.min(MAX_DEPTH, samples.length);
  }

  function drawRect(rect: Rect, color: string) {
    // 기본 사각형 채우기
    ctx!.fillStyle = color;
    ctx!.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  function drawSprite(key: SpriteKey, rect: Rect): boolean {
    // 단일 스프라이트 그리기(있으면 true)
    const sprite = sprites.get(key);
    if (!sprite) {
      return false;
    }
    ctx!.drawImage(sprite, rect.x, rect.y, rect.w, rect.h);
    return true;
  }

  function drawTiled(key: SpriteKey, rect: Rect): boolean {
    // 스프라이트를 패턴으로 반복 타일링(벽 연속성용)
    const sprite = sprites.get(key);
    if (!sprite) {
      return false;
    }
    let pattern = patternCache.get(key) ?? null;
    if (!pattern) {
      pattern = ctx!.createPattern(sprite, "repeat");
      patternCache.set(key, pattern ?? null);
    }
    if (!pattern) {
      return false;
    }
    ctx!.save();
    ctx!.fillStyle = pattern;
    ctx!.translate(rect.x, rect.y);
    ctx!.fillRect(0, 0, rect.w, rect.h);
    ctx!.restore();
    return true;
  }

  function fogFactor(depth: number) {
    // depth를 0..1 범위로 정규화
    return Math.min(1, (depth - 1) / Math.max(1, MAX_DEPTH - 1));
  }

  function withFog(depth: number, rect: Rect, drawFn: () => void) {
    // 실제 렌더 + 포그 오버레이
    const fog = fogFactor(depth);
    ctx!.save();
    ctx!.globalAlpha = 1 - fog * FOG_STRENGTH;
    drawFn();
    ctx!.globalAlpha = fog * FOG_OVERLAY;
    ctx!.fillStyle = FOG_COLOR;
    ctx!.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx!.restore();
  }

  function drawTrapezoid(near: Rect, far: Rect, side: "left" | "right", color: string) {
    // 좌/우 벽용 완만한 사다리꼴
    ctx!.fillStyle = color;
    ctx!.beginPath();
    if (side === "left") {
      ctx!.moveTo(far.x, far.y);
      ctx!.lineTo(near.x, near.y);
      ctx!.lineTo(near.x, near.y + near.h);
      ctx!.lineTo(far.x, far.y + far.h);
    } else {
      ctx!.moveTo(far.x + far.w, far.y);
      ctx!.lineTo(near.x + near.w, near.y);
      ctx!.lineTo(near.x + near.w, near.y + near.h);
      ctx!.lineTo(far.x + far.w, far.y + far.h);
    }
    ctx!.closePath();
    ctx!.fill();
  }

  function drawStrip(near: Rect, far: Rect, type: "floor" | "ceiling") {
    // 바닥/천장용 스트립(사각형 대신 사다리꼴)
    ctx!.fillStyle = type === "floor" ? COLORS.floor : COLORS.ceiling;
    ctx!.beginPath();
    if (type === "floor") {
      const yTop = far.y + far.h;
      const yBottom = near.y + near.h;
      ctx!.moveTo(far.x, yTop);
      ctx!.lineTo(far.x + far.w, yTop);
      ctx!.lineTo(near.x + near.w, yBottom);
      ctx!.lineTo(near.x, yBottom);
    } else {
      const yBottom = far.y;
      const yTop = near.y;
      ctx!.moveTo(near.x, yTop);
      ctx!.lineTo(near.x + near.w, yTop);
      ctx!.lineTo(far.x + far.w, yBottom);
      ctx!.lineTo(far.x, yBottom);
    }
    ctx!.closePath();
    ctx!.fill();
  }

  function debugDraw(depth: number, near: Rect, far: Rect) {
    // 디버그: depth 사각형 외곽선 표시
    ctx!.strokeStyle = "#66aaff";
    ctx!.strokeRect(near.x, near.y, near.w, near.h);
    ctx!.strokeStyle = "#335577";
    ctx!.strokeRect(far.x, far.y, far.w, far.h);
    ctx!.fillStyle = "#ffffff";
    ctx!.fillText(String(depth), near.x + 6, near.y + 16);
  }

  function render(samples: Sample[]) {
    // 매 프레임 전체 렌더
    ctx!.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx!.fillStyle = "#0f151c";
    ctx!.fillRect(0, 0, VIEW_W, VIEW_H);

    // 고정 depth 테이블: FAR -> NEAR 순서로 렌더
    const maxDepth = depthLimit(samples);

    if (DEBUG) {
      for (const s of samples) {
        console.log(
          `[depth ${s.depth}] front=(${s.front.x},${s.front.y}) ${s.front.tile} ` +
          `left=(${s.left.x},${s.left.y}) ${s.left.tile} ` +
          `right=(${s.right.x},${s.right.y}) ${s.right.tile}`
        );
      }
    }

    for (let d = maxDepth; d >= 1; d -= 1) {
      // 사전 샘플링 결과만 사용(추가 로직/레이캐스트 금지)
      const s = samples[d - 1];
      const near = rectAtDepth(d);
      const far = rectAtDepth(d + 1);

      const leftIsWall = s.left.tile === "wall";
      const rightIsWall = s.right.tile === "wall";
      const useFullWidth = !leftIsWall && !rightIsWall;
      const nearStrip = useFullWidth ? { x: 0, y: near.y, w: VIEW_W, h: near.h } : near;
      const farStrip = useFullWidth ? { x: 0, y: far.y, w: VIEW_W, h: far.h } : far;

      // Ceiling strip
      // 천장 스트립(깊이별로 누적)
      ctx!.save();
      ctx!.beginPath();
      const ceilBottom = farStrip.y;
      const ceilTop = nearStrip.y;
      ctx!.moveTo(nearStrip.x, ceilTop);
      ctx!.lineTo(nearStrip.x + nearStrip.w, ceilTop);
      ctx!.lineTo(farStrip.x + farStrip.w, ceilBottom);
      ctx!.lineTo(farStrip.x, ceilBottom);
      ctx!.closePath();
      ctx!.clip();
      const ceilRect = { x: nearStrip.x, y: ceilTop, w: nearStrip.w, h: ceilBottom - ceilTop };
      withFog(d, ceilRect, () => {
        if (!drawTiled("ceiling", ceilRect)) {
          drawStrip(nearStrip, farStrip, "ceiling");
        }
      });
      ctx!.restore();

      // Floor strip
      // 바닥 스트립(깊이별로 누적)
      ctx!.save();
      ctx!.beginPath();
      const floorTop = farStrip.y + farStrip.h;
      const floorBottom = nearStrip.y + nearStrip.h;
      ctx!.moveTo(farStrip.x, floorTop);
      ctx!.lineTo(farStrip.x + farStrip.w, floorTop);
      ctx!.lineTo(nearStrip.x + nearStrip.w, floorBottom);
      ctx!.lineTo(nearStrip.x, floorBottom);
      ctx!.closePath();
      ctx!.clip();
      const floorRect = { x: nearStrip.x, y: floorTop, w: nearStrip.w, h: floorBottom - floorTop };
      withFog(d, floorRect, () => {
        if (!drawTiled("floor", floorRect)) {
          drawStrip(nearStrip, farStrip, "floor");
        }
      });
      ctx!.restore();

      // 천장/바닥을 화면 가장자리까지 채워서 빈 공간 제거
      const topFill = { x: 0, y: 0, w: VIEW_W, h: near.y };
      const bottomFill = { x: 0, y: near.y + near.h, w: VIEW_W, h: VIEW_H - (near.y + near.h) };
      // 가까운 레이어가 더 진하게 보이도록 조정
      const depthShade = 1 - Math.min(0.35, (d - 1) * 0.05);
      const shadedCeil = `rgba(31, 37, 44, ${depthShade})`;
      const shadedFloor = `rgba(42, 47, 54, ${depthShade})`;
      withFog(d, topFill, () => {
        if (!drawTiled("ceiling", topFill)) {
          drawRect(topFill, shadedCeil);
        }
      });
      withFog(d, bottomFill, () => {
        if (!drawTiled("floor", bottomFill)) {
          drawRect(bottomFill, shadedFloor);
        }
      });

      if (s.left.tile === "wall") {
        // 좌측 벽
        ctx!.save();
        ctx!.beginPath();
        ctx!.moveTo(far.x, far.y);
        ctx!.lineTo(near.x, near.y);
        ctx!.lineTo(near.x, near.y + near.h);
        ctx!.lineTo(far.x, far.y + far.h);
        ctx!.closePath();
        ctx!.clip();
        const leftRect = { x: far.x, y: far.y, w: near.x - far.x, h: near.y + near.h - far.y };
        withFog(d, leftRect, () => {
          if (!drawTiled("wall_left", leftRect)) {
            drawTrapezoid(near, far, "left", COLORS.sideL);
          }
        });
        ctx!.restore();
      }
      if (s.right.tile === "wall") {
        // 우측 벽
        ctx!.save();
        ctx!.beginPath();
        ctx!.moveTo(far.x + far.w, far.y);
        ctx!.lineTo(near.x + near.w, near.y);
        ctx!.lineTo(near.x + near.w, near.y + near.h);
        ctx!.lineTo(far.x + far.w, far.y + far.h);
        ctx!.closePath();
        ctx!.clip();
        const rightRect = { x: near.x + near.w, y: far.y, w: far.x + far.w - (near.x + near.w), h: near.y + near.h - far.y };
        withFog(d, rightRect, () => {
          if (!drawTiled("wall_right", rightRect)) {
            drawTrapezoid(near, far, "right", COLORS.sideR);
          }
        });
        ctx!.restore();
      }

      // 벽 옆면이 화면 가장자리까지 이어지도록 채움
      if (s.left.tile === "wall") {
        ctx!.save();
        ctx!.beginPath();
        ctx!.moveTo(0, far.y);
        ctx!.lineTo(near.x, near.y);
        ctx!.lineTo(near.x, near.y + near.h);
        ctx!.lineTo(0, far.y + far.h);
        ctx!.closePath();
        const fillRect = { x: 0, y: far.y, w: near.x, h: near.y + near.h - far.y };
        withFog(d, fillRect, () => {
          if (!drawTiled("wall", fillRect)) {
            drawRect(fillRect, COLORS.wall);
          }
        });
        ctx!.restore();
      }
      if (s.right.tile === "wall") {
        ctx!.save();
        ctx!.beginPath();
        ctx!.moveTo(VIEW_W, far.y);
        ctx!.lineTo(near.x + near.w, near.y);
        ctx!.lineTo(near.x + near.w, near.y + near.h);
        ctx!.lineTo(VIEW_W, far.y + far.h);
        ctx!.closePath();
        const fillRect = {
          x: near.x + near.w,
          y: far.y,
          w: VIEW_W - (near.x + near.w),
          h: near.y + near.h - far.y
        };
        withFog(d, fillRect, () => {
          if (!drawTiled("wall", fillRect)) {
            drawRect(fillRect, COLORS.wall);
          }
        });
        ctx!.restore();
      }

      // 전면 벽만 있고 좌/우가 비어있을 때 빈 삼각 영역 채움
      if (s.front.tile === "wall") {
        if (s.left.tile !== "wall") {
          ctx!.save();
          ctx!.beginPath();
          ctx!.moveTo(far.x, far.y);
          ctx!.lineTo(near.x, near.y);
          ctx!.lineTo(near.x, near.y + near.h);
          ctx!.lineTo(far.x, far.y + far.h);
          ctx!.closePath();
          ctx!.clip();
          const leftRect = { x: far.x, y: far.y, w: near.x - far.x, h: near.y + near.h - far.y };
          withFog(d, leftRect, () => {
            drawTrapezoid(near, far, "left", COLORS.wall);
          });
          ctx!.restore();
        }
        if (s.right.tile !== "wall") {
          ctx!.save();
          ctx!.beginPath();
          ctx!.moveTo(far.x + far.w, far.y);
          ctx!.lineTo(near.x + near.w, near.y);
          ctx!.lineTo(near.x + near.w, near.y + near.h);
          ctx!.lineTo(far.x + far.w, far.y + far.h);
          ctx!.closePath();
          ctx!.clip();
          const rightRect = { x: near.x + near.w, y: far.y, w: far.x + far.w - (near.x + near.w), h: near.y + near.h - far.y };
          withFog(d, rightRect, () => {
            drawTrapezoid(near, far, "right", COLORS.wall);
          });
          ctx!.restore();
        }
      }

      if (isSpecial(s.front.tile)) {
        // 스페셜 타일: 게이트 프레임(통과 가능 오브젝트)
        const gateRect = {
          x: near.x + near.w * 0.2,
          y: near.y + near.h * 0.1,
          w: near.w * 0.6,
          h: near.h * 0.8
        };
        withFog(d, gateRect, () => {
          if (!drawSprite("gate_frame", gateRect)) {
            drawRect(gateRect, COLORS.gate);
          }
        });
      }

      if (s.front.tile === "wall") {
        // 전면 벽
        withFog(d, near, () => {
          if (!drawTiled("wall", near)) {
            drawRect(near, COLORS.wall);
          }
        });
      }

      if (DEBUG) {
        debugDraw(d, near, far);
      }
    }
  }

  return { render };
}
