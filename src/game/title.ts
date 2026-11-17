// 시작 화면: 시험장 학교 정문, 감독 회차·시험실, 모드 선택
import { COLORS, KR, PIX, W, px, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import { rankTitle, writeSave, type SaveData } from "../core/save";
import { todayKey } from "./session";
import { buildRoom } from "../data/levels";
import { titleLeaves } from "../render/effects";

interface Btn { x: number; y: number; w: number; h: number; act: () => void }

// 회차별 시험실 이름 캐시 (매 프레임 시험실을 새로 만들지 않게)
const roomInfo = new Map<number, { school: string; roomNo: number }>();
function info(n: number) {
  let v = roomInfo.get(n);
  if (!v) { const r = buildRoom(n); v = { school: r.school, roomNo: r.roomNo }; roomInfo.set(n, v); }
  return v;
}

export class TitleScene {
  readonly name = "title";
  t = 0;
  btns: Btn[] = [];
  confirmReset = false;
  leaves = titleLeaves();

  constructor(private save: SaveData, private onStart: () => void, private onDaily: () => void) {}

  update(dt: number, inp: Input): void {
    this.t += dt;
    this.leaves.update(dt);
    this.btns = [
      { x: 324, y: 227, w: 66, h: 14, act: () => { this.save.mode = "fp"; writeSave(this.save); } },
      { x: 324, y: 244, w: 66, h: 14, act: () => { this.save.mode = "cctv"; writeSave(this.save); } },
      { x: 396, y: 227, w: 68, h: 32, act: () => this.onStart() },
      { x: 330, y: 196, w: 134, h: 20, act: () => this.onDaily() },
      { x: 406, y: 8, w: 66, h: 16, act: () => {
        if (!this.confirmReset) { this.confirmReset = true; return; }
        this.save.level = 1; this.save.notebook = []; this.save.noteMissed = []; this.save.bestGrades = {}; this.save.attempts = {}; this.save.alumni = []; writeSave(this.save); this.confirmReset = false;
      } },
    ];
    if (inp.clicked) {
      let hit = false;
      for (const b of this.btns) if (inp.mouseX >= b.x && inp.mouseX <= b.x + b.w && inp.mouseY >= b.y && inp.mouseY <= b.y + b.h) { b.act(); hit = true; }
      if (!hit) this.confirmReset = false;
    }
    if (inp.hit("Enter") || inp.hit("Space")) this.onStart();
  }

  render(g: Ctx): void {
    const t = this.t;
    const lv = this.save.level;
    const room = info(lv);
    g.textBaseline = "top";
    ["#2b3a5c", "#3d5278", "#5d7299", "#8e93a8", "#c9a27a"].forEach((c, n) => px(g, 0, n * 40, W, 40, c));
    px(g, 50, 80, 380, 120, "#c9c1ad"); px(g, 50, 80, 380, 6, "#a59d8a");
    px(g, 210, 52, 60, 34, "#c9c1ad"); px(g, 226, 58, 28, 22, "#f2efe6");
    px(g, 239, 61, 2, 10, "#222"); px(g, 239, 69, 7, 2, "#222");
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
      if (c === 4 || c === 5) continue;
      px(g, 64 + c * 36, 96 + r * 32, 24, 18, (r + c) % 4 ? "#8fbfd4" : "#e8d27a");
    }
    px(g, 196, 150, 88, 50, "#5a4636"); px(g, 200, 154, 80, 46, "#2e3138");
    px(g, 150, 128, 180, 16, "#f4f2ea"); px(g, 150, 128, 180, 2, "#c0504d");
    g.font = KR(12); g.fillStyle = "#3a2a20";
    const banner = "2027학년도 대학수학능력시험 시험장";
    g.fillText(banner, 240 - g.measureText(banner).width / 2, 130);
    px(g, 0, 200, W, 70, "#6e6a62"); px(g, 0, 200, W, 3, "#8a857b");
    px(g, 40, 168, 14, 40, "#8a8478"); px(g, 426, 168, 14, 40, "#8a8478");
    for (let n = 0; n < 5; n++) {
      const x = ((t * 14 + n * 96) % 520) - 30, y = 205 + (n % 2) * 6;
      const step = Math.floor(t * 5 + n) % 2;
      px(g, x, y, 8, 8, n % 2 ? "#2b2320" : "#3d2b22");
      px(g, x - 2, y + 8, 12, 12, n % 3 ? "#2f3e63" : "#e4e4ea");
      px(g, x, y + 20, 3, 6 + step, "#23262e"); px(g, x + 5, y + 20, 3, 7 - step, "#23262e");
    }
    this.leaves.draw(g);
    g.font = KR(40);
    g.fillStyle = COLORS.bg; g.fillText("AI 안경 감독관", 22, 14);
    g.fillStyle = "#f4f2ea"; g.fillText("AI 안경 감독관", 20, 12);
    g.font = PIX(8); g.fillStyle = COLORS.accent; g.fillText("PROCTOR  :  AI  GLASSES", 22, 56);
    // 명찰 (감독 경력 칭호)
    px(g, 20, 68, 120, 18, "#f4f2ea"); px(g, 20, 68, 4, 18, COLORS.accent);
    g.font = KR(12); g.fillStyle = COLORS.ink; g.fillText(`명찰 · ${rankTitle(lv)}`, 28, 70);
    // 오늘의 시험실
    const dk = todayKey(), dg = this.save.daily[dk];
    px(g, 330, 196, 134, 20, "rgba(16,22,20,0.9)");
    g.font = KR(12); g.fillStyle = COLORS.accent;
    g.fillText(dg ? `오늘의 시험실 · ${dg} 등급` : "오늘의 시험실 도전 ▶", 338, 199);

    // 처음부터 (확인 2번)
    px(g, 406, 8, 66, 16, "rgba(16,22,20,0.7)");
    g.font = KR(11); g.fillStyle = this.confirmReset ? COLORS.alert : "#9aa69f";
    g.fillText(this.confirmReset ? "정말 초기화?" : "처음부터", 414, 10);

    // 하단 패널
    px(g, 10, 222, 460, 42, "rgba(16,22,20,0.92)");
    const cards = [lv - 2, lv - 1, lv, lv + 1].filter((n) => n >= 1).slice(-4);
    while (cards.length < 4) cards.push(cards[cards.length - 1] + 1);
    cards.forEach((n, k) => {
      const x = 16 + k * 76, active = n === lv, open = n <= lv;
      const rm = open ? info(n) : null;
      px(g, x, 227, 70, 32, active ? COLORS.accent : open ? "#2b3732" : "#1a2220");
      g.font = KR(11); g.fillStyle = active ? COLORS.bg : open ? COLORS.accent : "#4a5a52";
      const grade = this.save.bestGrades[n];
      g.fillText(`${n}회차${grade ? " · " + grade : ""}`, x + 5, 230);
      g.font = KR(12); g.fillStyle = active ? COLORS.bg : open ? COLORS.chalk : "#4a5a52";
      g.fillText(rm ? `${rm.school} ${rm.roomNo}실` : "잠김", x + 5, 243);
    });
    const fp = this.save.mode === "fp";
    g.font = KR(12);
    px(g, 324, 227, 66, 14, fp ? COLORS.accent : "#2b3732"); g.fillStyle = fp ? COLORS.bg : COLORS.chalk; g.fillText("1인칭", 342, 228);
    px(g, 324, 244, 66, 14, !fp ? COLORS.accent : "#2b3732"); g.fillStyle = !fp ? COLORS.bg : COLORS.green; g.fillText("CCTV", 342, 245);
    px(g, 396, 227, 68, 32, Math.floor(t * 2) % 2 ? "#e9e6da" : "#c9c6ba");
    g.font = KR(14); g.fillStyle = COLORS.bg; g.fillText("시험 시작", 405, 236);
    g.font = KR(11); g.fillStyle = "#e9e6da";
    g.fillText(`이번 감독: ${room.school} 제${room.roomNo}시험실`, 16, 206);
  }
}
