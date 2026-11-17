// 학생 스프라이트(32×42) 그리기. cx=16, y=24 가 책상 윗면 기준점
import { px, type Ctx } from "../core/px";
import { drawSpriteGlasses } from "./glasses";
import type { Student } from "./student";
import { HEAD_DOWN } from "./poses";

export const SPR_W = 32;
export const SPR_H = 42;
const CX = 16;
const Y = 24;

export interface DrawOpts {
  t: number;
  ledVisible: boolean;           // LED를 그릴지 (가까이·정전 때 잘 보임)
  lights: Array<{ x: number; y: number }>; // LED 빛 번짐 위치(스프라이트 좌표)
}

function desk(g: Ctx, paper: boolean): void {
  px(g, CX - 14, Y, 28, 10, "#c99a5e");
  px(g, CX - 14, Y + 10, 28, 3, "#94703f");
  px(g, CX - 13, Y + 13, 2, 4, "#5a4430"); px(g, CX + 11, Y + 13, 2, 4, "#5a4430");
  if (paper) {
    px(g, CX - 6, Y + 2, 11, 7, "#f4f2ea");
    px(g, CX - 5, Y + 4, 8, 1, "#aab"); px(g, CX - 5, Y + 6, 6, 1, "#aab");
  }
}

/** 빈자리 */
export function drawEmptySeat(g: Ctx): void {
  g.clearRect(0, 0, SPR_W, SPR_H);
  px(g, CX - 8, Y - 16, 16, 4, "#4b3a2c");
  px(g, CX - 7, Y - 12, 14, 12, "#5a4636");
  desk(g, false);
}

/** 부감독 (정면으로 서 있음, 감독관 완장) */
export function drawProctor(g: Ctx, t: number): void {
  g.clearRect(0, 0, SPR_W, SPR_H);
  const breathe = Math.floor(t * 0.8) % 2;
  px(g, 11, 29, 4, 12, "#23262e"); px(g, 17, 29, 4, 12, "#23262e");       // 바지
  px(g, 10, 40, 5, 2, "#111"); px(g, 17, 40, 5, 2, "#111");               // 구두
  px(g, 8, 14 + breathe, 16, 16 - breathe, "#4a4f5c");                      // 정장
  px(g, 14, 14, 4, 8, "#e4e4ea"); px(g, 15, 15, 2, 6, "#7a3b3b");          // 셔츠·넥타이
  px(g, 6, 15, 2, 12, "#4a4f5c"); px(g, 24, 15, 2, 12, "#4a4f5c");         // 팔
  px(g, 6, 18, 2, 3, "#f0b54a");                                           // 감독관 완장
  px(g, 6, 27, 2, 2, "#e0b48e"); px(g, 24, 27, 2, 2, "#e0b48e");          // 손
  px(g, 11, 3, 10, 11, "#e0b48e");                                         // 얼굴
  px(g, 11, 2, 10, 4, "#3a3a3a"); px(g, 10, 3, 1, 5, "#3a3a3a"); px(g, 21, 3, 1, 5, "#3a3a3a");
  px(g, 13, 8, 1, 1, "#1a1414"); px(g, 18, 8, 1, 1, "#1a1414");
  g.fillStyle = "#7d8188"; g.fillRect(12, 7, 3, 1); g.fillRect(17, 7, 3, 1); g.fillRect(15, 8, 2, 1);
  px(g, 14, 11, 4, 1, "#a0645a");
}

/** 일어나 나가는 학생 (뒷모습) */
export function drawStanding(g: Ctx, s: Student, t: number): void {
  g.clearRect(0, 0, SPR_W, SPR_H);
  const step = Math.floor(t * 5) % 2;
  px(g, 11, 28, 4, 13 - step, "#3a3f4c"); px(g, 17, 28, 4, 12 + step, "#3a3f4c");
  px(g, 10, 40 - step, 5, 2, "#151515"); px(g, 17, 39 + step, 5, 2, "#151515");
  px(g, 8, 14, 16, 15, s.shirt);
  px(g, 15, 15, 2, 13, "rgba(0,0,0,0.18)");
  px(g, 6, 15, 2, 11, s.shirt); px(g, 24, 15, 2, 11, s.shirt);
  px(g, 6, 26, 2, 2, s.skin); px(g, 24, 26, 2, 2, s.skin);
  px(g, 13, 12, 6, 2, s.skin);
  px(g, 12, 13, 8, 1, "#f4f2ea");
  px(g, 12, 3, 8, 9, s.hair); px(g, 11, 4, 10, 7, s.hair);
  px(g, 10, 6, 1, 3, s.skin); px(g, 21, 6, 1, 3, s.skin);
}

