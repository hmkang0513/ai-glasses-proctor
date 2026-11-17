// 학생이 취할 수 있는 동작(포즈) 목록
export type Pose =
  | "write"       // 필기 (기본)
  | "think"       // 턱 괴고 고민
  | "stare"       // 멈춰서 노려봄
  | "burst"       // 답을 몰아서 씀
  | "mouth"       // 입술 움직임
  | "temple"      // 안경다리 만지기
  | "paperup"     // 시험지를 들고 응시
  | "paperchest"  // 시험지를 몸 쪽으로 세움
  | "nosepush"    // 코받침 밀어올리기
  | "glassesoff"  // 안경 벗어 렌즈 닦기
  | "lookaround"  // 두리번
  | "side"        // 옆자리 쪽으로 고개
  | "wrist"       // 손목 보기
  | "underdesk"   // 손이 책상 밑으로
  | "ear"         // 귀 만지기
  | "nod"         // 혼자 고개 끄덕임
  | "neck"        // 목 뒤 만지기
  | "stretch"     // 기지개
  | "palm"        // 손바닥 보기
  | "eraser"      // 지우개 만지작
  | "bottle"      // 물병 들고 봄
  | "drink"       // 물 마시기 (무고)
  | "sleeve"      // 소매 걷고 팔 보기
  | "ruler"       // 자 들어 보기
  | "penup"       // 펜을 세워 듦
  | "coin"        // 동전 만지작
  | "cough"       // 기침
  | "finger"      // 손가락 신호
  | "pass"        // 손을 뒤로 뻗음
  | "handup"      // 손 들기
  | "clothes"     // 옷 매만짐
  | "deskdown"    // 책상 모서리 내려다봄
  | "window";     // 창문 쪽 보기

/** 무고한 학생도 하는 습관 동작 (부정행위 동작과 헷갈리게 만드는 미끼) */
export const HABITS: Pose[] = ["nosepush", "glassesoff", "lookaround", "ear", "stretch", "think", "wrist", "drink", "cough", "stare", "neck", "clothes"];

/** 고개를 숙이는 동작 */
export const HEAD_DOWN = new Set<Pose>(["wrist", "underdesk", "palm", "sleeve", "deskdown", "eraser"]);
