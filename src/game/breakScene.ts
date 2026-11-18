// 쉬는 시간: 1교시 요약 + (확률) 화장실 반입
import { COLORS, H, KR, W, px, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import { CHEAT_BY_ID } from "../data/cheats";
import { BREAK_LABEL, BREAK_SECONDS, LUNCH_LABEL, PERIODS } from "../data/rules";
import type { Session } from "./session";
import { END_WHEN_ALL_CAUGHT } from "../data/rules";
import { isCheating } from "../world/student";

export class BreakScene {
  readonly name = "break";
  t = 0;
  constructor(private s: Session, private onDone: () => void) {
    // 화장실 다녀오며 기기를 가져오는 학생 (낮은 확률, 고급 수법)
    if (s.r() < s.room.smuggleChance) {
      const cands = s.room.students.filter((x) => x.status === "seated" && !x.cheat);
      if (cands.length) {
        const st = cands[Math.floor(s.r() * cands.length)];
        st.cheat = CHEAT_BY_ID.smuggle;
        s.smuggled.push(st.seat);
      }
    }
  }

  update(dt: number, inp: Input): void {
    this.t += dt;
    if ((this.t > 2 && (inp.clicked || inp.hit("Space") || inp.hit("Enter"))) || this.t > BREAK_SECONDS) this.onDone();
  }

  render(g: Ctx): void {
    g.textBaseline = "top";
    px(g, 0, 0, W, H, "#1b2420");
    // 복도 창밖 느낌
    for (let k = 0; k < 6; k++) px(g, 20 + k * 78, 30, 60, 70, k % 2 ? "#5d7299" : "#6a7fa3");
    px(g, 0, 110, W, 160, "#8a857b");
    for (let n = 0; n < 7; n++) {
      const x = ((this.t * 18 + n * 70) % 520) - 20;
      px(g, x, 150, 8, 8, "#2b2320"); px(g, x - 2, 158, 12, 14, n % 2 ? "#2f3e63" : "#e4e4ea");
    }
    px(g, 60, 180, 380, 80, "rgba(16,22,20,0.92)");
    const lunch = this.s.period === 1;   // 2교시 뒤는 점심시간
    const allFound = END_WHEN_ALL_CAUGHT && !this.s.room.students.some((x) => isCheating(x));   // 반입 판정은 생성자에서 이미 끝남
    g.font = KR(20); g.fillStyle = COLORS.accent; g.fillText(lunch ? LUNCH_LABEL : BREAK_LABEL, 76, 188);
    const caught = this.s.catches.filter((c) => c.correct && c.period === this.s.period).length;
    g.font = KR(13); g.fillStyle = COLORS.chalk;
    g.fillText(`${PERIODS[this.s.period].name.slice(0, 3)} 적발 ${caught}명 · ${lunch ? "학생들이 점심을 먹고 돌아옵니다." : "학생들이 화장실에 다녀옵니다."}`, 76, 214);
    g.fillStyle = "#9aa69f";
    if (allFound) { g.fillStyle = COLORS.chalk; g.fillText("이 교실의 부정행위자를 모두 찾았습니다. 다음 교시는 부감독이 맡습니다.", 76, 232); }
    g.fillStyle = "#9aa69f";
    g.fillText(this.t > 2 ? (allFound ? "클릭하면 결과 보고서 ▶" : `클릭하면 ${PERIODS[this.s.period + 1]?.name ?? "다음 교시"}을 시작합니다`) : "", 76, allFound ? 246 : 232);
  }
}
