// 시험장 들어가기 (짧은 오프닝): 1회차는 정문 → 교실 문 → 명부 받기 3컷, 2회차부터는 교실 문만 1초
// 학생이 감독관을 쳐다보는 연출은 넣지 않는다 (사용자 요청)
import { COLORS, H, KR, W, px, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import type { Session } from "./session";

export class OpeningScene {
  readonly name = "opening";
  t = 0;
  private cuts: Array<"gate" | "door" | "clip">;
  private len: number;
  constructor(private s: Session, private onDone: () => void) {
    this.cuts = s.room.level === 1 ? ["gate", "door", "clip"] : ["door"];
    this.len = s.room.level === 1 ? 1.1 : 1.0;
  }
  update(dt: number, inp: Input): void {
    this.t += dt;
    if (inp.clicked || inp.hit("Space") || inp.hit("Enter") || this.t >= this.cuts.length * this.len) this.onDone();
  }
  render(g: Ctx): void {
    g.textBaseline = "top";
    const k = Math.min(this.cuts.length - 1, Math.floor(this.t / this.len));
    const u = (this.t - k * this.len) / this.len;   // 컷 안에서 0→1
    const cut = this.cuts[k];
    if (cut === "gate") {
      // 정문: 학교 건물과 현수막
      px(g, 0, 0, W, H, "#5d7299"); px(g, 0, 150, W, 120, "#8a857b");
      px(g, 90, 50, 300, 110, "#d8d2c2");
      for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) px(g, 106 + c * 36, 66 + r * 40, 24, 22, "#8fbfd4");
      px(g, 205, 120, 70, 40, "#4a3a2a");
      px(g, 110, 26, 260, 20, "#f4f2ea"); px(g, 110, 26, 260, 3, COLORS.alert);
      g.font = KR(12); g.fillStyle = COLORS.ink; g.fillText(`2027학년도 대학수학능력시험 · ${this.s.room.school} 시험장`, 118, 31);
    } else if (cut === "door") {
      // 교실 문: 미닫이문이 미끄러져 열림 (교실 안은 밝은 빛만)
      px(g, 0, 0, W, H, "#c3bdab"); px(g, 0, 200, W, 70, "#8a7a62");
      px(g, 150, 40, 180, 170, "#e9e4d2");                        // 문 안쪽(교실 빛)
      const open = Math.min(1, u / 0.6) * 88;
      px(g, 150 + open, 40, 92, 170, "#6b4d33"); px(g, 160 + open, 60, 60, 60, "#8fbfd4");   // 문짝
      px(g, 238, 40, 92, 170, "#5e432c"); px(g, 250, 60, 60, 60, "#8fbfd4");
      px(g, 200, 14, 80, 22, "#f4f2ea"); g.font = KR(13); g.fillStyle = COLORS.navy; g.fillText(`제${this.s.room.roomNo}시험실`, 210, 18);
    } else {
      // 명부 받기: 수석감독관이 명부를 건넴 (가운데 → 오른쪽 아래 명부 자리)
      px(g, 0, 0, W, H, "#b9b3a1"); px(g, 0, 170, W, 100, "#86684a");
      const e = Math.min(1, u / 0.7);
      const x = 200 + (W - 96 - 200) * e, y = 80 + (H - 66 - 80) * e;
      px(g, x - 30, y + 30, 40, 14, "#39435a");                   // 건네는 팔
      px(g, x, y, 62, 80, "#5a3f28"); px(g, x + 4, y + 6, 54, 74, "#f4f2ea");
      for (let i = 0; i < 6; i++) px(g, x + 10, y + 16 + i * 8, 34, 2, "#aab");
      g.font = KR(14); g.fillStyle = COLORS.ink; g.fillText("오늘 이 교실은 선생님 담당입니다.", 40, 40);
    }
    g.font = KR(10); g.fillStyle = "#3a3a3a"; g.fillText("누르면 건너뛰기", W - 90, 6);
  }
}
