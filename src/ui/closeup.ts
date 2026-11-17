// 관찰 패널(E): 얼굴 64×64 + 책상 위 손 64×64. 실제 단서는 여기서만 또렷하게 보인다.
import { makeCanvas, px, type Ctx } from "../core/px";
import { drawFaceAiParts, drawFaceGlasses } from "../world/glasses";
import { isCheating, type Student } from "../world/student";

const [faceC, fg] = makeCanvas(64, 64);
const [handC, hg] = makeCanvas(64, 64);

const THERMAL = [[10, 10, 40], [40, 20, 110], [120, 30, 140], [210, 50, 70], [250, 140, 30], [255, 240, 140]];

function drawFace(g: Ctx, s: Student, t: number): void {
  const pose = s.pose;
  const cheat = isCheating(s) ? s.cheat : null;
  px(g, 0, 0, 64, 64, "#2b3240");
  px(g, 0, 50, 64, 14, s.shirt === "#e4e4ea" ? "#2f3e63" : s.shirt);
  px(g, 28, 50, 8, 14, "#e4e4ea"); px(g, 31, 52, 2, 12, "#3a4a7a");
  px(g, 13, 10, 38, s.longHair ? 34 : 22, s.hair);
  px(g, 16, 14, 32, 36, s.skin);
  px(g, 16, 12, 32, 8, s.hair);
  px(g, 13, 26, 3, 9, s.skin); px(g, 48, 26, 3, 9, s.skin);              // 귀
  // 이어폰: 보이는 것 / 피부색 초소형(아주 작게 색이 다름)
  if (cheat?.tells.earpiece === "visible") px(g, 49, 29, 2, 3, "#f2f2f2");
  if (cheat?.tells.earpiece === "tiny") px(g, 49, 30, 1, 2, "#c99a7a");
  // 목 뒤 송수신기: 목을 만질 때 머리카락 사이로 보임
  if (cheat?.tells.neckDevice && pose === "neck") px(g, 46, 44, 4, 3, "#2a2a2a");
  // 눈
  const blink = Math.floor(t * 1.3 + s.i) % 6 === 0;
  const look = pose === "side" || pose === "lookaround" ? (Math.floor(t * 2.5) % 2 ? 2 : -1) : 0;
  const down = pose === "write" || pose === "burst" || pose === "stare" || pose === "underdesk" ? 1 : 0;
  for (const ex of [21, 36]) {
    if (blink && pose !== "stare") px(g, ex, 30, 7, 1, "#1a1414");
    else { px(g, ex, 28, 7, 4, "#f7f4ee"); px(g, ex + 2 + look, 28 + down, 3, 4 - down, "#2a1d16"); }
  }
  px(g, 31, 34, 2, 5, "#00000022");
  // 입: 질문할 때 움직임, 기침
  if (pose === "mouth" && Math.floor(t * 8) % 2 === 0) px(g, 28, 41, 8, 4, "#8a3f38");
  else if (pose === "cough") px(g, 26, 40, 12, 6, s.skin);
  else px(g, 27, 42, 10, 2, "#b5655a");
  // 안경
  if (s.glasses && pose !== "glassesoff") {
    drawFaceGlasses(g, s.glasses);
    if (s.aiGen > 0) drawFaceAiParts(g, s.aiGen, s.glasses, s.ledOn);
  }
  // 손이 얼굴 근처에 있는 동작
  if (pose === "temple") px(g, 50, 24, 8, 10, s.skin);
  if (pose === "nosepush") px(g, 29, 30, 5, 10, s.skin);
  if (pose === "ear") px(g, 6, 26, 8, 10, s.skin);
  if (pose === "cough") px(g, 24, 38, 16, 8, s.skin);
}

