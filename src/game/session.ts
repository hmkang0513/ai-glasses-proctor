// 한 판(시험 하루)의 상태
import type { Room } from "../data/levels";
import { buildRoom } from "../data/levels";
import type { SaveData } from "../core/save";
import { makeRng, type Rng } from "../core/rng";

export interface CatchRecord {
  seat: number;
  period: number;    // -1 = 입실 검사
  t: number;
  correct: boolean;
}

export interface Session {
  room: Room;
  save: SaveData;
  r: Rng;
  period: 0 | 1 | 2;
  complaints: number;        // 0~3 (0.5 단위)
  warningUsed: boolean;
  catches: CatchRecord[];
  gateHeld: number[];        // 입실 검사에서 기기를 보관한 자리
  gateEjected: number[];     // 입실 검사에서 숨기다 걸려 퇴실한 자리
  gateWrong: number[];       // 입실 검사에서 잘못 의심한 자리
  smuggled: number[];        // 쉬는 시간 반입 학생 자리
  replaced: boolean;         // 민원 가득 → 감독 교체
  aideHintSeats: number[];   // 부감독 헛기침 힌트가 가리킨 자리
  marked: number[];          // 플레이어가 의심 표시(Z)한 자리
  used: string[];            // 이번 판에 써 본 도구 (thermal·cctv·tiptoe·radio·ask)
  goal: { id: string; text: string } | null;   // 오늘의 작은 목표 (선택, 점수와 무관)
  seenClues: Array<{ seat: number; period: number; text: string }>;   // 관찰 중 본 단서 문구 (쉬는 시간 돌아보기)
  path: Array<[number, number, number]>;   // 감독관 동선 [교시, x, z] (0.5초마다)
  acts: Array<{ seat: number; period: number; t: number; near: boolean }>;   // 부정행위 동작 시작 순간
  daily: string | null;      // 오늘의 시험실 날짜 키 (YYYY-MM-DD)
  startedAt: number;
}

/** 오늘 날짜 키와 시드 (그날은 누구나 같은 교실) */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const DAILY_LEVEL = 20;

export function newSession(save: SaveData, levelOverride?: number, attempt = 0, daily: string | null = null): Session {
  const level = daily ? DAILY_LEVEL : levelOverride ?? save.level;
  // 3회차 이상 지난 적발 학생 중 하나가 40% 확률로 재응시
  const ready = save.alumni.filter((a) => a.level <= level - 6);
  let alumnus: SaveData["alumni"][number] | null = null;
  if (!daily && ready.length && Math.random() < 0.4) {
    alumnus = ready[Math.floor(Math.random() * ready.length)];
    save.alumni = save.alumni.filter((a) => a !== alumnus);
  }
  const dailySeed = daily ? Number(daily.replace(/-/g, "")) : undefined;
  const room = buildRoom(level, dailySeed ?? (attempt ? level * 7919 + 13 + attempt * 104729 : undefined), alumnus);
  return {
    room, save, r: makeRng(room.seed ^ 0x5eed),
    period: 0, complaints: 0, warningUsed: false,
    catches: [], gateHeld: [], gateEjected: [], gateWrong: [], smuggled: [],
    replaced: false, aideHintSeats: [], marked: [], used: [], goal: pickGoal(level, room.seed, save.usedEver ?? [], save.lastGoal), seenClues: [], path: [], acts: [], daily, startedAt: performance.now(),
  };
}

/** 오늘의 작은 목표: 새 도구를 한 번씩 써 보게 하는 부드러운 안내 (못 해도 불이익 없음) */
export function pickGoal(level: number, seed: number, usedEver: string[] = [], last?: string): { id: string; text: string } | null {
  if (level < 3) return null;
  const list: Array<[string, string, number]> = [
    ["back", "뒤쪽 줄까지 한 바퀴 돌기", 3], ["calm", "민원 없이 끝내기", 3], ["mark", "Z로 의심 표시 해 보기", 3],
    ["cctv", "Tab으로 CCTV 화면 한 번 보기", 3], ["thermal", "열화상(T) 한 번 써 보기", 6], ["tiptoe", "Shift 까치발로 걸어 보기", 5],
    ["ask", "H로 부감독에게 물어보기", 3], ["radio", "전파 탐지기(R) 써 보기", 16], ["report", "반장 제보 들어 보기", 11],
  ];
  let ok = list.filter((g) => level >= g[2] && g[0] !== last);
  const fresh = ok.filter((g) => !usedEver.includes(g[0]));   // 안 써 본 도구부터
  if (fresh.length) ok = fresh;
  const g = ok[Math.abs(seed * 31 + level * 7) % ok.length];
  return { id: g[0], text: g[1] };
}

/** 작은 목표를 해냈는지 */
export function goalDone(s: Session): boolean {
  const g = s.goal;
  if (!g) return false;
  if (g.id === "back") return s.path.some(([, , z]) => z > 9.2);
  if (g.id === "calm") return s.complaints === 0 && !s.replaced;
  if (g.id === "mark") return s.marked.length > 0;
  return s.used.includes(g.id);
}
