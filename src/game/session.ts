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
  const ready = save.alumni.filter((a) => a.level <= level - 3);
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
    replaced: false, aideHintSeats: [], marked: [], seenClues: [], path: [], acts: [], daily, startedAt: performance.now(),
  };
}
