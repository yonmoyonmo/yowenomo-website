// 에셋 키: 파일 경로와 1:1 매핑
export type SpriteKey =
  | "wall"
  | "wall_left"
  | "wall_right"
  | "gate_frame"
  | "floor"
  | "ceiling"
  | "dpad_up"
  | "dpad_up_down"
  | "dpad_down"
  | "dpad_down_down"
  | "dpad_left"
  | "dpad_left_down"
  | "dpad_right"
  | "dpad_right_down"
  | "btn_a"
  | "btn_a_down"
  | "btn_b"
  | "btn_b_down"
  | "panel"
  | "minimap_frame"
  | "modal_frame"
  | "modal_close";

// 에셋 경로 테이블(이 파일만 수정하면 교체 가능)
export const spriteMap: Record<SpriteKey, string> = {
  wall: "/assets/world/wall.png",
  wall_left: "/assets/world/wall_left.png",
  wall_right: "/assets/world/wall_right.png",
  gate_frame: "/assets/world/gate_frame.png",
  floor: "/assets/world/floor.png",
  ceiling: "/assets/world/ceiling.png",
  dpad_up: "/assets/ui/dpad_up.png",
  dpad_up_down: "/assets/ui/dpad_up_down.png",
  dpad_down: "/assets/ui/dpad_down.png",
  dpad_down_down: "/assets/ui/dpad_down_down.png",
  dpad_left: "/assets/ui/dpad_left.png",
  dpad_left_down: "/assets/ui/dpad_left_down.png",
  dpad_right: "/assets/ui/dpad_right.png",
  dpad_right_down: "/assets/ui/dpad_right_down.png",
  btn_a: "/assets/ui/btn_a.png",
  btn_a_down: "/assets/ui/btn_a_down.png",
  btn_b: "/assets/ui/btn_b.png",
  btn_b_down: "/assets/ui/btn_b_down.png",
  panel: "/assets/ui/panel.png",
  minimap_frame: "/assets/ui/minimap_frame.png",
  modal_frame: "/assets/modal/frame.png",
  modal_close: "/assets/modal/close.png"
};

// 런타임에서 이미지 캐시 조회용 인터페이스
export interface SpriteStore {
  get: (key: SpriteKey) => HTMLImageElement | null;
}

export function loadSprites(): SpriteStore {
  // 스프라이트를 미리 로드하고 캐시에 저장
  const cache = new Map<SpriteKey, HTMLImageElement | null>();
  (Object.keys(spriteMap) as SpriteKey[]).forEach((key) => {
    const img = new Image();
    cache.set(key, img);
    img.onload = () => {
      cache.set(key, img);
    };
    img.onerror = () => {
      cache.set(key, null);
    };
    img.src = spriteMap[key];
  });
  return {
    get: (key) => cache.get(key) ?? null
  };
}
