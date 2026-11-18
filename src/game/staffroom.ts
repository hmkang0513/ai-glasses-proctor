// 하루 끝 교무실 한 컷: 결과 다음 2~4초, 동료 감독관 한마디 (누르면 넘어감)
import { COLORS, H, KR, W, px, wrapText, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import { CHEAT_BY_ID } from "../data/cheats";
import type { ResultData } from "./result";
import type { Session } from "./session";

/** 상황에 맞는 동료 대사 하나 (게임 설정) */
function colleagueLine(s: Session, d: ResultData): string {
  const lv = s.room.level;
  const seed = lv * 13 + s.catches.length;
  const pick = (a: string[]) => a[seed % a.length];
  // 처음 만난 수법이 있으면 실제 사례 이야기
  const fresh = d.newNotes.map((id) => CHEAT_BY_ID[id]).find((c) => c && c.url);
  if (fresh) return `오늘 "${fresh.name}" 보셨다면서요? 실제로도 있었던 일이래요. (${fresh.source})`;
  if (!d.missed.length && !d.wrong.length) return pick([
    "그 교실 조용했다면서요? 역시 꼼꼼하시네요.",
    "오늘 깔끔하게 끝내셨네요. 커피 한잔하세요.",
    "수석감독관님이 칭찬하시던데요?",
  ]);
  if (d.wrong.length) return pick([
    "민원 처리하느라 고생하셨어요. 애매하면 조금 더 지켜봐도 돼요.",
    "저도 처음엔 안경 고쳐 쓰는 애들만 봐도 다 수상해 보였어요.",
  ]);
  if (d.missed.length) return pick([
    "놓친 건 결과표에 다 나와요. 다음엔 보일 거예요.",
    "뒤쪽 줄은 부감독이랑 나눠 보면 편해요. H로 물어보세요.",
    "요즘 수법이 워낙 다양해서요. 수첩 한번 넘겨 보세요.",
  ]);
  return pick([
    "요즘 AI 안경 뉴스 보셨어요? 올해 수능부터 반입 금지래요.",
    "오늘도 수고 많으셨어요. 내일도 감독 있으시죠?",
  ]);
}

export class StaffroomScene {
  t = 0;
  line: string;
  constructor(private s: Session, d: ResultData, private onDone: () => void) {
    this.line = colleagueLine(s, d);
  }
  update(dt: number, inp: Input): void {
    this.t += dt;
    if ((this.t > 0.6 && (inp.clicked || inp.hit("Space") || inp.hit("Enter"))) || this.t > 6) this.onDone();
  }
  render(g: Ctx): void {
    g.textBaseline = "top";
    // 교무실: 벽, 창, 책상, 커피, 감독 명부
    px(g, 0, 0, W, H, "#cfc6b4");
    px(g, 30, 20, 120, 80, "#8fb0cf"); px(g, 88, 20, 4, 80, "#e8e2d4"); px(g, 30, 58, 120, 4, "#e8e2d4");
    px(g, 330, 26, 110, 70, "#5a4a3a"); px(g, 336, 32, 98, 58, "#f4f2ea");   // 게시판
    for (let k = 0; k < 4; k++) px(g, 342, 40 + k * 12, 70 - (k % 2) * 20, 3, "#aab");
    px(g, 0, 170, W, 100, "#8a6a4a"); px(g, 0, 170, W, 6, "#6a4f36");         // 책상
    px(g, 120, 150, 70, 24, "#f4f2ea"); px(g, 124, 156, 50, 2, "#aab"); px(g, 124, 162, 40, 2, "#aab");   // 명부
    px(g, 210, 148, 18, 22, "#e9e6da"); px(g, 228, 154, 6, 10, "#e9e6da"); px(g, 212, 150, 14, 4, "#5a3a22");   // 커피
    const steam = Math.floor(this.t * 3) % 2;
    px(g, 214 + steam, 138, 2, 6, "#ffffff88"); px(g, 220 - steam, 134, 2, 6, "#ffffff88");
    // 동료 감독관 (앉아서 고개를 돌림)
    px(g, 330, 112, 40, 58, "#39435a"); px(g, 336, 84, 28, 28, "#e0b48e"); px(g, 334, 80, 32, 10, "#2b2320");
    px(g, 342, 96, 3, 3, "#1a1414"); px(g, 354, 96, 3, 3, "#1a1414"); px(g, 346, 104, 8, 2, "#8a4a40");
    // 말풍선
    g.font = KR(13);
    const lines = wrapText(g, this.line, 260).slice(0, 3);
    const bh = 20 + lines.length * 17;
    px(g, 40, 196, 300, bh, "#fffdf6"); px(g, 300, 186, 10, 12, "#fffdf6");
    g.fillStyle = COLORS.ink;
    lines.forEach((l, i) => g.fillText(l, 52, 206 + i * 17));
    g.font = KR(11); g.fillStyle = "#f4e9d0";
    g.fillText(`${this.s.room.level}번째 감독 끝 · 교무실`, 40, 178);
    if (this.t > 0.6) { g.fillStyle = "#f4e9d0"; g.fillText("누르면 다음 감독 ▶", W - 120, H - 16); }
  }
}