function thermal(g: Ctx, s: Student, t: number): void {
  const img = g.getImageData(0, 0, 64, 64), d = img.data;
  const hot = t < s.heatUntil;
  const strength = s.aiGen >= 4 ? 0.3 : 0.6;   // 4세대 저발열
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const o = (y * 64 + x) * 4;
    const isSkin = d[o] > 180 && d[o + 1] > 130 && d[o] > d[o + 2];
    let h = isSkin ? 0.55 : ((d[o] + d[o + 1] + d[o + 2]) / 765) * 0.35;
    if (y > 50) h = 0.28;
    if (hot) h += Math.max(0, 1 - Math.hypot(x - 49, y - 26) / 11) * (strength + 0.06 * Math.sin(t * 3));
    const c = THERMAL[Math.max(0, Math.min(5, Math.round(h * 5)))];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

function drawHands(g: Ctx, s: Student, t: number): void {
  const pose = s.pose;
  const cheat = isCheating(s) ? s.cheat : null;
  const tells = cheat?.tells ?? {};
  px(g, 0, 0, 64, 64, "#c99a5e");
  for (let y = 4; y < 64; y += 9) px(g, 0, y, 64, 1, "#b88a52");
  // 책상 모서리 낙서 (항상 보임 → 가까이서 보면 단서)
  if (tells.deskNote) { px(g, 52, 54, 9, 1, "#5a4430"); px(g, 52, 57, 7, 1, "#5a4430"); }
  // 답안지
  px(g, 14, 8, 36, 44, "#f4f2ea");
  for (let k = 0; k < 6; k++) px(g, 18, 13 + k * 6, 24 - (k % 2) * 6, 1, "#aab");
  const sk = s.skin;
  const handsUnder = pose === "underdesk";
  if (handsUnder) {
    // 손이 책상 밑으로: 휴대폰이면 아래에서 빛이 비친다
    if (cheat?.family === "phone") { g.fillStyle = "rgba(120,200,255,0.35)"; g.fillRect(16, 54, 32, 10); }
    px(g, 6, 56, 10, 8, "#00000033"); px(g, 48, 56, 10, 8, "#00000033");
  } else {
    // 왼손
    if (pose === "palm") {
      px(g, 4, 30, 16, 14, sk);
      if (tells.palmNote) { px(g, 7, 33, 9, 1, "#3a4a8a"); px(g, 7, 36, 7, 1, "#3a4a8a"); px(g, 7, 39, 8, 1, "#3a4a8a"); }
    } else if (pose === "sleeve") {
      px(g, 0, 26, 22, 10, sk);
      if (tells.armNote) { px(g, 4, 29, 10, 1, "#3a4a8a"); px(g, 4, 32, 8, 1, "#3a4a8a"); }
    } else px(g, 4, 36, 10, 8, sk);
    // 시계 (왼손목)
    if (s.watch !== "none") {
      const wx = 4, wy = pose === "palm" ? 44 : 44;
      px(g, wx - 1, wy, 12, 5, "#3a2a20");
      if (s.watch === "smart") {
        px(g, wx + 1, wy - 1, 8, 7, "#111");
        // 평소엔 화면이 꺼져 있음 → 손목을 볼 때만 켜짐
        if (pose === "wrist") { px(g, wx + 2, wy, 6, 5, "#1f6f8b"); px(g, wx + 3, wy + 1, 4, 1, "#bfe9f5"); px(g, wx + 3, wy + 3, 3, 1, "#bfe9f5"); }
      } else if (s.watch === "hybrid") {
        px(g, wx + 1, wy - 1, 8, 7, "#c9b48a"); px(g, wx + 2, wy, 6, 5, "#f4f2ea");
        px(g, wx + 3, wy + 3, 4, 1, pose === "wrist" ? "#4fc3f7" : "#3a6a78");    // 작은 알림 화면 (확대해야 보임)
      } else if (s.watch === "band") px(g, wx + 1, wy + 1, 8, 3, "#222");
      else if (s.watch === "blackanalog") { px(g, wx + 1, wy - 1, 8, 7, "#111"); px(g, wx + 2, wy, 6, 5, "#22262c"); px(g, wx + 5, wy + 1, 1, 3, "#e9e6da"); }
      else { px(g, wx + 1, wy - 1, 8, 7, "#c9b48a"); px(g, wx + 2, wy, 6, 5, "#f4f2ea"); px(g, wx + 5, wy + 1, 1, 3, "#222"); }
    }
    // 오른손 + 펜
    if (pose === "penup") {
      px(g, 40, 20, 2, 22, "#333"); px(g, 40, 19, 2, 2, tells.camPen ? "#4fc3f7" : "#333"); px(g, 38, 40, 8, 8, sk);
    } else {
      const wob = pose === "burst" ? Math.floor(t * 16) % 3 : pose === "stare" || pose === "mouth" ? 0 : Math.floor(t * 6) % 3;
      px(g, 38 + wob, 36, 9, 8, sk); px(g, 40 + wob, 30, 2, 8, "#333");
    }
  }
  // 소품
  if (pose === "eraser") {
    px(g, 20, 44, 14, 8, "#f2f2f2"); px(g, 20, 44, 14, 3, "#4a7ac0");
    if (tells.eraserNote) { px(g, 22, 48, 9, 1, "#555"); px(g, 22, 50, 7, 1, "#555"); }
  }
  if (pose === "bottle" || pose === "drink") {
    px(g, 48, 6, 12, 30, "#bfe3ef"); px(g, 48, 14, 12, 10, "#3a8fbf");
    if (tells.bottleNote && pose === "bottle") { px(g, 50, 16, 8, 1, "#f4f2ea"); px(g, 50, 19, 6, 1, "#f4f2ea"); }
  }
  if (pose === "ruler") {
    px(g, 6, 4, 6, 40, "#e8d27a");
    if (tells.rulerNote) for (let k = 0; k < 5; k++) px(g, 8, 8 + k * 6, 2, 3, "#555");
  }
  if (pose === "coin") { const c = Math.floor(t * 6) % 2; px(g, 24 + c * 2, 46, 7, 7, "#c9a95a"); px(g, 26 + c * 2, 48, 3, 3, tells.coin ? "#8a6a2a" : "#b8963a"); }
  if (pose === "paperchest" || pose === "paperup") { px(g, 14, 8, 36, 44, "#c99a5e"); }
  if (tells.collarCam && pose === "paperchest") px(g, 30, 2, 3, 3, "#1d3557");
}

/** 패널을 그려 넣는다 (x,y: 화면 좌표, 1.5배) */
export function drawCloseup(g: Ctx, s: Student, t: number, x: number, y: number, thermalOn: boolean): void {
  fg.clearRect(0, 0, 64, 64);
  drawFace(fg, s, t);
  if (thermalOn) thermal(fg, s, t);
  hg.clearRect(0, 0, 64, 64);
  drawHands(hg, s, t);
  px(g, x - 3, y - 15, 2 * 96 + 10, 96 + 18, "rgba(16,22,20,0.94)");
  g.imageSmoothingEnabled = false;
  g.drawImage(faceC, x, y, 96, 96);
  g.drawImage(handC, x + 100, y, 96, 96);
}
