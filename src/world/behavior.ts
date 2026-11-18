// 학생 행동 갱신
import type { Rng } from "../core/rng";
import { HEAT_SECONDS } from "../data/rules";
import { isCheating, type Student } from "./student";
import type { Pose } from "./poses";

export interface BehaviorCtx {
  t: number;
  dt: number;
  r: Rng;
  level: number;
  /** 감독관과의 거리(m) */
  dist: (s: Student) => number;
  /** 감독관이 이 학생 쪽을 보고 있는지 */
  watched: (s: Student) => boolean;
  /** 학생이 감독관을 의식하는지 (앞에 있으면 시야, 등 뒤면 최근에 흘끗 본 경우만) */
  noticed?: (s: Student) => boolean;
  collecting?: boolean;   // 종료령 뒤 답안지 회수 중
  freezeRange: number;
  outage: boolean;
  lastMinutes: boolean;   // 종료 10분 전 (게임 설정: 부정행위자가 조급해짐)
}

const HABIT_DUR: Partial<Record<Pose, number>> = {
  nosepush: 0.5, glassesoff: 2.2, lookaround: 1.2, ear: 0.6, stretch: 1.6, think: 2.5, wrist: 0.6,
  drink: 1.2, cough: 0.5, stare: 2.2, neck: 0.7, clothes: 0.8, temple: 0.7, underdesk: 0.8, side: 0.9, palm: 0.6, glance: 0.6,
};

export function updateStudent(s: Student, ctx: BehaviorCtx): void {
  if (s.status !== "seated") return;
  const { t, dt, r } = ctx;
  const cheating = isCheating(s);

  // 감독관이 바로 옆에서 보고 있으면 부정행위를 멈춘다
  const near = ctx.dist(s) < ctx.freezeRange && (ctx.noticed ? ctx.noticed(s) : ctx.watched(s));
  // 종료령 뒤: 모두 펜을 내려놓음. 종료 후 답안을 쓰는 학생만 계속 씀
  if (ctx.collecting) { s.acting = false; s.habitPose = null; s.pose = s.cheat?.id === "overtime" ? "burst" : "stare"; return; }
  if (cheating && s.acting && near) {
    s.acting = false;
    s.pose = "write";
    s.ledOn = false;
    s.nextCheatAt = t + 3 + r() * 3;
  }

  // --- 부정행위 동작 ---
  if (cheating && s.cheat!.loop.length) {
    const loop = s.cheat!.loop;
    if (s.acting) {
      s.stepT += dt;
      if (s.loopIdx < 0) {                 // 0단계: 감독관 쪽을 흘끗 보고 나서 시작
        s.pose = "glance";
        if (s.stepT >= 0.5) { s.loopIdx = 0; s.stepT = 0; }
        return;
      }
      const step = loop[s.loopIdx];
      s.pose = step.pose;
      if (s.stepT >= step.dur) {
        s.stepT = 0;
        s.loopIdx++;
        if (s.loopIdx >= loop.length) {
          s.acting = false;
          s.combos++;
          s.pose = "write";
          // 등 뒤에 있거나 정전이면 더 자주
          const bold = (!ctx.watched(s) || ctx.outage ? 0.55 : 1) * (ctx.lastMinutes ? (ctx.level >= 25 ? 0.75 : 0.5) : 1);
          const [a, b] = s.cheat!.interval;
          s.nextCheatAt = t + (a + r() * (b - a)) * bold;
        }
      }
      // AI 안경: 촬영·질문하면 테가 뜨거워진다
      if (s.aiGen > 0 && (s.pose === "temple" || s.pose === "mouth" || s.pose === "coin")) s.heatUntil = t + HEAT_SECONDS;
      const blinkOn = ctx.level <= 1 || Math.floor(t * 4) % 2 === 0;   // 1회차는 계속 켜져 있어 찾기 쉬움
      s.ledOn = s.aiGen === 1 && (s.pose === "temple" || s.pose === "paperup") && blinkOn;
      return;
    }
    if (t >= s.nextCheatAt && !near && !s.habitPose) {
      s.acting = true;
      const glanceP = ctx.level <= 3 ? 0.5 : 0.3;
      s.loopIdx = t < s.skipGlanceUntil || ctx.dist(s) > 6 || r() >= glanceP ? 0 : -1;   // 가끔 흘끗 보고 시작 (방금 움찔했거나 멀면 바로)
      s.stepT = 0;
      s.pose = s.loopIdx < 0 ? "glance" : loop[0].pose;
      return;
    }
  }

  // --- 무고한 습관 ---
  if (s.habitPose) {
    s.habitT -= dt;
    s.pose = s.habitPose;
    if (s.habitT <= 0) {
      s.habitPose = null;
      s.pose = "write";
      s.nextHabitAt = t + 7 + r() * 13;
    }
    return;
  }
  if (t >= s.nextHabitAt && s.habits.length) {
    let p = s.habits[Math.floor(r() * s.habits.length)];
    // 기지개(만세)는 시험 중에 드묾: 4번 중 3번은 목만 가볍게 돌림, 같은 학생은 90초 안에 다시 안 함
    if (p === "stretch" && (r() < 0.75 || t - s.lastStretchAt < 90)) p = "neck";
    if (p === "stretch") s.lastStretchAt = t;
    if ((p === "nosepush" || p === "glassesoff" || p === "temple") && !s.glasses) {
      s.nextHabitAt = t + 5;
      return;
    }
    s.habitPose = p;
    s.lastHabit = p;
    s.habitT = HABIT_DUR[p] ?? 1;
    s.pose = p;
    return;
  }
  s.pose = "write";
}
