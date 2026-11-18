// 부정행위 수법 30종.
// source: 실제 사건 근거(URL), "일반 수법"(널리 알려졌지만 특정 사건 출처 미확인), "게임 설정"(지어낸 것)
import type { Pose } from "../world/poses";

export type Family = "ai" | "watch" | "earpiece" | "phone" | "note" | "camera" | "signal" | "people";

export interface Step {
  pose: Pose;
  dur: number; // 초
}

/** 관찰 패널(E)에 드러나는 단서 */
export interface Tells {
  aiGen?: 1 | 2 | 3 | 4;        // AI 안경 세대
  earpiece?: "visible" | "tiny"; // 귀에 꽂은 이어폰
  neckDevice?: boolean;          // 목 뒤 송수신기
  watch?: "smart" | "hybrid" | "band";
  palmNote?: boolean;
  eraserNote?: boolean;
  bottleNote?: boolean;
  armNote?: boolean;
  rulerNote?: boolean;
  camPen?: boolean;
  coin?: boolean;
  collarCam?: boolean;
  deskNote?: boolean;
}

/** 입실 검사에서 드러나는 단서 */
export interface GateTells {
  tray?: Array<"smartwatch" | "hybridwatch" | "earbuds" | "phone" | "campen" | "coin" | "ruler" | "bottle" | "eraser">;
  hidden?: "body" | "shoes" | "ear" | "neck";  // CHECK(추가 확인)로만 찾는 숨긴 기기
  metal?: number;                              // 금속 탐지 추가량 (0~4)
  photoMismatch?: boolean;                     // 수험표 사진 불일치 (대리시험)
}

export interface CheatMethod {
  id: string;
  no: number;           // 감독관 수첩 쪽 번호
  name: string;
  family: Family;
  minLevel: number;     // 처음 등장할 수 있는 감독 회차
  kind: "exam" | "pair" | "group" | "gate" | "event";
  needsGlasses?: boolean;
  loop: Step[];         // 부정행위 동작 반복
  interval: [number, number]; // 동작 사이 쉬는 시간(초)
  tells: Tells;
  gate: GateTells;
  hint: string;         // 결과 화면·수첩에 쓰는 설명
  source: string;       // 근거 설명
  url?: string;
}

