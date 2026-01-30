import { Direction, World } from "./world";

// 미니맵 색상(타일 타입별)
const TILE_COLORS = {
  wall: "#2f3842",
  empty: "#0f151c",
  about: "#6bb3d6",
  gate1: "#4fd36c",
  gate2: "#4fd36c",
  gate3: "#4fd36c"
} as const;

export function renderMinimap(canvas: HTMLCanvasElement, world: World) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Minimap 2D context unavailable");
  }

  // 그리드 전체를 캔버스에 맞춰 스케일링
  const { width, height, grid, player } = world;
  const pad = 4;
  const size = Math.min(canvas.width, canvas.height) - pad * 2;
  const cell = Math.floor(size / Math.max(width, height));
  const mapW = cell * width;
  const mapH = cell * height;
  const offsetX = Math.floor((canvas.width - mapW) / 2);
  const offsetY = Math.floor((canvas.height - mapH) / 2);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f151c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 타일 렌더(미니맵은 그리드가 소스 오브 트루스)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = grid[y * width + x];
      ctx.fillStyle = TILE_COLORS[tile];
      ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }

  ctx.strokeStyle = "#45505b";
  ctx.strokeRect(offsetX, offsetY, mapW, mapH);

  // 플레이어 방향 삼각형
  const cx = offsetX + player.x * cell + cell / 2;
  const cy = offsetY + player.y * cell + cell / 2;
  const sizePx = Math.max(4, Math.floor(cell * 0.6));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((player.dir * Math.PI) / 2);
  ctx.beginPath();
  ctx.moveTo(0, -sizePx);
  ctx.lineTo(sizePx * 0.75, sizePx);
  ctx.lineTo(-sizePx * 0.75, sizePx);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}
