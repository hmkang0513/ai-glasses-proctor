// 감독 회차(레벨)별 시험실 생성: 난이도 곡선, 부정행위자 배정, 무고한 학생 습관
import { makeRng, pick, randInt, shuffle, type Rng } from "../core/rng";
import { ASSIGNABLE, CHEAT_BY_ID, type CheatMethod } from "./cheats";
import { AI1_STYLES, AI2_STYLE, GSTYLES } from "../world/glasses";
import { COLX, ROWZ, type Student } from "../world/student";
import type { Pose } from "../world/poses";

const SCHOOLS = ["한빛고", "새솔고", "늘봄고", "푸른숲고", "다온고", "가람고", "해오름고", "별빛여고", "솔뫼고", "나래고", "도담고", "누리고"];
const HAIR = ["#2b2320", "#3d2b22", "#1c1c24", "#5a3a28", "#6b4a2f", "#241a16"];
const SHIRT = ["#e4e4ea", "#2f3e63", "#e4e4ea", "#4a5a48", "#2f3e63", "#c9b48a", "#7a3b3b", "#3b4660"];
const SKIN = ["#f1c9a5", "#e0b48e", "#d6a57f", "#f3d0b0"];

export interface Room {
  level: number;
  seed: number;
  school: string;
  roomNo: number;
  aiGen: 1 | 2 | 3 | 4;
  students: Student[];
  tutorial: string[];
  gate: boolean;
  periods: 1 | 2 | 3;      // 1~3회차는 1교시만, 40회차부터 3교시(영어 듣기평가)까지
  notes: string[];         // 감독 명부 메모 (재응시생 등)
  bribedAide: boolean;     // 50회차~: 부감독이 매수됨 (힌트가 엉뚱한 학생을 가리킴)
  outageChance: number;
  smuggleChance: number;
}

export function aiGenFor(level: number): 1 | 2 | 3 | 4 {
  return level < 10 ? 1 : level < 25 ? 2 : level < 50 ? 3 : 4;
}

const aiMethodFor = (gen: number) => (gen === 1 ? "ai1" : gen === 2 ? "ai2" : "ai3");

function tutorialFor(level: number): string[] {
  if (level === 1) return [
    "수석감독관 메모 · 첫 감독",
    "WASD로 걷고, 마우스로 고개를 돌립니다. 화면을 클릭하면 마우스가 고정됩니다.",
    "수상한 학생을 화면 가운데 두고 E로 관찰하세요(4m 안). 관찰한 학생만 F로 적발할 수 있습니다.",
    "왼쪽 위에 남은 부정행위자 수가 나옵니다. 못 찾겠으면 부감독이 헛기침으로 알려 줍니다.",
    "올해부터 AI 안경 반입 금지. 두꺼운 안경다리와 빨간 불빛을 잘 보세요.",
    "학생이 부정행위를 시작하면 머리 위에 잠깐 \"!\"가 뜹니다. 그 학생을 관찰해 보세요.",
    "무고한 학생을 잡으면 민원이 들어옵니다. 확실할 때만 잡으세요.",
  ];
  if (level === 2) return [
    "수석감독관 메모 · 두 번째 감독",
    "입실 검사 수고했습니다. 검사에서 놓친 기기는 시험 중에 꼭 다시 쓰게 됩니다.",
    "학생이 부정행위를 시작하면 머리 위에 잠깐 \"!\"가 뜹니다. 관찰(E)하면 무엇이 보였는지 한 줄로 적어 줍니다.",
    "Q를 누르면 이 명부를 다시 볼 수 있습니다.",
  ];
  if (level === 3) return [
    "수석감독관 메모 · 세 번째 감독",
    "안경을 고쳐 쓰는 학생은 많습니다. 행동 하나보다 무엇과 이어지는지 보세요.",
    "한 학생 옆에 너무 오래 서 있으면 \"감독관이 쳐다봐서 불편하다\"는 민원이 들어옵니다.",
    "Tab을 누르면 교실 뒤 CCTV 화면으로 볼 수 있습니다.",
    "수상한 학생은 Z로 머리 위에 표시해 둘 수 있습니다. 판정에는 영향이 없습니다.",
    "막히면 H로 부감독에게 물어보세요. 교시마다 한 번, 수상한 구역을 알려 줍니다.",
  ];
  if (level === 4) return [
    "수석감독관 메모 · 네 번째 감독",
    "이제 학생들이 눈치를 챕니다. 바로 옆까지 가면 멈추니 두세 걸음 떨어져서 지켜보세요.",
    "오늘부터 1교시 전 12초 동안 시계를 확인합니다. 학생들이 시계를 책상 위에 올려 둡니다.",
    "스마트워치는 관찰(E) 뒤 F로 보관합니다. 아날로그 시계를 가져가면 민원이 들어옵니다.",
    "이번 감독부터는 1교시 뒤 2교시도 있습니다.",
  ];
  return [];
}