export const CHEATS: CheatMethod[] = [
  {
    id: "ai1", no: 1, name: "AI 안경 (1세대)", family: "ai", minLevel: 1, kind: "exam", needsGlasses: true,
    loop: [{ pose: "lookaround", dur: 0.6 }, { pose: "temple", dur: 1.5 }, { pose: "paperup", dur: 1.6 }, { pose: "nosepush", dur: 0.5 }],
    interval: [5, 9], tells: { aiGen: 1 }, gate: { metal: 1 },
    hint: "두꺼운 안경다리와 경첩 카메라, 촬영 중 빨간 LED. 안경다리를 눌러 문제를 찍고 시험지를 들어 오래 봤습니다.",
    source: "토익 2026 AI 글라스 적발", url: "https://www.hankyung.com/article/202606107661Y",
  },
  {
    id: "palm", no: 2, name: "손바닥 커닝페이퍼", family: "note", minLevel: 1, kind: "exam",
    loop: [{ pose: "palm", dur: 1.4 }], interval: [6, 11], tells: { palmNote: true }, gate: {},
    hint: "주먹 쥔 손을 펴서 손바닥에 쓴 메모를 내려다봤습니다.", source: "일반 수법",
  },
  {
    id: "eraser", no: 3, name: "지우개 포장지 속 쪽지", family: "note", minLevel: 3, kind: "exam",
    loop: [{ pose: "eraser", dur: 1.6 }], interval: [6, 10], tells: { eraserNote: true }, gate: { tray: ["eraser"] },
    hint: "지우개 포장지 안쪽에 공식을 적어 두고 지우개를 자꾸 꺼내 만지작거렸습니다.", source: "일반 수법",
  },
  {
    id: "peek", no: 4, name: "옆자리 훔쳐보기", family: "signal", minLevel: 1, kind: "exam",
    loop: [{ pose: "side", dur: 2.0 }], interval: [5, 9], tells: {}, gate: {},
    hint: "고개를 옆으로 돌려 옆자리 답안을 반복해서 봤습니다. 가장 오래되고 흔한 수법입니다.", source: "일반 수법",
  },
  {
    id: "ai2", no: 5, name: "AI 안경 (2세대)", family: "ai", minLevel: 10, kind: "exam", needsGlasses: true,
    loop: [{ pose: "temple", dur: 1.2 }, { pose: "paperup", dur: 2.0 }, { pose: "nosepush", dur: 0.4 }],
    interval: [6, 10], tells: { aiGen: 2 }, gate: { metal: 1 },
    hint: "얇은 테에 LED를 테이프로 가렸습니다. 안경다리를 만진 뒤 시험지를 이상한 거리에서 오래 봤고, 작동 직후 테가 뜨거웠습니다.",
    source: "대만 입시 2026, 테 발열로 적발", url: "https://krdo.com/news/2026/06/26/ai-glasses-are-aiding-cheating-in-exams-test-obsessed-asia-is-ground-zero/",
  },
  {
    id: "phone", no: 6, name: "책상 밑 휴대폰", family: "phone", minLevel: 5, kind: "exam",
    loop: [{ pose: "underdesk", dur: 2.4 }], interval: [7, 12], tells: {}, gate: { tray: ["phone"], metal: 2 },
    hint: "손과 시선이 같이 책상 밑으로 내려갔습니다. 휴대폰을 무릎 위에 두고 봤습니다.",
    source: "2004 수능 휴대폰 부정행위", url: "https://hangyo.com/mobile/article.html?no=9804",
  },
  {
    id: "watch", no: 7, name: "스마트워치로 답 받기", family: "watch", minLevel: 7, kind: "exam",
    loop: [{ pose: "wrist", dur: 0.8 }, { pose: "write", dur: 1.0 }, { pose: "wrist", dur: 0.8 }],
    interval: [5, 9], tells: { watch: "smart" }, gate: { tray: ["smartwatch"], metal: 1 },
    hint: "밖에서 보낸 답을 스마트워치로 받아 손목을 흘끗흘끗 봤습니다.",
    source: "태국 의대 입시 2016", url: "https://www.aljazeera.com/news/2016/5/12/thailand-students-caught-in-high-tech-cheating-scam",
  },
  {
    id: "bottle", no: 8, name: "물병 라벨 뒷면 메모", family: "note", minLevel: 9, kind: "exam",
    loop: [{ pose: "bottle", dur: 2.2 }], interval: [7, 12], tells: { bottleNote: true }, gate: { tray: ["bottle"] },
    hint: "물병을 마시지 않고 오래 들고 라벨 안쪽 메모를 봤습니다.", source: "일반 수법",
  },
  {
    id: "arm", no: 9, name: "팔·허벅지에 쓴 메모", family: "note", minLevel: 12, kind: "exam",
    loop: [{ pose: "sleeve", dur: 1.8 }], interval: [7, 12], tells: { armNote: true }, gate: {},
    hint: "소매를 걷어 팔에 쓴 메모를 보거나 시선을 무릎으로 떨궜습니다.", source: "일반 수법",
  },
  {
    id: "ruler", no: 10, name: "자 뒷면 메모", family: "note", minLevel: 14, kind: "exam",
    loop: [{ pose: "ruler", dur: 1.6 }], interval: [7, 11], tells: { rulerNote: true }, gate: { tray: ["ruler"] },
    hint: "쓸 일이 없는데 자를 들어 뒷면을 봤습니다.", source: "일반 수법",
  },
  {
    id: "ai3", no: 11, name: "AI 안경 (일반 안경형)", family: "ai", minLevel: 25, kind: "exam", needsGlasses: true,
    loop: [{ pose: "stare", dur: 3.0 }, { pose: "mouth", dur: 0.8 }, { pose: "burst", dur: 1.8 }],
    interval: [5, 9], tells: { aiGen: 3 }, gate: {},
    hint: "일반 안경과 똑같이 생겼습니다. 한참 멈춰 문제를 노려보고, 입술로 질문한 뒤, 답을 몰아서 썼습니다.",
    source: "일반 안경과 육안 구분 어려움(세계일보) + 행동 패턴은 게임 설정", url: "https://www.segye.com/newsView/20260802511782",
  },
  {
    id: "earpiece", no: 12, name: "귓속 초소형 이어폰", family: "earpiece", minLevel: 16, kind: "exam",
    loop: [{ pose: "ear", dur: 0.6 }, { pose: "nod", dur: 1.6 }, { pose: "burst", dur: 1.2 }],
    interval: [6, 10], tells: { earpiece: "tiny" }, gate: { hidden: "ear", metal: 1 },
    hint: "피부색 초소형 이어폰으로 밖의 조력자가 불러 주는 답을 들었습니다. 귀를 만지고 혼자 고개를 끄덕였습니다.",
    source: "TOPIK 2026 대리시험·이어폰 조직", url: "https://www.khan.co.kr/article/202607211645001/",
  },
  {
    id: "neck", no: 13, name: "목 뒤 송수신기", family: "earpiece", minLevel: 22, kind: "exam",
    loop: [{ pose: "neck", dur: 1.0 }, { pose: "nod", dur: 1.4 }],
    interval: [6, 10], tells: { neckDevice: true, earpiece: "tiny" }, gate: { hidden: "neck", metal: 2 },
    hint: "머리카락으로 가린 목 뒤에 송수신기를 붙였습니다. 목을 자주 만졌습니다.",
    source: "TOPIK 2026, 감독관이 목 뒤 송수신기 발견", url: "https://www.khan.co.kr/article/202607211645001/",
  },
  {
    id: "collar", no: 14, name: "옷깃 카메라", family: "camera", minLevel: 25, kind: "exam",
    loop: [{ pose: "paperchest", dur: 2.0 }], interval: [7, 11], tells: { collarCam: true }, gate: { hidden: "body", metal: 1 },
    hint: "옷깃에 단 소형 카메라로 찍으려고 시험지를 몸 쪽으로 세워 들었습니다.",
    source: "토익·텝스 2013 조직적 부정행위", url: "https://www.kukinews.com/article/view/kuk201304170016",
  },
  {
    id: "campen", no: 15, name: "카메라 펜", family: "camera", minLevel: 28, kind: "exam",
    loop: [{ pose: "penup", dur: 2.0 }], interval: [7, 11], tells: { camPen: true }, gate: { tray: ["campen"], metal: 1 },
    hint: "쓰지 않고 펜을 시험지 위에 세워 들었습니다. 펜 속 카메라로 문제를 찍었습니다.",
    source: "가오카오 압수품", url: "https://www.csmonitor.com/World/Global-News/2015/0608/Why-is-China-using-drones-to-catch-college-exam-cheaters",
  },
  {
    id: "cough", no: 16, name: "기침·손가락 수신호", family: "signal", minLevel: 18, kind: "pair",
    loop: [{ pose: "cough", dur: 0.6 }, { pose: "write", dur: 0.6 }, { pose: "finger", dur: 1.0 }],
    interval: [6, 10], tells: {}, gate: {},
    hint: "두 학생이 기침 횟수와 손가락 개수로 답 번호를 주고받았습니다.", source: "일반 수법",
  },
  {
    id: "swap", no: 17, name: "시험지 바꿔치기", family: "signal", minLevel: 20, kind: "pair",
    loop: [{ pose: "pass", dur: 1.2 }], interval: [10, 16], tells: {}, gate: {},
    hint: "앞뒤 학생이 손을 뒤로·앞으로 뻗어 답안을 주고받았습니다.", source: "일반 수법",
  },
  {
    id: "ruckus", no: 18, name: "미끼 소란", family: "signal", minLevel: 30, kind: "pair",
    loop: [{ pose: "handup", dur: 2.4 }, { pose: "side", dur: 1.6 }], interval: [10, 15], tells: {}, gate: {},
    hint: "한 학생이 손을 들어 감독관을 부르는 사이 짝이 옆자리를 훔쳐봤습니다.", source: "게임 설정",
  },
  {
    id: "slippers", no: 19, name: "블루투스 슬리퍼", family: "earpiece", minLevel: 36, kind: "exam",
    loop: [{ pose: "ear", dur: 0.5 }, { pose: "nod", dur: 1.4 }], interval: [6, 10], tells: { earpiece: "tiny" }, gate: { hidden: "shoes", metal: 2 },
    hint: "신발 밑창에 통화 기기를 숨기고 귓속 이어폰으로 답을 들었습니다.",
    source: "인도 교원시험 2021", url: "https://www.deccanherald.com/india/bluetooth-slippers-how-candidates-tried-to-cheat-in-reet-exam-1034645.html",
  },
  {
    id: "vest", no: 20, name: "마이크·이어폰을 꿰맨 속옷", family: "earpiece", minLevel: 38, kind: "exam",
    loop: [{ pose: "clothes", dur: 1.0 }, { pose: "mouth", dur: 0.8 }, { pose: "nod", dur: 1.0 }],
    interval: [6, 10], tells: { earpiece: "tiny" }, gate: { hidden: "body", metal: 3 },
    hint: "속옷에 꿰맨 마이크로 문제를 읽어 주고 답을 들었습니다. 옷을 자꾸 매만졌습니다.",
    source: "가오카오 압수품", url: "https://www.csmonitor.com/World/Global-News/2015/0608/Why-is-China-using-drones-to-catch-college-exam-cheaters",
  },
  {
    id: "coin", no: 21, name: "동전 리모컨 + 안경 스캐너", family: "camera", minLevel: 40, kind: "exam", needsGlasses: true,
    loop: [{ pose: "coin", dur: 1.4 }, { pose: "stare", dur: 1.6 }], interval: [6, 10], tells: { coin: true, aiGen: 3 }, gate: { tray: ["coin"], metal: 1 },
    hint: "동전 모양 리모컨으로 안경 속 스캐너를 켰습니다. 동전을 만지작거린 뒤 시험지를 노려봤습니다.",
    source: "가오카오 압수품", url: "https://www.csmonitor.com/World/Global-News/2015/0608/Why-is-China-using-drones-to-catch-college-exam-cheaters",
  },
  {
    id: "grouptext", no: 22, name: "휴대폰 문자 집단 답 공유", family: "phone", minLevel: 33, kind: "group",
    loop: [{ pose: "underdesk", dur: 2.0 }], interval: [9, 13], tells: {}, gate: { tray: ["phone"], metal: 2 },
    hint: "여러 학생이 같은 타이밍에 휴대폰을 봤습니다. 한 명이 답을 보내면 나머지가 받았습니다.",
    source: "2004 수능 휴대폰 부정행위(선수·도우미 방식)", url: "https://hangyo.com/mobile/article.html?no=9804",
  },
  {
    id: "post", no: 23, name: "시험 중 인터넷에 문제 올리기", family: "phone", minLevel: 42, kind: "exam",
    loop: [{ pose: "underdesk", dur: 2.6 }, { pose: "stare", dur: 2.0 }], interval: [8, 12], tells: {}, gate: { tray: ["phone"], metal: 2 },
    hint: "책상 밑 휴대폰으로 문제를 질문 게시판에 올리고 답이 달리기를 기다렸습니다.",
    source: "교토대 입시 2011", url: "https://phys.org/news/2011-03-japan-police-yahoo-exam-probe.amp",
  },
  {
    id: "earlyexit", no: 24, name: "촬영 후 시험 포기 퇴실", family: "people", minLevel: 44, kind: "event",
    loop: [{ pose: "temple", dur: 1.2 }, { pose: "paperup", dur: 2.0 }], interval: [6, 10], tells: { aiGen: 2 }, gate: {},
    hint: "카메라 안경으로 문제를 찍은 뒤 시험 포기를 핑계로 나가 촬영한 문제를 밖으로 넘겼습니다. 태국 사례에서는 퇴실 가능 시간이 되자마자 함께 나갔습니다.",
    source: "태국 의대 입시 2016", url: "https://www.aljazeera.com/news/2016/5/12/thailand-students-caught-in-high-tech-cheating-scam",
  },
  {
    id: "proxy", no: 25, name: "대리시험 (위조 신분증)", family: "people", minLevel: 46, kind: "gate",
    loop: [{ pose: "burst", dur: 1.4 }], interval: [8, 12], tells: {}, gate: { photoMismatch: true },
    hint: "다른 사람이 위조 신분증으로 대신 시험을 봤습니다. 수험표 사진과 얼굴이 달랐습니다.",
    source: "TOPIK 2026 대리시험 조직", url: "https://www.khan.co.kr/article/202607211645001/",
  },
  {
    id: "desknote", no: 26, name: "책상에 미리 써 둔 낙서", family: "note", minLevel: 48, kind: "exam",
    loop: [{ pose: "deskdown", dur: 1.6 }], interval: [7, 11], tells: { deskNote: true }, gate: {},
    hint: "책상 모서리에 작은 글씨로 공식을 미리 써 두고 내려다봤습니다.", source: "일반 수법",
  },
  {
    id: "smuggle", no: 27, name: "쉬는 시간·화장실 반입", family: "phone", minLevel: 20, kind: "event",
    loop: [{ pose: "underdesk", dur: 2.0 }], interval: [7, 11], tells: {}, gate: {},
    hint: "쉬는 시간에 화장실에 숨겨 둔 휴대폰을 가지고 들어왔습니다. 2교시부터 행동이 달라졌습니다.", source: "게임 설정",
  },
  {
    id: "window", no: 28, name: "창밖에서 쪽지 전달", family: "people", minLevel: 15, kind: "event",
    loop: [{ pose: "window", dur: 2.0 }], interval: [8, 12], tells: {}, gate: {},
    hint: "창밖의 조력자가 쪽지를 던져 넣었습니다. 창가 학생이 창문만 봤습니다.",
    source: "인도 비하르 2015", url: "https://www.cbsnews.com/news/indian-parents-scale-school-wall-to-help-students-cheat-on-exams",
  },
  {
    id: "bribed", no: 29, name: "매수된 동료 감독관", family: "people", minLevel: 50, kind: "event",
    loop: [], interval: [0, 0], tells: {}, gate: {},
    hint: "다른 감독관이 돈을 받고 답안을 고쳐 줬습니다.",
    source: "미국 SAT·ACT 2019", url: "https://www.justice.gov/usao-ma/pr/test-taker-college-admissions-case-sentenced",
  },
  {
    id: "leak", no: 30, name: "촬영한 시험지 유출", family: "people", minLevel: 50, kind: "event",
    loop: [], interval: [0, 0], tells: {}, gate: {},
    hint: "AI 안경으로 찍은 시험지가 밖으로 유출돼 홍보물로 쓰였습니다.",
    source: "호주 대학 2026", url: "https://www.timeshighereducation.com/news/checkmate-looms-traditional-tests-amid-ai-glasses-epidemic",
  },
  {
    id: "overtime", no: 31, name: "종료령 뒤 답안 작성", family: "signal", minLevel: 5, kind: "event",
    loop: [{ pose: "burst", dur: 1 }], interval: [0, 0], tells: {}, gate: {},
    hint: "종료령이 울린 뒤에도 펜을 내려놓지 않고 답안을 계속 썼습니다. 수능에서는 종료령 뒤 답안 작성·수정도 부정행위입니다.",
    source: "수능 유의사항: 종료령 뒤 답안 작성은 부정행위(뉴시스)", url: "https://www.newsis.com/view/NISX20241113_0002957998",
  },
];

export const CHEAT_BY_ID: Record<string, CheatMethod> = Object.fromEntries(CHEATS.map((c) => [c.id, c]));

/** 시험 중 학생에게 직접 배정할 수 있는 수법 */
export const ASSIGNABLE = CHEATS.filter((c) => c.kind === "exam" || c.kind === "pair" || c.kind === "group" || c.kind === "gate");
