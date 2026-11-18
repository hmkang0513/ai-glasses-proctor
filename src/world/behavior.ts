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
  freezeRange: number;
  outage: boolean;
  lastMinutes: boolean;   // 종료 10분 전 (게임 설정: 부정행위자가 조급해짐)
}

const HABIT_DUR: Partial<Record<Pose, number>> = {
  nosepush: 0.5, glassesoff: 2.2, lookaround: 1.2, ear: 0.6, stretch: 1.6, think: 2.5, wrist: 0.6,
  drink: 1.2, cough: 0.5, stare: 2.2, neck: 0.7, clothes: 0.8, temple: 0.7, underdesk: 0.8, side: 0.9, palm: 0.6, glance: 1.0,
};

export function updateStudent(s: Student, ctx: BehaviorCtx): void {
  if (s.status !== "seated") return;
  const { t, dt, r } = ctx;
  const cheating = isCheating(s);

  // 감독관이 바로 옆에서 보고 있으면 부정행위를 멈춘다
  const near = ctx.dist(s) < ctx.freezeRange && ctx.watched(s);
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
        if (s.stepT >= 0.7) { s.loopIdx = 0; s.stepT = 0; }
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
      s.loopIdx = -1;                      // 흘끗 보기부터
      s.stepT = 0;
      s.pose = "glance";
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
    const p = s.habits[Math.floor(r() * s.habits.length)];
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