function cheaterCount(level: number, r: Rng): number {
  if (level === 1) return 1;
  if (level <= 3) return randInt(r, 1, 2);
  return Math.min(6, 1 + Math.floor(level / 8) + (r() < 0.3 ? 1 : 0));
}

/** 이번 회차에 나올 수 있는 수법 목록 */
function poolFor(level: number, gen: number): CheatMethod[] {
  const aiId = aiMethodFor(gen);
  return ASSIGNABLE.filter((c) => c.minLevel <= level && (c.family !== "ai" || c.id === aiId));
}

function blankStudent(i: number, r: Rng): Student {
  return {
    i, seat: i + 1, x: COLX[i % 5], z: ROWZ[Math.floor(i / 5)],
    hair: pick(r, HAIR), shirt: pick(r, SHIRT), skin: pick(r, SKIN), longHair: r() < 0.4,
    glasses: null, watch: "none", alumnus: null,
    cheat: null, aiGen: 0, partner: -1, group: -1, habits: [], timid: false, lastStretchAt: -99, overtime: false, skipGlanceUntil: -1,
    pose: "write", loopIdx: 0, stepT: 0, acting: false, habitPose: null, habitT: 0, lastHabit: null,
    nextCheatAt: 0, nextHabitAt: 0, combos: 0, heatUntil: -1, ledOn: false,
    observed: false, stareT: 0, stareComplained: false,
    status: "seated", outcome: "none", caughtAt: -1, leaveT: 0,
    confiscated: false, photoMismatch: false,
  };
}

/** 같은 줄 옆자리 또는 앞뒤 자리 짝 찾기 */
function findPair(free: Set<number>, r: Rng, vertical: boolean): [number, number] | null {
  const cands: [number, number][] = [];
  for (const a of free) {
    const b = vertical ? a + 5 : a % 5 < 4 ? a + 1 : -1;
    if (b >= 0 && b < 20 && free.has(b)) cands.push([a, b]);
  }
  return cands.length ? pick(r, cands) : null;
}

/** 부정행위자가 한 줄에 몰리지 않게: 부정행위자가 가장 적은 줄에서 고른다 */
function spreadPick(students: Student[], free: Set<number>, r: Rng): number {
  const rowCount = [0, 0, 0, 0];
  for (const s of students) if (s.cheat) rowCount[Math.floor(s.i / 5)]++;
  const min = Math.min(...[...free].map((k) => rowCount[Math.floor(k / 5)]));
  return pick(r, [...free].filter((k) => rowCount[Math.floor(k / 5)] === min));
}

export interface Alumnus { hair: string; shirt: string; skin: string; longHair: boolean; method: string; level: number }

