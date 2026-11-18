// 하루 끝 교무실 한 컷: 결과 다음 2~4초, 동료 감독관 한마디 (누르면 넘어감)
import { COLORS, H, KR, W, px, wrapText, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import { CHEAT_BY_ID } from "../data/cheats";
import type { ResultData } from "./result";
import type { Session } from "./session";
import { writeSave } from "../core/save";

/** 상황에 맞는 동료 대사: 위에서부터 조건이 맞는 것 중 최근 3판에 안 나온 첫 줄 (게임 설정) */
function colleagueLine(s: Session, d: ResultData): string {
  const fresh = d.newNotes.map((id) => CHEAT_BY_ID[id]).find(Boolean);
  const perfect = !d.missed.length && !d.wrong.length && !s.replaced;
  const firstT = Math.min(...s.catches.filter((c) => c.correct && c.period === 0).map((c) => c.t), 999);
  const rows: Array<[boolean, string]> = [
    [s.room.level === 1, "첫 감독 어땠어요? 저도 처음엔 다리가 후들거렸어요."],
    [s.replaced, "오늘은 민원이 많았죠? 커피 한잔하고 내일 다시 해요."],
    [perfect && firstT < 60, "벌써 찾으셨어요? 눈이 매섭다고 소문나겠는데요."],
    [!!fresh, fresh ? `${fresh.name}이요? 그런 것도 있군요. 수첩에 꼭 적어 두세요.` : ""],
    [perfect, "오늘 그 교실은 아무 일 없었다면서요? 깔끔하네요."],
    [s.used.includes("overtimeCatch"), "종료령 뒤에도 쓰는 학생, 은근히 있어요. 끝까지 잘 봤네요."],
    [s.used.includes("outage"), "아까 정전 났을 때 놀랐죠? 방송실도 한참 우왕좌왕했대요."],
    [d.prevented.length > 0, "입실 검사에서 미리 막았다면서요. 그게 제일 깔끔한 방법이에요."],
    [s.room.students.some((x) => x.alumnus), "예전에 그 학생 기억나요? 올해 다시 시험 보러 왔더라고요."],
    [s.room.periods === 3, "듣기평가 땐 발소리 하나에도 신경 쓰이죠. 고생했어요."],
    [d.missed.length > 0, "다 잡는 사람은 없어요. 놓친 건 결과 보고서에서 한 번 보고 가요."],
    [d.wrong.length > 0, "저도 기침하는 애를 의심한 적이 있어요. 확실할 때만 잡아도 돼요."],
    [s.room.theme === "cold", "오늘 교실마다 기침 소리가 엄청났대요. 마스크 챙기세요."],
    [s.room.theme === "rain", "비 오는 날은 교실이 어둑해서 눈이 더 피곤하죠."],
    [true, "요즘 AI 안경 뉴스 보셨어요? 감독도 점점 바빠지네요."],
    [true, "오늘도 수고 많으셨어요. 내일도 감독 있으시죠?"],
  ];
  const recent = s.save.recentLines ?? [];
  const ok = rows.filter(([c, l]) => c && l);
  const line = (ok.find(([, l]) => !recent.includes(l)) ?? ok[0])[1];
  s.save.recentLines = [...recent, line].slice(-3);
  return line;
}

export class StaffroomScene {
  t = 0;
  line: string;
  constructor(private s: Session, d: ResultData, private onDone: () => void) {
    this.line = colleagueLine(s, d);
    writeSave(s.save);   // 최근 대사 기억 (3판 안 반복 금지)
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
