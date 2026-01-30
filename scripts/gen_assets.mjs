import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

// PNG 바이너리 생성용 시그니처
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  // CRC32 계산(간단 PNG 생성용)
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  // PNG 청크 구성
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function createBuffer(width, height, rgba) {
  // RGBA 버퍼 초기화
  const [r, g, b, a] = rgba;
  const row = Buffer.alloc(width * 4);
  for (let x = 0; x < width; x += 1) {
    const idx = x * 4;
    row[idx] = r;
    row[idx + 1] = g;
    row[idx + 2] = b;
    row[idx + 3] = a;
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[(width * 4 + 1) * y] = 0;
    row.copy(raw, (width * 4 + 1) * y + 1);
  }
  return raw;
}

function setPixel(raw, width, height, x, y, rgba) {
  // 픽셀 단위 쓰기(범위 체크)
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const idx = (width * 4 + 1) * y + 1 + x * 4;
  raw[idx] = rgba[0];
  raw[idx + 1] = rgba[1];
  raw[idx + 2] = rgba[2];
  raw[idx + 3] = rgba[3];
}

function drawRect(raw, width, height, x, y, w, h, rgba) {
  // 외곽선 사각형
  for (let xx = x; xx < x + w; xx += 1) {
    setPixel(raw, width, height, xx, y, rgba);
    setPixel(raw, width, height, xx, y + h - 1, rgba);
  }
  for (let yy = y; yy < y + h; yy += 1) {
    setPixel(raw, width, height, x, yy, rgba);
    setPixel(raw, width, height, x + w - 1, yy, rgba);
  }
}

function fillRect(raw, width, height, x, y, w, h, rgba) {
  // 채움 사각형
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPixel(raw, width, height, xx, yy, rgba);
    }
  }
}

