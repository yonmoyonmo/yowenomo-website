// 방향 정의: 0=북, 1=동, 2=남, 3=서
export type Direction = 0 | 1 | 2 | 3;
export type TileType =
  | "wall"
  | "empty"
  | "about"
  | "gate1"
  | "gate2"
  | "gate3";

export interface Player {
  x: number;
  y: number;
  dir: Direction;
}

export interface World {
  width: number;
  height: number;
  grid: TileType[];
  player: Player;
}

export interface Sample {
  depth: number;
  front: { x: number; y: number; tile: TileType };
  left: { x: number; y: number; tile: TileType };
  right: { x: number; y: number; tile: TileType };
}

const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 }
};

// 월드 생성: 벽/스페셜 타일 배치
export function createWorld(): World {
  const width = 18;
  const height = 18;
  const grid: TileType[] = new Array(width * height).fill("empty");

  // 외곽 벽
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        grid[y * width + x] = "wall";
      }
    }
  }

  // 내부 벽 세그먼트(폐곡선 방지)
  const walls = [
    // outer ring already handled
    // longer straight segments with gaps; no enclosed boxes
    [5, 1], [5, 2], [5, 4], [5, 5], [5, 6], [5, 7], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13],
    [12, 2], [12, 3], [12, 4], [12, 6], [12, 7], [12, 8], [12, 9], [12, 11], [12, 12], [12, 13], [12, 14],
    [2, 7], [3, 7], [4, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7],
    [3, 13], [4, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [13, 13], [14, 13], [15, 13]
  ];
  walls.forEach(([x, y]) => {
    grid[y * width + x] = "wall";
  });

  // 스페셜 타일(진입 가능 위치)
  grid[2 * width + 2] = "about";
  grid[4 * width + 9] = "gate1";
  grid[10 * width + 9] = "gate2";
  grid[14 * width + 15] = "gate3";

  return {
    width,
    height,
    grid,
    player: { x: 1, y: 1, dir: 1 }
  };
}

// 좌표가 범위를 벗어나면 벽으로 처리
export function getTile(world: World, x: number, y: number): TileType {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) {
    return "wall";
  }
  return world.grid[y * world.width + x];
}

export function turnLeft(world: World) {
  world.player.dir = ((world.player.dir + 3) % 4) as Direction;
}

export function turnRight(world: World) {
  world.player.dir = ((world.player.dir + 1) % 4) as Direction;
}

// 전진(벽 충돌 시 무시)
export function moveForward(world: World) {
  const { dx, dy } = DIR_VECTORS[world.player.dir];
  const nx = world.player.x + dx;
  const ny = world.player.y + dy;
  const tile = getTile(world, nx, ny);
  if (tile === "wall") {
    return;
  }
  world.player.x = nx;
  world.player.y = ny;
}

// 후진(벽 충돌 시 무시)
export function moveBackward(world: World) {
  const { dx, dy } = DIR_VECTORS[world.player.dir];
  const nx = world.player.x - dx;
  const ny = world.player.y - dy;
  const tile = getTile(world, nx, ny);
  if (tile === "wall") {
    return;
  }
  world.player.x = nx;
  world.player.y = ny;
}

// 그리드 샘플링(단일 소스 오브 트루스)
export function getFrontTile(world: World, depth: number) {
  const { dx, dy } = DIR_VECTORS[world.player.dir];
  const x = world.player.x + dx * depth;
  const y = world.player.y + dy * depth;
  return { x, y, tile: getTile(world, x, y) };
}

export function getLeftTile(world: World, depth: number) {
  const { dx, dy } = DIR_VECTORS[world.player.dir];
  const leftDir = ((world.player.dir + 3) % 4) as Direction;
  const left = DIR_VECTORS[leftDir];
  const x = world.player.x + dx * depth + left.dx;
  const y = world.player.y + dy * depth + left.dy;
  return { x, y, tile: getTile(world, x, y) };
}

export function getRightTile(world: World, depth: number) {
  const { dx, dy } = DIR_VECTORS[world.player.dir];
  const rightDir = ((world.player.dir + 1) % 4) as Direction;
  const right = DIR_VECTORS[rightDir];
  const x = world.player.x + dx * depth + right.dx;
  const y = world.player.y + dy * depth + right.dy;
  return { x, y, tile: getTile(world, x, y) };
}

// 깊이 테이블 샘플 생성(렌더러가 이 결과만 사용)
export function getSamples(world: World, maxDepth: number): Sample[] {
  const samples: Sample[] = [];
  for (let d = 1; d <= maxDepth; d += 1) {
    samples.push({
      depth: d,
      front: getFrontTile(world, d),
      left: getLeftTile(world, d),
      right: getRightTile(world, d)
    });
  }
  return samples;
}
