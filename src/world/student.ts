// 학생 데이터
import type { CheatMethod } from "../data/cheats";
import type { GStyle } from "./glasses";
import type { Pose } from "./poses";

export const COLX = [1.2, 3.1, 5.0, 6.9, 8.8];   // 책상 열 x (m)
export const ROWZ = [4.0, 6.2, 8.4, 10.6];       // 책상 행 z (m)
export const ROOM_W = 10;
export const ROOM_D = 13.5;

export interface Student {
  i: number;           // 자리 번호 - 1
  seat: number;        // 자리 번호 (1~20)
  x: number;
  z: number;
  hair: string;
  shirt: string;
  skin: string;
  longHair: boolean;
  glasses: GStyle | null;
  watch: "none" | "analog" | "blackanalog" | "smart" | "hybrid" | "band";   // blackanalog: 꺼진 스마트워치와 헷갈리는 미끼
  alumnus: { from: number; method: string; clean: boolean } | null;      // 재응시생 (예전에 적발한 학생)

  cheat: CheatMethod | null;
  aiGen: number;       // 이 학생 안경의 AI 세대 (0이면 일반 안경)
  partner: number;     // 짝 수법의 상대 자리 (-1 없음)
  group: number;       // 집단 수법 묶음 번호 (-1 없음)
  habits: Pose[];      // 무고한 습관 프로필 (고정)
  timid: boolean;      // 소심한 무고 학생: 눈이 마주치면 움찔하지만 바로 다시 필기

  // 진행 상태
  pose: Pose;
  loopIdx: number;
  stepT: number;
  acting: boolean;     // 부정행위 동작 중
  habitPose: Pose | null;
  habitT: number;
  lastHabit: Pose | null; // 가장 최근에 보인 습관 (오인 사유)
  nextCheatAt: number;
  nextHabitAt: number;
  combos: number;      // 부정행위 동작을 끝까지 보인 횟수
  heatUntil: number;   // AI 안경 발열 끝 시각
  ledOn: boolean;

  observed: boolean;   // 감독관이 관찰(E)했는지
  stareT: number;      // 바로 옆에서 머문 시간
  stareComplained: boolean;

  status: "seated" | "leaving" | "gone";
  outcome: "none" | "caught" | "wrong" | "gate";
  caughtAt: number;
  leaveT: number;

  // 입실 검사
  confiscated: boolean;    // 기기를 스스로 내서 보관함
  photoMismatch: boolean;
}

export function isCheating(s: Student): boolean {
  return !!s.cheat && !s.confiscated && s.status === "seated";
}
