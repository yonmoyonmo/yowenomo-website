import { createRenderer } from "./renderer";
import { createWorld, getSamples, moveBackward, moveForward, turnLeft, turnRight, World } from "./world";
import { renderMinimap } from "./minimap";
import { loadSprites } from "./assets";

// DOM 준비
const view = document.getElementById("view") as HTMLCanvasElement | null;
const minimap = document.getElementById("minimap") as HTMLCanvasElement | null;
if (!view || !minimap) {
  throw new Error("Missing required DOM elements");
}

// 에셋/렌더러/월드 초기화
const sprites = loadSprites();
const renderer = createRenderer(view, sprites);
const world: World = createWorld();
const MAX_DEPTH = 8;
let modalOpen = false;

// 모달 DOM 참조
const modal = document.getElementById("modal") as HTMLDivElement | null;
const modalTitle = document.getElementById("modal-title") as HTMLHeadingElement | null;
const modalBody = document.getElementById("modal-body") as HTMLParagraphElement | null;
const modalImage = document.getElementById("modal-image") as HTMLImageElement | null;
const modalClose = document.getElementById("modal-close") as HTMLButtonElement | null;
const debug = document.getElementById("debug") as HTMLDivElement | null;

// 스페셜 타일 → 모달 컨텐츠 매핑
const modalContent: Record<string, { title: string; body: string; image?: string; link?: string }> = {
  about: {
    title: "About Me",
    body: "Replace this text with your about content.",
    image: "/assets/modal/about.png"
  },
  gate1: {
    title: "Gate 1",
    body: "Placeholder page. Replace with real description.",
    image: "/assets/modal/projects.png",
    link: "/pages/gate1.html"
  },
  gate2: {
    title: "Gate 2",
    body: "Placeholder page. Replace with real description.",
    image: "/assets/modal/projects.png",
    link: "/pages/gate2.html"
  },
  gate3: {
    title: "Gate 3",
    body: "Placeholder page. Replace with real description.",
    image: "/assets/modal/projects.png",
    link: "/pages/gate3.html"
  }
};

function openModal(key: string) {
  // 모달 열기
  if (!modal || !modalTitle || !modalBody || !modalImage) {
    return;
  }
  const data = modalContent[key];
  if (!data) {
    return;
  }
  modalTitle.textContent = data.title;
  modalBody.textContent = data.body;
  if (data.link) {
    modalBody.innerHTML = `${data.body}<br /><a href="${data.link}">Go to page</a>`;
  }
  if (data.image) {
    modalImage.src = data.image;
    modalImage.style.display = "block";
  } else {
    modalImage.style.display = "none";
  }
  modal.classList.remove("hidden");
  modalOpen = true;
}

function closeModal() {
  // 모달 닫기
  if (!modal) {
    return;
  }
  modal.classList.add("hidden");
  modalOpen = false;
}

function render() {
  // 1) 샘플링 → 2) 렌더러 → 3) 미니맵
  const samples = getSamples(world, MAX_DEPTH);
  renderer.render(samples);
  renderMinimap(minimap!, world);
  // 디버그 텍스트(현재 위치/바로 앞/좌/우)
  if (debug) {
    const front = samples[0]?.front;
    const left = samples[0]?.left;
    const right = samples[0]?.right;
    debug.textContent =
      `pos: (${world.player.x}, ${world.player.y}) dir: ${world.player.dir}\n` +
      `front: (${front?.x}, ${front?.y}) ${front?.tile}\n` +
      `left: (${left?.x}, ${left?.y}) ${left?.tile}\n` +
      `right: (${right?.x}, ${right?.y}) ${right?.tile}`;
  }
  requestAnimationFrame(render);
}

function handleKey(event: KeyboardEvent) {
  // 키보드 입력(모달 열림 시 제한)
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }
  if (modalOpen) {
    if (key === "escape" || key === "b") {
      closeModal();
    }
    return;
  }
  switch (key) {
    case "arrowup":
    case "w":
      moveForward(world);
      break;
    case "arrowdown":
    case "s":
      moveBackward(world);
      break;
    case "arrowleft":
    case "a":
    case "q":
      turnLeft(world);
      break;
    case "arrowright":
    case "d":
    case "e":
      turnRight(world);
      break;
    case "enter":
      triggerModal();
      break;
    default:
      break;
  }
  triggerModal();
}

function bindButtons() {
  // D-pad / A / B 버튼 입력 바인딩
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-action]");
  buttons.forEach((button) => {
    const img = button.querySelector<HTMLImageElement>("img");
    const imgUp = img?.dataset.up;
    const imgDown = img?.dataset.down;
    const setDown = () => {
      // 눌림 상태 이미지로 교체
      if (img && imgDown) {
        img.src = imgDown;
      }
    };
    const setUp = () => {
      // 기본 이미지로 복귀
      if (img && imgUp) {
        img.src = imgUp;
      }
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (modalOpen && button.dataset.action !== "b") {
        return;
      }
      setDown();
      const action = button.dataset.action;
      switch (action) {
        case "forward":
          moveForward(world);
          break;
        case "back":
          moveBackward(world);
          break;
        case "left":
          turnLeft(world);
          break;
        case "right":
          turnRight(world);
          break;
        case "a":
          triggerModal();
          break;
        case "b":
          closeModal();
          break;
        default:
          break;
      }
      triggerModal();
    });

    // 손가락 이동/해제 시 원상 복귀
    button.addEventListener("pointerup", setUp);
    button.addEventListener("pointerleave", setUp);
  });
}

function triggerModal() {
  // 현재 타일이 스페셜이면 모달 오픈
  const tile = world.grid[world.player.y * world.width + world.player.x];
  if (tile === "about" || tile === "gate1" || tile === "gate2" || tile === "gate3") {
    openModal(tile);
  }
}

// 이벤트 연결
document.addEventListener("keydown", handleKey);
bindButtons();
modalClose?.addEventListener("click", closeModal);

// 루프 시작
render();
