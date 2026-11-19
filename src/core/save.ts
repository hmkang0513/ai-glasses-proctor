// 진행 저장 (브라우저 localStorage). 저장이 막힌 환경에서도 게임은 그대로 동작한다.
const KEY = "ai-glasses-proctor:save:v1";

/** 감독 경력 칭호 */
export function rankTitle(level: number): string {
  return level >= 50 ? "수석감독관" : level >= 25 ? "베테랑 감독관" : level >= 10 ? "경력 감독관" : "신임 감독관";
}

export interface SaveData {
  level: number;               // 다음에 맡을 감독 회차 (1부터)
  notebook: string[];          // 감독관 수첩에 기록된 수법 id
  noteMissed: string[];        // 그중 처음 만났을 때 놓친 수법 (빨간 펜)
  bestGrades: Record<number, string>;
  attempts: Record<number, number>;  // 회차별 실패 횟수 → 다시 하면 다른 배치
  daily: Record<string, string>;     // 오늘의 시험실 날짜별 첫 등급
  alumni: Array<{ hair: string; shirt: string; skin: string; longHair: boolean; method: string; level: number }>;  // 적발한 학생 (재응시 후보)
  mode: "fp" | "cctv";
  seenTutorial: boolean;
  lastComment?: string;   // 수석감독관 한마디 (같은 문장 연속 방지)
  usedEver?: string[];    // 한 번이라도 써 본 도구 (작은 목표는 안 써 본 것부터)
  lastGoal?: string;      // 직전 판 작은 목표
  lastGoals?: string[];   // 최근 작은 목표 2개
  recentLines?: string[]; // 최근 교무실 대사 (3판 안 반복 금지)
  stats?: { caught: number; perfect: number; stars: number; s: number; postcard: boolean };   // 교무실 책상 꾸미기용 누적 기록
  desk?: string[];        // 교무실 책상에 생긴 물건
}

const DEFAULT: SaveData = { level: 1, notebook: [], noteMissed: [], bestGrades: {}, attempts: {}, alumni: [], daily: {}, mode: "fp", seenTutorial: false };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      level: Math.max(1, Number(d.level) || 1),
      notebook: Array.isArray(d.notebook) ? d.notebook.filter((x) => typeof x === "string") : [],
      noteMissed: Array.isArray(d.noteMissed) ? d.noteMissed.filter((x) => typeof x === "string") : [],
      bestGrades: d.bestGrades && typeof d.bestGrades === "object" ? d.bestGrades : {},
      attempts: d.attempts && typeof d.attempts === "object" ? d.attempts : {},
      alumni: Array.isArray(d.alumni) ? d.alumni.slice(-30) : [],
      daily: d.daily && typeof d.daily === "object" ? d.daily : {},
      mode: d.mode === "cctv" ? "cctv" : "fp",
      seenTutorial: !!d.seenTutorial,
      lastComment: typeof d.lastComment === "string" ? d.lastComment : undefined,
      usedEver: Array.isArray(d.usedEver) ? d.usedEver.filter((x) => typeof x === "string") : [],
      lastGoal: typeof d.lastGoal === "string" ? d.lastGoal : undefined,
      lastGoals: Array.isArray(d.lastGoals) ? d.lastGoals.slice(-2) : [],
      recentLines: Array.isArray(d.recentLines) ? d.recentLines.slice(-3) : [],
      stats: d.stats && typeof d.stats === "object" ? { caught: +d.stats.caught || 0, perfect: +d.stats.perfect || 0, stars: +d.stats.stars || 0, s: +d.stats.s || 0, postcard: !!d.stats.postcard } : undefined,
      desk: Array.isArray(d.desk) ? d.desk.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* 시크릿 창 등에서 저장 실패 → 무시 */
  }
}
