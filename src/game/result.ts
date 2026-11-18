// 결과 화면: 감독 결과 보고서
import { COLORS, H, KR, PIX, W, px, wrapText, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import { writeSave } from "../core/save";
import { CHEAT_BY_ID } from "../data/cheats";
import { EXAM_SECONDS, SCORE } from "../data/rules";
import type { Pose } from "../world/poses";
import type { Student } from "../world/student";
import type { Session } from "./session";

const HABIT_NAME: Partial<Record<Pose, string>> = {
  nosepush: "코받침을 밀어 올리는 습관", glassesoff: "안경을 벗어 렌즈를 닦는 습관", lookaround: "목을 풀며 두리번거리는 습관",
  ear: "귀를 긁는 습관", stretch: "기지개 켜는 습관", think: "턱 괴고 고민하는 습관", wrist: "시계로 남은 시간을 보는 습관",
  drink: "물 마시는 습관", cough: "감기 기침", stare: "어려운 문제에서 오래 멈추는 습관", neck: "목을 주무르는 습관",
  clothes: "옷매무새를 고치는 습관", glance: "감독관 쪽을 흘끗 보는 습관", flinch: "눈이 마주치면 움찔하는 소심한 성격", temple: "안경을 고쳐 쓰는 습관", underdesk: "다리를 긁는 습관", side: "목 스트레칭", palm: "손을 비비는 습관",
};

export type Grade = "S" | "A" | "B" | "C" | "D" | "F";

export interface ResultData {
  caughtExam: Student[];
  caughtGate: Student[];
  prevented: Student[];
  missed: Student[];
  wrong: Student[];
  score: number;
  grade: Grade;
  pass: boolean;
  newNotes: string[];
  twist: string | null;      // 결과에서 밝혀지는 반전
}

export function computeResult(s: Session): ResultData {
  const st = s.room.students;
  const caughtExam = st.filter((x) => x.outcome === "caught");
  const caughtGate = st.filter((x) => s.gateEjected.includes(x.seat) && x.cheat);
  const prevented = st.filter((x) => x.confiscated);
  const missed = st.filter((x) => x.cheat && !x.confiscated && x.outcome !== "caught" && !s.gateEjected.includes(x.seat));
  const wrong = st.filter((x) => x.outcome === "wrong" || s.gateWrong.includes(x.seat));
  let score = prevented.length * SCORE.gateHeld + caughtGate.length * SCORE.gateCaught - missed.length * Math.abs(SCORE.missed) - wrong.length * Math.abs(SCORE.wrong);
  for (const c of caughtExam) score += SCORE.caught + Math.round(SCORE.earlyBonusMax * Math.max(0, 1 - c.caughtAt / EXAM_SECONDS));
  const bad = missed.length + wrong.length;
  const early = s.catches.filter((c) => c.correct).every((c) => c.t < EXAM_SECONDS / 2);
  let grade: Grade = bad === 0 ? (early ? "S" : "A") : bad === 1 ? "B" : bad <= 3 ? "C" : "D";
  const cheaters = caughtExam.length + caughtGate.length + prevented.length + missed.length;
  if (cheaters > 0 && caughtExam.length + caughtGate.length + prevented.length === 0) grade = "D";
  if (s.replaced) grade = "F";
  const pass = grade !== "D" && grade !== "F";
  // 감독관 수첩: 이번에 처음 밝혀진 수법
  const found = [...caughtExam, ...caughtGate, ...missed, ...prevented].map((x) => x.cheat!.id);
  if (s.room.bribedAide) found.push("bribed");
  const leak = s.room.level >= 50 && missed.some((x) => x.cheat!.family === "ai");
  if (leak) found.push("leak");
  const newNotes = [...new Set(found)].filter((id) => !s.save.notebook.includes(id));
  const twist = s.room.bribedAide
    ? "부감독이 매수돼 있었습니다. 헛기침 힌트는 일부러 엉뚱한 학생을 가리켰습니다."
    : leak ? "놓친 AI 안경으로 찍힌 문제가 시험이 끝나기 전에 밖으로 유출됐습니다." : null;
  return { caughtExam, caughtGate, prevented, missed, wrong, score, grade, pass, newNotes, twist };
}

interface Btn { x: number; y: number; w: number; h: number; text: string; act: () => void }

export class ResultScene {
  readonly name = "result";
  data: ResultData;
  t = 0;
  btns: Btn[] = [];

  constructor(private s: Session, actions: { next: () => void; retry: () => void; title: () => void }) {
    this.data = computeResult(s);
    // 저장
    const sv = s.save;
    sv.notebook.push(...this.data.newNotes);
    const caughtIds = new Set([...this.data.caughtExam, ...this.data.caughtGate, ...this.data.prevented].map((x) => x.cheat!.id));
    for (const id of this.data.newNotes) if (!caughtIds.has(id)) sv.noteMissed.push(id);
    const prev = sv.bestGrades[s.room.level];
    if (!prev || "SABCDF".indexOf(this.data.grade) < "SABCDF".indexOf(prev)) sv.bestGrades[s.room.level] = this.data.grade;
    if (s.daily) { sv.daily[s.daily] ??= this.data.grade; }   // 오늘의 시험실은 첫 기록만, 회차 진행과 무관
    else if (this.data.pass && sv.level === s.room.level) sv.level = s.room.level + 1;
    if (!this.data.pass && !s.daily) sv.attempts[s.room.level] = (sv.attempts[s.room.level] ?? 0) + 1;   // 다시 하면 다른 배치
    // 적발한 학생은 1년 뒤(몇 회차 뒤) 재응시생으로 다시 나올 수 있다
    for (const x of [...this.data.caughtExam, ...this.data.caughtGate]) {
      if (x.alumnus) continue;
      sv.alumni.push({ hair: x.hair, shirt: x.shirt, skin: x.skin, longHair: x.longHair, method: x.cheat!.id, level: s.room.level });
    }
    sv.alumni = sv.alumni.slice(-30);
    writeSave(sv);
    const card: Btn = { x: 380, y: 106, w: 80, h: 18, text: "카드 저장", act: () => this.saveCard() };
    this.btns = s.daily
      ? [{ x: 236, y: 232, w: 108, h: 24, text: "처음 화면", act: actions.title }, card]
      : this.data.pass
      ? [{ x: 236, y: 232, w: 108, h: 24, text: "다음 감독 ▶", act: actions.next }, { x: 352, y: 232, w: 108, h: 24, text: "처음 화면", act: actions.title }]
      : [{ x: 236, y: 232, w: 108, h: 24, text: "다시 감독하기", act: actions.retry }, { x: 352, y: 232, w: 108, h: 24, text: "처음 화면", act: actions.title }];
    if (!s.daily) this.btns.push(card);
  }

  /** 결과 카드 PNG (개인 정보 없음) */
  saveCard(): void {
    const d = this.data, s = this.s;
    const c = document.createElement("canvas"); c.width = 320; c.height = 180;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    px(g, 0, 0, 320, 180, COLORS.paper); px(g, 0, 0, 320, 26, COLORS.navy);
    g.textBaseline = "top"; g.font = KR(16); g.fillStyle = "#f4f2ea"; g.fillText("AI 안경 감독관", 10, 5);
    g.font = KR(12); g.fillStyle = COLORS.ink;
    g.fillText(s.daily ? `오늘의 시험실 ${s.daily}` : `${s.room.level}번째 감독`, 12, 36);
    g.fillText(`${s.room.school} 제${s.room.roomNo}시험실`, 12, 54);
    const rows: Array<[string, string]> = [["적발", `${d.caughtExam.length + d.caughtGate.length}`], ["입실 보관", `${d.prevented.length}`], ["놓침", `${d.missed.length}`], ["오인", `${d.wrong.length}`], ["점수", `${d.score}`]];
    rows.forEach(([k, v], n) => { g.fillText(k, 12, 80 + n * 17); g.fillText(v, 90, 80 + n * 17); });
    g.save(); g.translate(250, 100); g.rotate(-0.18);
    g.strokeStyle = "#c0392b"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.stroke();
    g.font = KR(d.grade === "F" ? 22 : 48); g.fillStyle = "#c0392b";
    const gt = d.grade === "F" ? "교체" : d.grade; g.fillText(gt, -g.measureText(gt).width / 2, d.grade === "F" ? -12 : -26);
    g.restore();
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ai-glasses-proctor-${s.daily ?? "lv" + s.room.level}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  update(dt: number, inp: Input): void {
    this.t += dt;
    if (inp.clicked && this.t > 0.8) {
      for (const b of this.btns) if (inp.mouseX >= b.x && inp.mouseX <= b.x + b.w && inp.mouseY >= b.y && inp.mouseY <= b.y + b.h) b.act();
    }
    if (inp.hit("Enter") && this.t > 0.8) this.btns[0].act();
  }

  render(g: Ctx): void {
    const d = this.data, s = this.s;
    g.textBaseline = "top";
    px(g, 0, 0, W, H, "#2b3732");
    px(g, 10, 8, 460, 254, COLORS.paper);
    px(g, 10, 8, 460, 24, COLORS.navy);
    g.font = KR(15); g.fillStyle = "#f4f2ea"; g.fillText("감독 결과 보고서", 20, 12);
    g.font = KR(12); g.fillStyle = "#cfd6e6";
    const head = `${s.room.level}번째 감독 · ${s.room.school} 제${s.room.roomNo}시험실`;
    g.fillText(head, 460 - g.measureText(head).width, 14);

    // 자리 배치도
    g.font = KR(12); g.fillStyle = COLORS.ink; g.fillText("자리 배치도", 22, 38);
    px(g, 22, 54, 196, 8, COLORS.ink); g.font = PIX(8); g.fillStyle = COLORS.paper; g.fillText("FRONT", 104, 54);
    for (const st of s.room.students) {
      const c = st.i % 5, r = Math.floor(st.i / 5);
      const x = 22 + c * 40, y = 68 + r * 32;
      let col = "#d6d1c3", tc = "#7d776b";
      if (d.caughtExam.includes(st) || d.caughtGate.includes(st)) { col = COLORS.accent; tc = COLORS.ink; }
      if (d.prevented.includes(st)) { col = "#9fb7d9"; tc = COLORS.ink; }
      if (d.missed.includes(st)) { col = Math.floor(this.t * 3) % 2 ? "#ff5a4f" : "#d9443a"; tc = "#fff"; }
      px(g, x, y, 34, 26, col);
      if (d.wrong.includes(st)) {
        px(g, x, y, 34, 26, "#b9b4a8");
        for (let k = -26; k < 34; k += 6) for (let q = 0; q < 26; q++) { const xx = k + q; if (xx >= 0 && xx < 34) px(g, x + xx, y + q, 1, 1, "#8d887d"); }
        tc = COLORS.ink;
      }
      g.font = PIX(8); g.fillStyle = tc; g.fillText(String(st.seat).padStart(2, "0"), x + 3, y + 3);
      if (d.caughtGate.includes(st) || d.prevented.includes(st)) { g.font = KR(10); g.fillText("입실", x + 14, y + 14); }
    }
    // 감독 동선 (1교시 파랑 점, 2교시 보라 점) + 부정행위가 일어난 자리의 빨간 점
    const mx = (x: number) => 22 + ((x - 1.2) / 1.9) * 40 + 17;
    const mz = (z: number) => Math.max(63, Math.min(190, 68 + ((z - 4) / 2.2) * 32 + 13));
    s.path.forEach(([p, x, z], k) => { if (k % 2 === 0) px(g, mx(x), mz(z), 2, 2, p === 0 ? "#3a5a9a" : "#7a4a9a"); });
    for (const a of s.acts) {
      const st = s.room.students[a.seat - 1];
      const c = st.i % 5, r = Math.floor(st.i / 5);
      const k = s.acts.filter((b) => b.seat === a.seat).indexOf(a);
      if (k < 6) { const dx = 22 + c * 40 + 4 + k * 4, dy = 68 + r * 32 + 19; px(g, dx - 1, dy - 1, 5, 5, "#3a2a20"); px(g, dx, dy, 3, 3, a.near ? "#7fd18c" : "#ffffff"); }   // 흰 점 = 못 본 행동, 초록 = 가까이서 봄
    }
    g.font = KR(11); g.fillStyle = "#7d776b";
    g.fillText("주황 적발 · 파랑 보관 · 빨강 놓침 · 빗금 오인 · 흰 점 못 본 행동", 22, 194);

    // 통계
    const sx = 236;
    const rows: Array<[string, string]> = [
      ["적발", `${d.caughtExam.length + d.caughtGate.length}명`],
      ["입실 보관", `${d.prevented.length}명`],
      ["놓침", `${d.missed.length}명`],
      ["오인", `${d.wrong.length}명`],
      ["민원", `${s.complaints} / 3`],
      ["점수", `${d.score}`],
    ];
    rows.forEach(([k, v], n) => {
      g.font = KR(13); g.fillStyle = COLORS.ink;
      g.fillText(k, sx, 38 + n * 15); g.fillText(v, sx + 74, 38 + n * 15);
      px(g, sx, 52 + n * 15, 120, 1, "#cfc9b9");
    });
    // 등급 도장
    if (this.t > 0.7) {
      g.save(); g.translate(412, 72); g.rotate(-0.18);
      g.strokeStyle = "#c0392b"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
      g.font = KR(d.grade === "F" ? 20 : 36); g.fillStyle = "#c0392b";
      const gt = d.grade === "F" ? "교체" : d.grade;
      g.fillText(gt, -g.measureText(gt).width / 2, d.grade === "F" ? -11 : -19);
      g.restore();
    }

    // 등급 근거 한 줄
    {
      const bad = d.missed.length + d.wrong.length;
      const why = d.grade === "F" ? "민원 3칸: 감독관 교체" : d.grade === "D" && bad <= 3 ? "한 명도 잡거나 막지 못함" :
        d.grade === "S" ? "놓침·오인 0 + 전반부에 모두 적발" : d.grade === "A" ? "놓침·오인 0" : `놓침+오인 ${bad}명 → ${d.grade}`;
      g.font = KR(11); g.fillStyle = "#9c2d23"; g.fillText(`등급 근거: ${why}`, sx, 130);
    }
    // 공개: 놓친 학생 / 오인
    let y = 145;
    const BOTTOM = 226;            // 버튼(232) 위까지만
    const box = (title: string, body: string, color: string, bg: string) => {
      g.font = KR(11);
      const room = Math.floor((BOTTOM - y - 18) / 13);
      if (room < 1) return;        // 자리가 없으면 그리지 않음
      const lines = wrapText(g, body, 214).slice(0, Math.min(3, room));
      const hgt = 18 + lines.length * 13;
      px(g, sx, y, 226, hgt, bg); px(g, sx, y, 3, hgt, color);
      g.font = KR(12); g.fillStyle = color; g.fillText(title, sx + 8, y + 3);
      g.font = KR(11); g.fillStyle = COLORS.ink;
      lines.forEach((l, i) => g.fillText(l, sx + 8, y + 17 + i * 13));
      y += hgt + 4;
    };
    if (d.twist) box("반전", d.twist, "#6a2a8a", "#ece0f2");
    for (const m of d.missed.slice(0, 2)) {
      const acts = s.acts.filter((a) => a.seat === m.seat);
      const seen = acts.filter((a) => a.near).length;
      const why = acts.length ? ` (행동 ${acts.length}번 중 가까이서 본 건 ${seen}번)` : "";
      box(`놓친 학생 · ${m.seat}번 · ${m.cheat!.name}`, m.cheat!.hint + why, "#9c2d23", "#f7e3df");
    }
    for (const w of d.wrong.slice(0, Math.max(0, 2 - d.missed.length))) {
      const reason = (w.lastHabit && HABIT_NAME[w.lastHabit]) || w.habits.map((h) => HABIT_NAME[h]).filter(Boolean)[0] || "평범한 행동";
      const byHint = s.aideHintSeats.includes(w.seat);
      if (w.alumnus?.clean) { box(`오인 · ${w.seat}번 (재응시생)`, `작년 기록만 보고 판단했습니다. 올해는 깨끗하게 시험을 봤습니다.`, "#5a554b", "#e2ded3"); continue; }
      box(`오인 · ${w.seat}번`, byHint ? `부감독 헛기침 힌트가 틀렸습니다(힌트는 약 70%만 맞음). 실제로는 ${reason}이었습니다.` : `${reason}이었습니다. 무고한 학생이었습니다.`, "#5a554b", "#e2ded3");
    }
    if (!d.missed.length && !d.wrong.length) box("깨끗한 감독", "놓친 학생도, 잘못 잡은 학생도 없습니다.", "#2f6b3a", "#e0eddc");

    // 처분·수첩
    // 왼쪽 아래 (폭 205px 안에서 줄바꿈)
    g.font = KR(11); g.fillStyle = "#7d776b";
    wrapText(g, "적발자 처분: 당해 시험 무효. 무선기기 등 중대 행위는 다음 해 응시 자격 정지", 205)
      .slice(0, 2).forEach((l, i) => g.fillText(l, 22, 206 + i * 11));
    if (d.newNotes.length) {
      if (Math.floor(this.t * 2) % 2) { px(g, 22, 231, 30, 13, COLORS.accent); g.font = PIX(8); g.fillStyle = COLORS.bg; g.fillText("NEW", 26, 234); }
      g.font = KR(12); g.fillStyle = COLORS.ink;
      const first = CHEAT_BY_ID[d.newNotes[0]].name;
      let note = `수첩 · ${first}${d.newNotes.length > 1 ? ` 외 ${d.newNotes.length - 1}` : ""}`;
      while (g.measureText(note).width > 150 && note.length > 6) note = note.slice(0, -2) + "…";
      g.fillText(note, 58, 231);
    }
    if (!d.pass) { g.font = KR(12); g.fillStyle = "#9c2d23"; g.fillText(s.replaced ? "민원 가득: 감독관 교체" : "D 등급: 다시 맡습니다", 22, 246); }

    for (const b of this.btns) {
      const main = b === this.btns[0];
      px(g, b.x, b.y, b.w, b.h, main ? COLORS.navy : "#cfc9b9");
      g.font = KR(13); g.fillStyle = main ? "#f4f2ea" : COLORS.ink;
      g.fillText(b.text, b.x + b.w / 2 - g.measureText(b.text).width / 2, b.y + 5);
    }
  }
}
