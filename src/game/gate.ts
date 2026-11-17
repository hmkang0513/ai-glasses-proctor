// 입실 검사: 한 명씩 들어와 안경을 벗어 바구니에 올린다
import { COLORS, H, KR, PIX, W, label, makeCanvas, px, wrapText, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import type { Student } from "../world/student";
import type { GStyle } from "../world/glasses";

const SPARE_GLASSES: GStyle = { type: "metal", color: "#9aa0a8", name: "예비 안경" };
import type { Session } from "./session";

const GATE_SECONDS = 100;      // 08:00 → 08:10 (입실 마감)
const CHECK_COST = 6;          // 추가 확인에 드는 시간

type ItemKind = "glasses" | "watch" | "eraser" | "bottle" | "ruler" | "pen" | "coin" | "pencilcase";
interface Item { kind: ItemKind; x: number; y: number; w: number; h: number; suspicious: boolean }

const [portC, pg] = makeCanvas(64, 64);
const [photoC, phg] = makeCanvas(64, 64);

function drawPortrait(g: Ctx, s: Student, fake: boolean): void {
  g.clearRect(0, 0, 64, 64);
  const hair = fake ? "#6b4a2f" : s.hair;
  const skin = fake ? (s.skin === "#d6a57f" ? "#f3d0b0" : "#d6a57f") : s.skin;
  px(g, 0, 50, 64, 14, s.shirt === "#e4e4ea" ? "#2f3e63" : s.shirt);
  px(g, 28, 50, 8, 14, "#e4e4ea");
  px(g, 13, 10, 38, (fake ? !s.longHair : s.longHair) ? 34 : 22, hair);
  px(g, 16, fake ? 12 : 14, 32, 36, skin);
  px(g, 16, 12, 32, fake ? 5 : 8, hair);
  px(g, 13, 26, 3, 9, skin); px(g, 48, 26, 3, 9, skin);
  for (const ex of [21, 36]) { px(g, ex, 28, 7, 4, "#f7f4ee"); px(g, ex + 2, 28, 3, 4, "#2a1d16"); }
  px(g, 27, fake ? 43 : 42, 10, 2, "#b5655a");
  if (fake) px(g, 22, 22, 20, 2, hair); // 눈썹 모양도 다름
}

export class GateScene {
  readonly name = "gate";
  t = 0;
  idx = 0;               // 지금 검사 중인 학생
  sel = 0;               // 확대경으로 보는 물건
  items: Item[] = [];
  checkUntil = -1;
  checkResult = "";
  log: string[] = [];
  done = false;
  helpOpen: boolean;

  constructor(private s: Session, private onDone: () => void) {
    this.helpOpen = s.room.level <= 3;
    this.loadStudent();
  }

  get st(): Student {
    return this.s.room.students[this.idx];
  }

  private loadStudent(): void {
    const st = this.st;
    const ch = st.cheat;
    const tray = ch?.gate.tray ?? [];
    const list: Item[] = [];
    if (st.glasses) list.push({ kind: "glasses", x: 156, y: 156, w: 50, h: 22, suspicious: st.aiGen > 0 });
    if (st.watch !== "none") list.push({ kind: "watch", x: 220, y: 150, w: 18, h: 30, suspicious: st.watch !== "analog" && st.watch !== "blackanalog" });
    list.push({ kind: "pencilcase", x: 254, y: 156, w: 50, h: 16, suspicious: false });
    const extra: Array<[ItemKind, boolean]> = [];
    extra.push(["eraser", tray.includes("eraser")]);
    if (tray.includes("bottle") || st.i % 3 === 0) extra.push(["bottle", tray.includes("bottle")]);
    if (tray.includes("ruler") || st.i % 4 === 1) extra.push(["ruler", tray.includes("ruler")]);
    if (tray.includes("campen") || st.i % 2 === 0) extra.push(["pen", tray.includes("campen")]);
    if (tray.includes("coin") || st.i % 5 === 2) extra.push(["coin", tray.includes("coin")]);
    const pos = [[160, 200], [204, 196], [244, 198], [276, 204], [306, 200]];
    extra.forEach(([k, sus], n) => {
      const [x, y] = pos[n % pos.length];
      const size: Record<string, [number, number]> = { eraser: [16, 9], bottle: [12, 34], ruler: [40, 6], pen: [30, 4], coin: [9, 9] };
      const [w, h] = size[k] ?? [12, 12];
      list.push({ kind: k, x, y: k === "bottle" ? y - 14 : y, w, h, suspicious: sus });
    });
    this.items = list;
    this.sel = 0;
    this.checkResult = "";
  }

  /** 부위별 금속 반응 (0~6). 금속테·아날로그 시계도 울리는 미끼가 있다 */
  metalParts(): [number, number, number, number] {
    const st = this.st;
    const ch = st.cheat && !st.confiscated ? st.cheat : null;
    let head = 0, wrist = 0, body = 0, feet = 0;
    if (st.glasses) head += st.glasses.type === "horn" ? 0 : 2;
    head += st.aiGen === 1 ? 3 : st.aiGen === 2 ? 2 : st.aiGen >= 3 ? 1 : 0;
    if (ch?.gate.hidden === "ear" || ch?.gate.hidden === "neck") head += 3;
    wrist += st.watch === "analog" || st.watch === "blackanalog" ? 2 : st.watch === "hybrid" ? 3 : st.watch === "smart" ? 4 : 0;
    if (ch?.gate.hidden === "body") body += 4;
    if (ch?.gate.tray?.includes("phone")) body += 3;   // 몸에 숨긴 두 번째 휴대폰
    if (ch?.gate.hidden === "shoes") feet += 4;
    return [head, wrist, body, feet].map((v) => Math.min(6, v)) as [number, number, number, number];
  }

  private next(): void {
    this.idx++;
    if (this.idx >= this.s.room.students.length) this.finish();
    else this.loadStudent();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  private complain(n: number, text: string): void {
    this.s.complaints = Math.min(3, this.s.complaints + n);
    this.log.unshift(text);
    if (this.s.complaints >= 3) { this.s.replaced = true; this.finish(); }
  }

  private act(kind: "pass" | "hold" | "check"): void {
    if (this.done) return;
    const st = this.st;
    const ch = st.cheat;
    if (kind === "pass") { this.next(); return; }
    if (kind === "hold") {
      const it = this.items[this.sel];
      if (it.suspicious && ch) {
        st.confiscated = true;
        if (it.kind === "glasses") { st.aiGen = 0; st.glasses = SPARE_GLASSES; }   // 예비 안경으로 시험
        this.log.unshift(`${st.seat}번: 기기를 스스로 내서 보관함`);
      } else if (it.kind === "glasses") {
        this.complain(1, `${st.seat}번: 안경을 뺏겨 시험지가 안 보인다는 민원`);
        if (!this.s.gateWrong.includes(st.seat)) this.s.gateWrong.push(st.seat);
      } else {
        this.complain(0.5, `${st.seat}번: 평범한 물건을 가져가 불만`);
      }
      this.next();
      return;
    }
    // 추가 확인: 시간이 들지만 숨긴 기기·대리시험을 찾는다
    this.t += CHECK_COST;
    const hidden = ch && !st.confiscated && (ch.gate.hidden || ch.gate.photoMismatch || ch.gate.tray?.includes("phone"));
    if (hidden) {
      st.status = "gone";
      st.outcome = "gate";
      this.s.gateEjected.push(st.seat);
      const where = ch!.gate.tray?.includes("phone") && !ch!.gate.hidden ? "주머니 속 두 번째 휴대폰 발견" : ch!.gate.photoMismatch ? "신분증 위조 확인" : ch!.gate.hidden === "shoes" ? "신발 밑창에서 통화 기기 발견" : ch!.gate.hidden === "neck" ? "목 뒤 송수신기 발견" : ch!.gate.hidden === "ear" ? "귓속 초소형 이어폰 발견" : "옷 속 기기 발견";
      this.log.unshift(`${st.seat}번: ${where} → 퇴실`);
    } else if (ch && !st.confiscated && (ch.tells.palmNote || ch.tells.armNote)) {
      st.confiscated = true;   // 손·팔에 쓴 메모를 지우게 함 → 시험은 봄
      this.log.unshift(`${st.seat}번: ${ch.tells.palmNote ? "손바닥" : "팔"} 메모 발견 → 지우게 하고 입실`);
    } else if (ch && this.items.some((i) => i.suspicious)) {
      st.confiscated = true;
      this.log.unshift(`${st.seat}번: 바구니 기기 보관`);
    } else if (ch) {
      this.log.unshift(`${st.seat}번: 수색했지만 찾지 못함`);
    } else {
      this.complain(0.5, `${st.seat}번: 아무것도 없는데 몸수색을 당했다는 민원`);
    }
    this.next();
  }

  update(dt: number, inp: Input): void {
    if (this.done) return;
    if (this.helpOpen) {
      if (inp.clicked || inp.hit("Space") || inp.hit("Enter")) this.helpOpen = false;
      return;
    }
    this.t += dt;
    if (this.t >= GATE_SECONDS) {
      this.log.unshift("입실 마감 · 남은 학생은 검사 없이 들여보냄");
      this.finish();
      return;
    }
    if (inp.clicked) {
      for (let k = 0; k < this.items.length; k++) {
        const it = this.items[k];
        if (inp.mouseX >= it.x - 3 && inp.mouseX <= it.x + it.w + 3 && inp.mouseY >= it.y - 3 && inp.mouseY <= it.y + it.h + 3) this.sel = k;
      }
      const bx = 308;
      const btn = (y: number) => inp.mouseX >= bx && inp.mouseX <= bx + 158 && inp.mouseY >= y && inp.mouseY <= y + 20;
      if (btn(32)) this.act("pass");
      else if (btn(58)) this.act("hold");
      else if (btn(84)) this.act("check");
    }
    if (inp.hit("Digit1")) this.act("pass");
    if (inp.hit("Digit2")) this.act("hold");
    if (inp.hit("Digit3")) this.act("check");
    if (inp.hit("ArrowRight") || inp.hit("KeyD")) this.sel = (this.sel + 1) % this.items.length;
    if (inp.hit("ArrowLeft") || inp.hit("KeyA")) this.sel = (this.sel + this.items.length - 1) % this.items.length;
  }

  private drawItem(g: Ctx, it: Item): void {
    const st = this.st;
    const { x, y } = it;
    switch (it.kind) {
      case "glasses": {
        const gs = st.glasses!;
        const c = gs.color, th = gs.type === "horn" || st.aiGen === 1 ? 3 : 1;
        for (const ox of [0, 26]) {
          px(g, x + ox, y, 22, th, c); px(g, x + ox, y + 14 - th, 22, th, c);
          px(g, x + ox, y, th, 14, c); px(g, x + ox + 22 - th, y, th, 14, c);
          px(g, x + ox + 3, y + 3, 5, 2, "rgba(255,255,255,0.35)");
        }
        px(g, x + 22, y + 4, 4, 2, c);
        px(g, x + 2, y + 15, 44, st.aiGen === 1 ? 3 : 1, c);
        if (st.aiGen === 1) { px(g, x + 44, y - 2, 5, 5, c); px(g, x + 45, y - 1, 3, 3, "#1d3557"); }
        break;
      }
      case "watch":
        px(g, x + 4, y - 4, 8, 32, "#4a3a2c");
        if (st.watch === "smart") { px(g, x, y + 6, 16, 14, "#111"); px(g, x + 2, y + 8, 12, 10, "#161a1f"); }   // 꺼진 화면
        else if (st.watch === "blackanalog") { px(g, x, y + 6, 16, 14, "#111"); px(g, x + 2, y + 8, 12, 10, "#22262c"); px(g, x + 7, y + 9, 2, 5, "#e9e6da"); }
        else { px(g, x, y + 6, 16, 14, "#c9b48a"); px(g, x + 2, y + 8, 12, 10, "#f4f2ea"); px(g, x + 7, y + 9, 2, 5, "#222"); }
        break;
      case "pencilcase": px(g, x, y, 50, 16, "#c0504d"); px(g, x, y, 50, 3, "#d97a6f"); break;
      case "eraser": px(g, x, y, 16, 9, "#f2f2f2"); px(g, x, y, 16, 4, "#4a7ac0"); break;
      case "bottle": px(g, x, y, 12, 34, "#bfe3ef"); px(g, x, y + 10, 12, 10, "#3a8fbf"); px(g, x + 3, y - 3, 6, 3, "#eee"); break;
      case "ruler": px(g, x, y, 40, 6, "#e8d27a"); for (let k = 2; k < 40; k += 4) px(g, x + k, y, 1, 2, "#7a6a2a"); break;
      case "pen": px(g, x, y, 30, 4, "#333"); px(g, x + 26, y, 4, 4, "#888"); break;
      case "coin": px(g, x, y, 9, 9, "#c9a95a"); px(g, x + 2, y + 2, 5, 5, "#b8963a"); break;
    }
  }

  /** 확대경 6배 */
  private drawMagnifier(g: Ctx, it: Item): void {
    const st = this.st;
    const tells = st.cheat && !st.confiscated ? st.cheat.tells : {};
    const mx = 409, my = 178, r = 40;
    g.save(); g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); g.clip();
    px(g, mx - r, my - r, r * 2, r * 2, "#9aa0a8");
    switch (it.kind) {
      case "glasses": {
        const gs = st.glasses!;
        const fc = gs.color;
        px(g, mx - r, my - 6, r + 6, st.aiGen === 1 ? 16 : gs.type === "horn" ? 12 : 8, fc);
        px(g, mx + 2, my - 14, 20, 26, fc);
        px(g, mx + 8, my - 2, 6, 6, "#5a5f66");
        if (st.aiGen === 1) { px(g, mx + 4, my - 12, 12, 12, "#0d0d0d"); px(g, mx + 6, my - 10, 8, 8, "#1d3557"); px(g, mx + 7, my - 9, 3, 3, "#9ad"); px(g, mx + 18, my - 12, 3, 3, "#ff3b30"); }
        if (st.aiGen === 2) { px(g, mx + 6, my - 12, 7, 7, "#0d0d0d"); px(g, mx + 15, my - 13, 5, 4, "#3a3a3a"); }
        if (st.aiGen >= 3) { px(g, mx + 6, my - 12, 3, 3, "#0d0d0d"); if (Math.floor(this.t * 3) % 2) px(g, mx + 7, my - 11, 1, 1, "#9ad"); }
        break;
      }
      case "watch":
        if (st.watch === "smart") { px(g, mx - 24, my - 24, 48, 48, "#111"); px(g, mx - 20, my - 20, 40, 40, "#161a1f"); px(g, mx + 14, my - 4, 4, 8, "#333"); px(g, mx - 16, my - 16, 6, 2, "#2a2f36"); }   // 꺼진 화면 + 옆 버튼
        else if (st.watch === "blackanalog") { px(g, mx - 24, my - 24, 48, 48, "#111"); px(g, mx - 20, my - 20, 40, 40, "#22262c"); px(g, mx - 1, my - 16, 3, 18, "#e9e6da"); px(g, mx, my, 12, 3, "#e9e6da"); }
        else {
          px(g, mx - 24, my - 24, 48, 48, "#c9b48a"); px(g, mx - 20, my - 20, 40, 40, "#f4f2ea");
          px(g, mx - 1, my - 16, 3, 18, "#222"); px(g, mx, my, 12, 3, "#222");
          if (st.watch === "hybrid") px(g, mx - 10, my + 8, 20, 6, "#1f6f8b"); // 작은 알림 화면
        }
        break;
      case "eraser":
        px(g, mx - 30, my - 16, 60, 32, "#f2f2f2"); px(g, mx - 30, my - 16, 60, 14, "#4a7ac0");
        if (tells.eraserNote) for (let k = 0; k < 3; k++) px(g, mx - 22, my + 2 + k * 4, 36 - k * 8, 2, "#444");
        break;
      case "bottle":
        px(g, mx - 20, my - r, 40, r * 2, "#bfe3ef"); px(g, mx - 20, my - 14, 40, 28, "#3a8fbf");
        if (tells.bottleNote) for (let k = 0; k < 4; k++) px(g, mx - 14, my - 8 + k * 5, 28 - k * 4, 2, "#f4f2ea");
        break;
      case "ruler":
        px(g, mx - r, my - 12, r * 2, 24, "#e8d27a");
        for (let k = -r; k < r; k += 8) px(g, mx + k, my - 12, 2, 8, "#7a6a2a");
        if (tells.rulerNote) for (let k = 0; k < 3; k++) px(g, mx - 26 + k * 18, my + 2, 12, 2, "#444");
        break;
      case "pen":
        px(g, mx - r, my - 6, r * 2, 12, "#333"); px(g, mx + 20, my - 6, 20, 12, "#888");
        if (tells.camPen) { px(g, mx + 30, my - 3, 6, 6, "#0d0d0d"); px(g, mx + 31, my - 2, 2, 2, "#9ad"); }
        break;
      case "coin":
        g.fillStyle = "#c9a95a"; g.beginPath(); g.arc(mx, my, 28, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#b8963a"; g.beginPath(); g.arc(mx, my, 20, 0, Math.PI * 2); g.fill();
        if (tells.coin) { px(g, mx - 28, my, 56, 1, "#6a5020"); px(g, mx - 3, my - 3, 6, 6, "#6a5020"); }
        break;
      case "pencilcase":
        px(g, mx - r, my - 20, r * 2, 40, "#c0504d");
        for (let k = 0; k < 4; k++) px(g, mx - 30 + k * 16, my - 10, 6, 24, k % 2 ? "#e8d27a" : "#f2f2f2");
        break;
    }
    g.restore();
    g.strokeStyle = COLORS.chalk; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); g.stroke();
  }

  render(g: Ctx): void {
    const st = this.st;
    g.textBaseline = "top";
    g.imageSmoothingEnabled = false;
    // 벽과 문
    px(g, 0, 0, W, 118, "#c3bdab");
    px(g, 14, 8, 96, 110, "#6b4d33"); px(g, 20, 14, 84, 104, "#2e3138");
    const waiting = Math.min(3, this.s.room.students.length - this.idx - 1);
    for (let n = 0; n < waiting; n++) {
      const qx = 34 + n * 22, qy = 58 + n * 4;
      px(g, qx, qy, 12, 12, "#46403a"); px(g, qx - 3, qy + 12, 18, 40, "#3b4660");
    }
    // 학생 얼굴 (안경 벗음)
    drawPortrait(pg, st, false);
    g.drawImage(portC, 140, -6, 128, 128);
    // 책상
    px(g, 0, 118, W, 152, "#8a6644"); px(g, 0, 118, W, 4, "#a57c52");
    // 수험표
    px(g, 14, 132, 112, 74, "#f4f2ea"); px(g, 14, 132, 112, 12, COLORS.navy);
    g.font = PIX(8); g.fillStyle = "#f4f2ea"; g.fillText("2027 CSAT", 20, 134);
    drawPortrait(phg, st, st.photoMismatch && !!st.cheat && !st.confiscated);
    g.drawImage(photoC, 18, 148, 34, 34);
    g.font = PIX(8); g.fillStyle = "#333"; g.fillText(`NO.${30100 + st.seat}`, 56, 152);
    g.font = KR(11); g.fillText(`${st.seat}번 자리`, 56, 166);
    px(g, 20, 192, 96, 2, "#aab");
    // 바구니
    px(g, 140, 138, 196, 118, "#3e4852"); px(g, 146, 144, 184, 106, "#56626e");
    this.items.forEach((it, k) => {
      this.drawItem(g, it);
      if (k === this.sel) { g.strokeStyle = COLORS.accent; g.lineWidth = 1; g.strokeRect(it.x - 3.5, it.y - 3.5, it.w + 7, it.h + 7); }
    });
    // 도구 패널
    px(g, 344, 124, 130, 140, "#18211e");
    this.drawMagnifier(g, this.items[this.sel]);
    g.font = PIX(8); g.fillStyle = COLORS.chalk; g.fillText("x6", 352, 130);
    g.font = KR(10); g.fillText("금속 탐지", 420, 128);
    const parts = this.metalParts();
    ["머리", "손목", "몸통", "발"].forEach((nm, k) => {
      const y = 224 + k * 10;
      g.font = KR(10); g.fillStyle = COLORS.chalk; g.fillText(nm, 350, y - 1);
      const lvl = parts[k] + (Math.floor(this.t * 6 + k) % 3 === 0 ? 1 : 0);
      for (let n = 0; n < 6; n++) px(g, 378 + n * 15, y, 13, 7, n < lvl ? (n >= 4 ? COLORS.alert : n >= 2 ? COLORS.accent : COLORS.green) : "#2b3732");
    });
    // 상단: 시간·순서·버튼
    px(g, 300, 6, 174, 104, "rgba(16,22,20,0.92)");
    const sec = Math.floor((this.t / GATE_SECONDS) * 10);
    g.font = KR(12); g.fillStyle = COLORS.chalk;
    g.fillText(`08:${String(sec).padStart(2, "0")}  입실 마감 08:10  ${this.idx + 1}/20`, 308, 12);
    const btns: Array<[string, string, string]> = [["1 · PASS 통과", COLORS.green, "pass"], ["2 · HOLD 고른 물건 보관", COLORS.alert, "hold"], ["3 · CHECK 몸 수색 (6초)", COLORS.accent, "check"]];
    btns.forEach(([text, col], n) => {
      px(g, 308, 32 + n * 26, 158, 20, "#2b3732");
      g.font = KR(12); g.fillStyle = col; g.fillText(text, 314, 35 + n * 26);
    });
    // 기록
    if (this.log.length) label(g, this.log[0], 120, 100, { font: KR(11) });
    label(g, `민원 ${this.s.complaints}/3`, 14, 210, { font: KR(11) });
    if (this.helpOpen) this.renderHelp(g);
  }

  private renderHelp(g: Ctx): void {
    px(g, 0, 0, W, H, "rgba(0,0,0,0.6)");
    const x = 60, y = 30, w = 360, h = 200;
    px(g, x, y, w, h, "#f4f2ea");
    g.font = KR(16); g.fillStyle = COLORS.navy; g.fillText("입실 검사 · 08:00~08:10", x + 14, y + 12);
    g.font = KR(13); g.fillStyle = COLORS.ink;
    const lines = [
      "학생이 안경을 벗어 바구니에 올립니다. 물건을 클릭하면 확대경으로 봅니다.",
      "기기가 보이면 그 물건을 고르고 HOLD: 스스로 낸 것이니 보관하고 시험은 보게 합니다.",
      "몸에 숨긴 것 같거나 수험표 사진이 다르면 CHECK(6초 소모). 아무것도 없으면 민원.",
      "금속 탐지기는 금속테·시계에도 울립니다. 일반 안경을 뺏으면 민원이 들어옵니다.",
      "08:10이 되면 남은 학생은 검사 없이 들어갑니다.",
    ];
    let yy = y + 40;
    for (const p of lines) for (const l of wrapText(g, p, w - 30)) { g.fillText(l, x + 16, yy); yy += 17; }
    g.font = KR(12); g.fillStyle = "#7d776b"; g.fillText("클릭하면 시작합니다", x + 16, y + h - 22);
  }
}