export function buildRoom(level: number, seed = level * 7919 + 13, alumnus: Alumnus | null = null): Room {
  const r = makeRng(seed);
  const gen = aiGenFor(level);
  const students = Array.from({ length: 20 }, (_, i) => blankStudent(i, r));
  const free = new Set(students.map((s) => s.i));

  // --- 부정행위자 배정 ---
  const pool = poolFor(level, gen);
  let remaining = cheaterCount(level, r);
  const chosen: CheatMethod[] = [];
  // 최근에 풀린 수법은 우선 등장 (안내 없이 자연스럽게 처음 만나게)
  const fresh = pool.filter((c) => c.minLevel > level - 4 && c.minLevel <= level);
  if (fresh.length && level > 1) chosen.push(pick(r, fresh));
  if (level === 1) chosen.push(CHEAT_BY_ID.ai1);
  while (chosen.length < remaining + 2) chosen.push(r() < 0.35 && pool.some((c) => c.family === "ai") ? CHEAT_BY_ID[aiMethodFor(gen)] : pick(r, pool));

  let groupNo = 0;
  for (const m of chosen) {
    if (remaining <= 0) break;
    if (m.kind === "pair") {
      if (remaining < 2) continue;
      const pr = findPair(free, r, m.id === "swap");
      if (!pr) continue;
      const [a, b] = pr;
      for (const k of [a, b]) { students[k].cheat = m; free.delete(k); }
      students[a].partner = b; students[b].partner = a;
      remaining -= 2;
    } else if (m.kind === "group") {
      if (remaining < 3) continue;
      const ids = shuffle(r, [...free]).slice(0, 3);
      for (const k of ids) { students[k].cheat = m; students[k].group = groupNo; free.delete(k); }
      groupNo++;
      remaining -= 3;
    } else {
      const k = spreadPick(students, free, r);
      students[k].cheat = m; free.delete(k);
      remaining -= 1;
    }
  }

  const singles = pool.filter((c) => c.kind === "exam" || c.kind === "gate");
  while (remaining > 0 && free.size && singles.length) {
    const k = spreadPick(students, free, r);
    students[k].cheat = pick(r, singles); free.delete(k);
    remaining--;
  }

  // 2~5회차: 입실 검사로 걸러지지 않는 수법 1명을 뒤쪽 두 줄에 → 판이 너무 짧게 끝나지 않게
  if (level >= 2 && level <= 5) {
    const noGate = (c: CheatMethod) => !c.gate.tray && !c.gate.hidden && !c.gate.photoMismatch && c.kind === "exam" && c.family !== "ai";   // AI 안경은 입실 확대경에 보임
    const hasBack = students.some((s) => s.cheat && s.i >= 10 && noGate(s.cheat));
    const backFree = [...free].filter((k) => k >= 10);
    const choices = pool.filter(noGate);
    if (!hasBack && backFree.length && choices.length) {
      // 앞쪽 단독 부정행위자 한 명을 빼고 뒤쪽에 새로 둠 (인원 유지)
      const front = students.find((s) => s.cheat && s.i < 10 && s.cheat.kind === "exam" && s.partner < 0 && s.group < 0);
      if (front) { front.cheat = null; free.add(front.i); }
      const k = pick(r, backFree);
      students[k].cheat = pick(r, choices); free.delete(k);
    }
  }

  // --- 외형: 안경 약 55% (9~13명), 부정행위에 필요한 안경은 강제 ---
  const wantGlasses = randInt(r, 9, 13);
  const needs = students.filter((s) => s.cheat?.needsGlasses);
  const others = shuffle(r, students.filter((s) => !s.cheat?.needsGlasses));
  const wearers = new Set([...needs, ...others.slice(0, Math.max(0, wantGlasses - needs.length))]);
  for (const s of students) {
    if (!wearers.has(s)) continue;
    if (s.cheat?.family === "ai" || s.cheat?.id === "coin") {
      s.aiGen = s.cheat.family === "ai" ? gen : (s.cheat.tells.aiGen ?? gen);
      s.glasses = s.aiGen === 1 ? pick(r, AI1_STYLES) : s.aiGen === 2 ? AI2_STYLE : pick(r, GSTYLES);
    } else s.glasses = pick(r, GSTYLES);
  }

  // 2회차: 검은 뿔테 일반 안경을 쓴 무고한 학생 (1세대 AI 안경과 헷갈리는 미끼)
  if (level === 2) {
    const inn = students.filter((s) => !s.cheat);
    const d = inn.find((s) => s.glasses) ?? inn[0];
    d.glasses = GSTYLES[3];
  }

  // 시험 포기 퇴실 이벤트(44회차~): 얇은 AI 안경을 쓴 2명. 입실 검사에서도 보이도록 여기서 정한다
  if (level >= 44 && r() < 0.25) {
    const cands = shuffle(r, students.filter((s) => !s.cheat && s.glasses)).slice(0, 2);   // 안경 착용 수 유지
    for (const s of cands) { s.cheat = CHEAT_BY_ID.earlyexit; s.aiGen = 2; s.glasses = AI2_STYLE; }
  }

  // --- 시계 ---
  for (const s of students) {
    if (s.cheat?.id === "watch") s.watch = level >= 20 && r() < 0.5 ? "hybrid" : "smart";
    else s.watch = r() < 0.4 ? (level >= 7 && r() < 0.35 ? "blackanalog" : "analog") : "none";
  }

  // --- 재수생: 예전에 적발한 학생이 다시 응시 (절반은 깨끗, 절반은 수법 업그레이드) ---
  const notes: string[] = [];
  if (alumnus) {
    const clean = r() < 0.5;
    const cands = clean ? students.filter((s) => !s.cheat) : students.filter((s) => s.cheat && s.cheat.kind !== "pair" && s.cheat.kind !== "group" && !s.cheat.needsGlasses);
    if (cands.length) {
      const s = pick(r, cands);
      s.hair = alumnus.hair; s.shirt = alumnus.shirt; s.skin = alumnus.skin; s.longHair = alumnus.longHair;
      if (!clean) {
        // 작년과 다른 계열의 수법으로 업그레이드
        const prev = CHEAT_BY_ID[alumnus.method];
        const up = pool.filter((c) => (c.kind === "exam" || c.kind === "gate") && !c.needsGlasses && c.family !== prev?.family);
        if (up.length) s.cheat = pick(r, up);
        if (s.cheat?.id === "watch") s.watch = level >= 20 ? "hybrid" : "smart";
      }
      s.alumnus = { from: alumnus.level, method: alumnus.method, clean };
      notes.push(`${s.seat}번 자리: ${alumnus.level}번째 감독 때 "${CHEAT_BY_ID[alumnus.method]?.name ?? "부정행위"}"로 적발된 학생입니다. 응시 자격 정지가 끝나 재응시했습니다.`);
    }
  }

  if (level === 10) notes.push("올해부터 LED를 가린 얇은 AI 안경(2세대)이 나옵니다. 안경다리를 만진 직후 10초 안에 열화상(T)으로 보면 테가 뜨겁습니다. 갑자기 정전이 나면 당황하지 말고 LED·화면 불빛을 찾으세요.");
  if (level === 16) notes.push("시험장 지급 장비: 전파 탐지기(R). 관찰 중 쓰면 무선 기기가 켜져 있을 때 바늘이 흔들립니다. 교시당 2회.");

  // --- 대리시험: 수험표 사진 불일치 ---
  for (const s of students) if (s.cheat?.id === "proxy") s.photoMismatch = true;

  // --- 무고한 습관 프로필 (고정) + 미끼 ---
  const decoyN = level <= 2 ? 0 : level <= 5 ? 1 : Math.min(9, 2 + Math.floor(level / 6));   // 초반은 미끼를 거의 두지 않음
  const innocents = shuffle(r, students.filter((s) => !s.cheat));
  innocents.forEach((s, n) => {
    const opts: Pose[] = ["think", "stretch", "drink", "cough", "ear", "clothes", "neck"];
    if (level > 2) opts.push("lookaround");   // 1~2회차는 AI 안경과 헷갈리는 두리번거림 없음
    if (s.glasses) opts.push("nosepush", "glassesoff");
    if (s.watch !== "none") opts.push("wrist");
    const habits: Pose[] = [pick(r, opts)];
    if (n < decoyN) {
      // 미끼: 현재 나오는 부정행위와 비슷한 동작을 습관으로
      const lookalike: Pose[] = [];
      if (s.glasses) lookalike.push("temple", "nosepush");
      if (level >= 25) lookalike.push("stare");
      if (level >= 5) lookalike.push("underdesk");
      lookalike.push("lookaround", "palm");
      habits.push(pick(r, lookalike));
    }
    s.habits = habits;
  });
  for (const s of students) if (s.cheat) s.habits = [pick(r, ["think", "stretch", "drink"] as Pose[])];
  for (const s of students) if (!s.cheat && level > 2 && r() < 0.1) s.habits.push("glance");   // 평범한 학생은 가끔만
  // 소심한 무고 학생 1~3명 (눈이 마주치면 움찔 → 움찔만으로는 범인을 확정할 수 없게)
  if (level > 2) for (const s of shuffle(r, students.filter((x) => !x.cheat)).slice(0, Math.max(1, Math.min(4, students.filter((x) => x.cheat).length)))) { s.timid = true; if (!s.habits.includes("glance")) s.habits.push("glance"); }
  // 2회차 미끼: 검은 뿔테 학생은 안경을 자주 고쳐 씀
  if (level === 2) {
    const d = students.find((s) => !s.cheat && s.glasses === GSTYLES[3]);
    if (d) d.habits = ["temple", "nosepush"];
  }

  // 시작 시각 흩뜨리기
  for (const s of students) {
    s.nextCheatAt = 4 + r() * 10;
    s.nextHabitAt = 3 + r() * 14;
  }
  // 짝·집단은 같은 박자로
  for (const s of students) {
    if (s.partner >= 0 && s.partner > s.i) students[s.partner].nextCheatAt = s.nextCheatAt + 0.7;
    if (s.group >= 0) {
      const lead = students.find((o) => o.group === s.group)!;
      s.nextCheatAt = lead.nextCheatAt + (s === lead ? 0 : 0.3);
    }
  }

  return {
    level, seed,
    school: pick(r, SCHOOLS),
    roomNo: randInt(r, 1, 28),
    aiGen: gen,
    students,
    tutorial: tutorialFor(level),
    gate: level >= 2,
    periods: level <= 3 ? 1 : level >= 40 ? 3 : 2,
    notes,
    bribedAide: level >= 50 && r() < 0.2,
    outageChance: level >= 10 ? Math.min(0.45, 0.15 + level * 0.006) : 0,
    smuggleChance: level >= 20 ? Math.min(0.3, 0.1 + (level - 20) * 0.005) : 0,
  };
}
