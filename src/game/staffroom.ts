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
    [s.room.students.some((x) => x.alumnus?.clean && x.outcome !== "wrong"), "엽서 왔어요. 예전에 잡혔던 학생이래요. \"올해는 제 힘으로 시험 봤어요. 그때 고마웠습니다.\""],
    [perfect && firstT < 60, "벌써 찾으셨어요? 눈이 매섭다고 소문나겠는데요."],
    [!!fresh, fresh ? `${fresh.name}이요? 그런 것도 있군요. 수첩에 꼭 적어 두세요.` : ""],
    [perfect, "오늘 그 교실은 아무 일 없었다면서요? 깔끔하네요."],
    [s.used.includes("report"), "반장이 제보해 줬다면서요? 요즘 애들 참 든든하네요."],
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

/** 교무실 책상 물건: 조건을 처음 만족하면 생기고 계속 남음 (판정과 무관) */
const DESK: Array<[string, (s: Session) => boolean]> = [
  ["box", (s) => (s.save.stats?.caught ?? 0) >= 5],
  ["plant", (s) => (s.save.stats?.perfect ?? 0) >= 3],
  ["mug2", (s) => (s.save.stats?.stars ?? 0) >= 5],
  ["nameplate", (s) => s.room.level >= 25],
  ["nameplate2", (s) => s.room.level >= 50],
  ["books", (s) => s.save.notebook.length >= 10],
  ["postcard", (s) => !!s.save.stats?.postcard],
  ["memoframe", (s) => (s.save.stats?.s ?? 0) >= 5],
  ["calendar", (s) => s.room.level >= 10],
];

export class StaffroomScene {
  t = 0;
  line: string;
  fresh: string[] = [];   // 이번 판에 새로 생긴 물건 (NEW 반짝임)
  constructor(private s: Session, d: ResultData, private onDone: () => void) {
    this.line = colleagueLine(s, d);
    const desk = (s.save.desk ??= []);
    for (const [id, ok] of DESK) if (!desk.includes(id) && ok(s)) { desk.push(id); this.fresh.push(id); }
    writeSave(s.save);   // 최근 대사 기억 (3판 안 반복 금지)
  }
  update(dt: number, inp: Input): void {
    this.t += dt;
    if ((this.t > 0.6 + this.fresh.length * 0.4 && (inp.clicked || inp.hit("Space") || inp.hit("Enter"))) || this.t > 6) this.onDone();
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
    this.drawDesk(g);
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

  /** 책상 위·벽 물건 (기획 12라운드 ② 좌표) */
  private drawDesk(g: Ctx): void {
    const has = (id: string) => this.s.save.desk?.includes(id);
    const at: Record<string, [number, number]> = {};
    if (has("box")) { px(g, 18, 150, 40, 20, "#6f7d86"); px(g, 18, 150, 40, 4, "#5a6670"); px(g, 31, 158, 14, 6, "#f4f2ea"); at.box = [38, 146]; }
    if (has("plant")) { px(g, 72, 158, 20, 12, "#a0613a"); px(g, 70, 144, 8, 10, "#4f8a4a"); px(g, 78, 140, 8, 12, "#6aa860"); px(g, 86, 146, 8, 10, "#4f8a4a"); at.plant = [82, 136]; }
    if (has("mug2")) { px(g, 248, 152, 14, 18, "#c0504d"); px(g, 262, 156, 4, 8, "#c0504d"); px(g, 248, 152, 14, 3, "#f4f2ea"); at.mug2 = [255, 148]; }
    if (has("nameplate2")) { px(g, 272, 160, 44, 10, "#2a2a4a"); px(g, 276, 162, 36, 2, "#e8c35a"); px(g, 276, 166, 36, 2, "#e8c35a"); at.nameplate2 = [294, 156]; }
    else if (has("nameplate")) { px(g, 272, 160, 44, 10, "#3a3a3a"); px(g, 276, 163, 36, 3, "#e8c35a"); at.nameplate = [294, 156]; }
    if (has("nameplate") || has("nameplate2")) { g.font = KR(8); g.fillStyle = "#e8c35a"; g.fillText(has("nameplate2") ? "수석" : "베테랑", 278, 151); }
    if (has("books")) {
      const cs = ["#3a5a8a", "#8a3a3a", "#4a7a4a", "#c9a95a"];
      for (let k = 0; k < 6; k++) { const hh = 30 + (k % 3) * 3; px(g, 392 + k * 10, 168 - hh, 8, hh, cs[k % 4]); }
      px(g, 386, 168, 72, 4, "#6a4f36"); at.books = [420, 128];
    }
    if (has("postcard")) { px(g, 172, 40, 36, 24, "#f4e9d0"); px(g, 199, 43, 6, 6, "#c0504d"); px(g, 176, 50, 20, 2, "#aab"); px(g, 176, 55, 20, 2, "#aab"); px(g, 189, 38, 2, 2, "#c8322a"); at.postcard = [190, 34]; }
    if (has("memoframe")) { px(g, 220, 34, 40, 30, "#5a4a3a"); px(g, 224, 38, 32, 22, "#fff3a8"); px(g, 238, 46, 3, 3, "#e8a13a"); at.memoframe = [240, 30]; }
    if (has("calendar")) {
      px(g, 276, 30, 30, 38, "#f4f2ea"); px(g, 276, 30, 30, 6, "#c0504d");
      for (let k = 0; k < 16; k++) px(g, 279 + (k % 4) * 7, 39 + Math.floor(k / 4) * 7, 4, 4, "#ccc");
      const marks = Math.min(16, Math.floor(this.s.room.level / 10));
      for (let k = 0; k < marks; k++) px(g, 279 + (k % 4) * 7, 39 + Math.floor(k / 4) * 7, 4, 4, "#c0504d");
      at.calendar = [291, 26];
    }
    // 이번 판에 새로 생긴 물건: 하나씩 0.4초 간격으로 NEW
    this.fresh.forEach((id, k) => {
      const p = at[id];
      if (!p || this.t < k * 0.4 || Math.floor(this.t * 4) % 2) return;
      px(g, p[0] - 13, p[1] - 12, 26, 11, COLORS.accent);
      g.font = KR(9); g.fillStyle = "#1a1414"; g.fillText("NEW", p[0] - 10, p[1] - 11);
    });
  }
}
