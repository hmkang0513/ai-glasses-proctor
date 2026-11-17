// 게임 규칙 상수. 숫자를 바꿔 난이도를 조정한다.

/**
 * 마지막 부정행위자를 잡으면 그 교시를 바로 끝낼지.
 * true  = 사용자가 정한 규칙 (다 찾으면 종료)
 * false = 기획 리뷰 제안 (교시는 항상 끝까지 진행, 남은 인원이 드러나지 않음)
 */
export const END_WHEN_ALL_CAUGHT = true;

export const EXAM_SECONDS = 180;       // 한 교시 실제 플레이 시간
export const BREAK_SECONDS = 20;       // 쉬는 시간 화면
export const COMPLAINT_MAX = 3;        // 민원 게이지 칸 수 (가득 차면 감독 교체)

export const SCORE = {
  caught: 100,
  missed: -80,
  wrong: -150,
  earlyBonusMax: 60,                   // 빨리 잡을수록 최대 60점 (유출 문항 감소)
  gateCaught: 80,                      // 입실 검사에서 적발
  gateHeld: 60,                        // 입실 검사에서 기기 보관 (부정행위를 막음)
} as const;

export const OBSERVE_RANGE = 4.2;      // 관찰(E) 가능한 거리 (m)
export const ACCUSE_RANGE = 2.6;       // 적발(F)하려면 이만큼 다가가야 함
export const FREEZE_RANGE = 2.0;       // 감독관이 이 안으로 오면 부정행위자가 멈춤
export const STARE_COMPLAINT_SEC = 7;  // 한 학생 바로 옆(1.3m)에서 이 시간 넘게 머물면 민원
export const THERMAL_CHARGES = 3;      // 열화상 사용 횟수(교시당)
export const HEAT_SECONDS = 10;        // AI 안경 작동 후 테가 뜨거운 시간

/** 실제 수능 시각(분 단위, 자정 기준)과 게임 시간 연결 */
export const PERIODS = [
  { name: "1교시 국어", start: 8 * 60 + 40, end: 10 * 60 },        // 80분
  { name: "2교시 수학", start: 10 * 60 + 30, end: 12 * 60 + 10 },  // 100분
] as const;

export const BREAK_LABEL = "쉬는 시간 10:00~10:30";

export function clockText(period: number, elapsed: number): string {
  const p = PERIODS[period];
  const ratio = Math.max(0, elapsed / EXAM_SECONDS);   // 정전 연장 시 종료 시각을 넘겨 흐름
  const m = Math.floor(p.start + (p.end - p.start) * ratio);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