export function drawStudent(g: Ctx, s: Student, o: DrawOpts): void {
  g.clearRect(0, 0, SPR_W, SPR_H);
  const { t } = o;
  const pose = s.pose;
  const skin = s.skin;
  const wobSpeed = pose === "burst" ? 16 : 6;
  const still = pose === "stare" || pose === "mouth" || pose === "nod";
  const wob = still ? 0 : Math.floor(t * wobSpeed + s.i) % 3;

  let hx = 0;
  if (pose === "side") hx = s.i % 5 < 2 ? 1 : -1;
  if (pose === "lookaround") hx = Math.floor(t * 2.5) % 2 ? 1 : -1;
  if (pose === "window") hx = -1;
  const down = HEAD_DOWN.has(pose) ? 1 : 0;
  const nod = pose === "nod" ? (Math.floor(t * 4) % 2) : 0;

  // 의자 등받이, 몸
  px(g, CX - 8, Y - 16, 16, 4, "#4b3a2c");
  px(g, CX - 7, Y - 9, 14, 10, s.shirt);
  if (s.shirt === "#e4e4ea") px(g, CX - 1, Y - 9, 2, 6, "#3a4a7a");

  // 머리
  const hy = Y - 19 + down + nod;
  if (s.longHair) px(g, CX - 6 + hx, hy + 1, 12, 9, s.hair);
  px(g, CX - 5 + hx, hy, 10, 10, skin);
  px(g, CX - 5 + hx, hy - 1, 10, 4, s.hair);
  px(g, CX - 6 + hx, hy, 1, 4, s.hair); px(g, CX + 5 + hx, hy, 1, 4, s.hair);

  // 눈
  const ex = pose === "side" || pose === "lookaround" || pose === "window" ? Math.sign(hx) : 0;
  const lookDown = pose === "write" || pose === "burst" || pose === "stare" || pose === "mouth" || down ? 1 : 0;
  const ey = hy + 5 + lookDown;
  if (pose === "cough") {
    px(g, CX - 3 + hx, ey, 2, 1, "#1a1414"); px(g, CX + 2 + hx, ey, 2, 1, "#1a1414");
  } else {
    px(g, CX - 3 + hx + ex, ey, 1, 1, "#1a1414");
    px(g, CX + 2 + hx + ex, ey, 1, 1, "#1a1414");
  }
  // 입
  if (pose === "mouth" && Math.floor(t * 8) % 2 === 0) px(g, CX - 1 + hx, ey + 3, 2, 1, "#8a3f38");

  // 안경
  if (s.glasses && pose !== "glassesoff") {
    drawSpriteGlasses(g, CX - 4 + hx, ey, s.glasses, s.aiGen === 1 ? 1 : 0);
    if (s.aiGen === 1 && s.ledOn && o.ledVisible) {
      const lx = CX - 6 + hx, ly = ey - 1;
      px(g, lx, ly, 1, 1, "#ff3b30");
      o.lights.push({ x: lx, y: ly });
    }
  }

  desk(g, pose !== "paperup" && pose !== "paperchest" && pose !== "pass");

  // 팔·손 (동작별)
  const sh = s.shirt;
  const leftHand = () => px(g, CX - 8, Y + 4, 2, 2, skin);
  const writeHand = () => { px(g, CX + 2 + wob, Y + 4, 2, 2, skin); px(g, CX + 3 + wob, Y + 3, 1, 2, "#333"); };
  switch (pose) {
    case "paperup":
      px(g, CX - 6, hy + 6, 12, 8, "#f4f2ea"); px(g, CX - 4, hy + 8, 8, 1, "#9aa"); px(g, CX - 4, hy + 10, 6, 1, "#9aa");
      px(g, CX - 8, hy + 9, 2, 2, skin); px(g, CX + 6, hy + 9, 2, 2, skin);
      break;
    case "paperchest":
      px(g, CX - 6, Y - 6, 12, 8, "#f4f2ea"); px(g, CX - 4, Y - 4, 8, 1, "#9aa");
      px(g, CX - 8, Y - 3, 2, 2, skin); px(g, CX + 6, Y - 3, 2, 2, skin);
      break;
    case "temple":
      px(g, CX + 6 + hx, hy + 4, 2, 6, sh); px(g, CX + 5 + hx, hy + 3, 2, 2, skin); leftHand();
      break;
    case "nosepush":
      px(g, CX + 2 + hx, hy + 8, 2, 6, sh); px(g, CX - 1 + hx, ey - 1, 2, 3, skin); leftHand();
      break;
    case "glassesoff": {
      const w = Math.floor(t * 6) % 2;
      px(g, CX - 5, Y - 4, 10, 3, "#e4e4ea");
      g.fillStyle = s.glasses?.color ?? "#9aa0a8";
      g.fillRect(CX - 4 + w, Y - 6, 3, 1); g.fillRect(CX + 1 + w, Y - 6, 3, 1); g.fillRect(CX - 1 + w, Y - 6, 2, 1);
      px(g, CX - 7, Y - 4, 2, 2, skin); px(g, CX + 5, Y - 4, 2, 2, skin);
      break;
    }
    case "wrist":
      px(g, CX - 7, Y - 2, 6, 3, sh);
      if (s.watch === "smart") { px(g, CX - 4, Y - 2, 2, 2, "#111"); px(g, CX - 4, Y - 2, 1, 1, "#4fc3f7"); }
      else if (s.watch === "blackanalog") px(g, CX - 4, Y - 2, 2, 2, "#111");
      else if (s.watch !== "none") px(g, CX - 4, Y - 2, 2, 2, "#c9b48a");
      px(g, CX + 3, Y + 4, 2, 2, skin);
      break;
    case "stretch":
      px(g, CX - 9, hy - 6, 2, 12, sh); px(g, CX + 7, hy - 6, 2, 12, sh);
      px(g, CX - 9, hy - 8, 2, 2, skin); px(g, CX + 7, hy - 8, 2, 2, skin);
      break;
    case "ear":
      px(g, CX - 8 + hx, hy + 4, 2, 6, sh); px(g, CX - 7 + hx, hy + 3, 2, 2, skin); writeHand();
      break;
    case "neck":
      px(g, CX + 6 + hx, hy + 5, 2, 6, sh); px(g, CX + 5 + hx, hy + 6, 2, 2, skin); leftHand();
      break;
    case "think":
      px(g, CX - 1, hy + 10, 2, 2, skin); px(g, CX + 3, Y + 4, 2, 2, skin);
      break;
    case "underdesk":
      px(g, CX - 7, Y - 1, 3, 2, sh); px(g, CX + 4, Y - 1, 3, 2, sh);
      break;
    case "palm":
      px(g, CX - 5, Y - 3, 4, 3, skin); px(g, CX - 4, Y - 2, 2, 1, "#4a5a8a"); writeHand();
      break;
    case "eraser":
      px(g, CX - 6, Y + 1, 4, 3, "#f2f2f2"); px(g, CX - 6, Y + 1, 4, 1, "#4a7ac0");
      px(g, CX - 7, Y + 3, 2, 2, skin); px(g, CX - 3, Y + 3, 2, 2, skin);
      break;
    case "bottle":
    case "drink": {
      const by = pose === "drink" ? hy + 6 : Y - 8;
      px(g, CX + 3, by, 3, 8, "#bfe3ef"); px(g, CX + 3, by + 3, 3, 2, "#3a8fbf");
      px(g, CX + 2, by + 6, 2, 2, skin);
      leftHand();
      break;
    }
    case "sleeve":
      px(g, CX - 8, Y - 2, 7, 3, skin); px(g, CX - 6, Y - 1, 3, 1, "#4a5a8a"); writeHand();
      break;
    case "ruler":
      px(g, CX - 7, Y - 6, 2, 9, "#e8d27a"); px(g, CX - 8, Y + 1, 2, 2, skin); writeHand();
      break;
    case "penup":
      px(g, CX + 1, Y - 5, 1, 7, "#333"); px(g, CX + 1, Y - 6, 1, 1, "#4fc3f7"); px(g, CX, Y + 1, 2, 2, skin); leftHand();
      break;
    case "coin": {
      const c = Math.floor(t * 6) % 2;
      px(g, CX - 6 + c, Y + 2, 3, 3, "#c9a95a"); px(g, CX - 7, Y + 4, 2, 2, skin); writeHand();
      break;
    }
    case "cough":
      px(g, CX - 2 + hx, ey + 2, 3, 2, skin); px(g, CX - 1, hy + 10, 2, 4, sh); writeHand();
      break;
    case "finger": {
      const n = 1 + (Math.floor(t * 2) % 3);
      px(g, CX + 6, Y - 4, 2, 4, skin);
      for (let k = 0; k < n; k++) px(g, CX + 6 + k, Y - 6, 1, 2, skin);
      leftHand();
      break;
    }
    case "pass":
      px(g, CX - 7, Y - 2, 2, 6, sh); px(g, CX - 9, Y - 4, 3, 2, "#f4f2ea"); writeHand();
      break;
    case "handup":
      px(g, CX + 6, hy - 6, 2, 12, sh); px(g, CX + 6, hy - 8, 2, 2, skin); leftHand();
      break;
    case "clothes":
      px(g, CX - 3, Y - 6, 6, 2, skin); writeHand();
      break;
    case "deskdown":
      px(g, CX + 9, Y + 2, 3, 1, "#5a4430"); leftHand(); writeHand();
      break;
    case "window":
      leftHand(); px(g, CX + 3, Y + 4, 2, 2, skin);
      break;
    default: // write, burst, stare, mouth, nod, lookaround, side
      leftHand();
      if (pose === "stare" || pose === "mouth") px(g, CX + 3, Y + 4, 2, 2, skin);
      else writeHand();
  }
}