function drawLine(raw, width, height, x0, y0, x1, y1, rgba) {
  // 단순 Bresenham 라인
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (true) {
    setPixel(raw, width, height, x, y, rgba);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function toPng(width, height, raw) {
  // RGBA 버퍼를 PNG 포맷으로 변환
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([pngSignature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function writePng(path, width, height, raw) {
  // 파일 저장(디렉토리 자동 생성)
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, toPng(width, height, raw));
}

// 프로젝트 루트(에셋 출력 경로)
const base = "/Users/yonmo/Desktop/source_code/yowenomo-web-outpost";

// 간단 팔레트(교체용 샘플)
const palette = {
  bg: [17, 24, 32, 255],
  wall: [110, 114, 120, 255],
  wallDark: [84, 88, 94, 255],
  floor: [58, 45, 28, 255],
  floorDark: [42, 32, 20, 255],
  ceiling: [34, 40, 48, 255],
  ceilingDark: [24, 28, 34, 255],
  gate: [79, 211, 108, 255],
  panel: [26, 33, 42, 255],
  panelDark: [20, 26, 34, 255],
  accent: [240, 240, 240, 255]
};

function wallSprite(size) {
  // 벽 텍스처: 벽돌 패턴
  const raw = createBuffer(size, size, palette.wall);
  const brickH = 10;
  const brickW = 18;
  for (let y = 6; y < size; y += brickH) {
    const offset = Math.floor(y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let x = -offset; x < size; x += brickW) {
      drawRect(raw, size, size, x, y, brickW, brickH, palette.wallDark);
    }
  }
  return raw;
}

function floorSprite(size) {
  // 바닥 텍스처
  const raw = createBuffer(size, size, palette.floor);
  for (let y = 0; y < size; y += 6) {
    for (let x = 0; x < size; x += 8) {
      setPixel(raw, size, size, x + (y % 3), y, palette.floorDark);
    }
  }
  return raw;
}

function ceilingSprite(size) {
  // 천장 텍스처
  const raw = createBuffer(size, size, palette.ceiling);
  for (let y = 0; y < size; y += 10) {
    drawLine(raw, size, size, 0, y, size - 1, y, palette.ceilingDark);
  }
  return raw;
}

function gateFrame(size) {
  // 게이트 프레임(스페셜 타일 표식)
  const raw = createBuffer(size, size, [0, 0, 0, 0]);
  const pad = Math.floor(size * 0.2);
  drawRect(raw, size, size, pad, pad, size - pad * 2, size - pad * 2, palette.gate);
  drawRect(raw, size, size, pad + 6, pad + 6, size - pad * 2 - 12, size - pad * 2 - 12, palette.gate);
  return raw;
}

function panelBg(w, h) {
  // 패널 배경
  const raw = createBuffer(w, h, palette.panel);
  drawRect(raw, w, h, 4, 4, w - 8, h - 8, palette.panelDark);
  return raw;
}

function button(size, color) {
  // 버튼 기본 이미지
  const raw = createBuffer(size, size, palette.bg);
  drawRect(raw, size, size, 2, 2, size - 4, size - 4, color);
  return raw;
}

function dpad(size, dir) {
  // 방향 버튼 샘플
  const raw = createBuffer(size, size, palette.bg);
  drawRect(raw, size, size, 2, 2, size - 4, size - 4, [44, 50, 58, 255]);
  const c = Math.floor(size / 2);
  if (dir === "up") drawLine(raw, size, size, c, 10, c, size - 10, palette.accent);
  if (dir === "down") drawLine(raw, size, size, c, size - 10, c, 10, palette.accent);
  if (dir === "left") drawLine(raw, size, size, 10, c, size - 10, c, palette.accent);
  if (dir === "right") drawLine(raw, size, size, size - 10, c, 10, c, palette.accent);
  return raw;
}

function modalFrame(w, h) {
  // 모달 프레임
  const raw = createBuffer(w, h, palette.panel);
  drawRect(raw, w, h, 2, 2, w - 4, h - 4, palette.panelDark);
  drawRect(raw, w, h, 10, 10, w - 20, h - 20, palette.panelDark);
  return raw;
}

// 에셋 기본 사이즈(교체용 가이드)
const worldSize = 192;
const uiBtn = 96;

// 월드 에셋
writePng(`${base}/public/assets/world/wall.png`, worldSize, worldSize, wallSprite(worldSize));
writePng(`${base}/public/assets/world/wall_left.png`, worldSize, worldSize, wallSprite(worldSize));
writePng(`${base}/public/assets/world/wall_right.png`, worldSize, worldSize, wallSprite(worldSize));
writePng(`${base}/public/assets/world/floor.png`, worldSize, worldSize, floorSprite(worldSize));
writePng(`${base}/public/assets/world/ceiling.png`, worldSize, worldSize, ceilingSprite(worldSize));
writePng(`${base}/public/assets/world/gate_frame.png`, worldSize, worldSize, gateFrame(worldSize));

// UI 에셋
writePng(`${base}/public/assets/ui/dpad_up.png`, uiBtn, uiBtn, dpad(uiBtn, "up"));
writePng(`${base}/public/assets/ui/dpad_down.png`, uiBtn, uiBtn, dpad(uiBtn, "down"));
writePng(`${base}/public/assets/ui/dpad_left.png`, uiBtn, uiBtn, dpad(uiBtn, "left"));
writePng(`${base}/public/assets/ui/dpad_right.png`, uiBtn, uiBtn, dpad(uiBtn, "right"));
writePng(`${base}/public/assets/ui/btn_a.png`, uiBtn, uiBtn, button(uiBtn, [180, 70, 70, 255]));
writePng(`${base}/public/assets/ui/btn_b.png`, uiBtn, uiBtn, button(uiBtn, [70, 110, 180, 255]));
writePng(`${base}/public/assets/ui/panel.png`, 640, 200, panelBg(640, 200));
writePng(`${base}/public/assets/ui/minimap_frame.png`, 140, 140, panelBg(140, 140));

// 모달 에셋
writePng(`${base}/public/assets/modal/frame.png`, 720, 360, modalFrame(720, 360));
writePng(`${base}/public/assets/modal/close.png`, 32, 32, button(32, [120, 120, 120, 255]));
writePng(`${base}/public/assets/modal/about.png`, 320, 180, panelBg(320, 180));
writePng(`${base}/public/assets/modal/projects.png`, 320, 180, panelBg(320, 180));
writePng(`${base}/public/assets/modal/contact.png`, 320, 180, panelBg(320, 180));

console.log("Sample assets generated.");
