// 시험 장면: 1인칭 감독 + CCTV 전환
import { COLORS, H, KR, PIX, W, label, makeCanvas, px, wrapText, type Ctx } from "../core/px";
import type { Input } from "../core/input";
import {
  LISTENING_SECONDS,
  ACCUSE_RANGE, COMPLAINT_MAX, END_WHEN_ALL_CAUGHT, EXAM_SECONDS, FREEZE_RANGE, OBSERVE_RANGE,
  PERIODS, STARE_COMPLAINT_SEC, THERMAL_CHARGES, clockText,
} from "../data/rules";
import { applyLight, cctvPass, type PointLight, type PresetName } from "../render/light";
import { F, SPEAKER, drawClipboard, drawRoom, proj, quad, toCam, type Camera } from "../render/fp";
import { drawTopRoom, drawTopTeacher, tdX, tdY } from "../render/topdown";
import { updateStudent } from "../world/behavior";
import { SPR_H, SPR_W, drawEmptySeat, drawProctor, drawStanding, drawStudent, drawStudentBack } from "../world/drawStudent";
import { COLX, ROOM_D, ROOM_W, ROWZ, isCheating, type Student } from "../world/student";
import { drawCloseup } from "../ui/closeup";
import { CHEAT_BY_ID } from "../data/cheats";
import type { TouchButton } from "../core/input";
import { play, toggleMute, type SoundKind } from "../core/audio";
import { cctvGlitch, type Layer } from "../render/effects";
import type { Session } from "./session";

const SPX = 0.036;               // 스프라이트 1픽셀 = 0.036m
const DOOR = { x: 9.4, z: 11.7 }; // 뒷문
const WALK = 1.7;                // m/s
const TURN = 0.0024;             // 마우스 감도

interface Toast { text: string; until: number; color?: string }

export class ExamScene {
  readonly name = "exam";
  t = 0;
  periodLen = EXAM_SECONDS;
  cam: Camera = { x: 5, z: 1.4, y: 1.55, yaw: 0 };
  mode: "fp" | "cctv";
  panel = -1;               // 관찰 중인 학생 자리 인덱스
  target = -1;              // 조준점에 걸린 학생
  thermalCharges = THERMAL_CHARGES;
  thermalUntil = -1;
  toasts: Toast[] = [];
  marks = new Set<number>(); // CCTV에서 표시한 학생
  memoOpen = false;
  memoPages: string[] = [];
  memoPage = 0;
  glitch: Layer | null = null;   // CCTV 전환 효과
  rt = 0;                        // 실제 경과 시간 (토스트용)
  readonly aide = { x: 9.0, z: 12.7 };   // 부감독: 뒷문 옆에 서서 앞쪽을 봄
  aideHintAt = -1;
  watchChecked = new Set<number>();      // 시계 확인에서 이미 민원을 받은 학생
  prevPose: string[] = [];                // 소리 단서용 이전 동작
  nextAmbient = 4;                        // 다음 교실 잡음(의자·시험지) 시각
  lastTick = -1;
  finalAnnounced = false;
  pathT = 0;
  prevActing: boolean[] = [];
  lastAct: number[] = [];                 // 학생별 마지막 부정행위 동작 시각
  glanceRoll: boolean[] = [];              // 이번 흘끗에서 움찔할지
  lastGlance: number[] = [];               // 학생별 마지막 흘끗 시각
  collectT = 0;                            // 종료령 뒤 답안지 회수 남은 시간
  collectDone = false;
  radioCharges = 2;
  radioUntil = -1;
  radioExplained = false;
  touchUi: TouchButton[] = [];   // 휴대폰 화면 버튼
  captions: Array<{ text: string; a: number; until: number }> = [];   // 소리 자막
  captionsOn = true;
  stick: Input["stick"] = null;
  pre = 0;                       // 1교시 전 시계 확인 남은 시간             // 0 = 명부, 1~ = 감독관 수첩 메모
  ended = false;
  endReason: "time" | "allCaught" | "replaced" = "time";
  endAt = -1;               // 잠시 뒤 끝낼 시각 (게임 시간)
  pendingReason: "allCaught" | "replaced" = "allCaught";
  caughtThisPeriod = 0;
  moving = false;
  weather: PresetName;

  // 정전 이벤트
  outageAt = -1;
  outageEnd = -1;
  outageDone = false;

  private base: [HTMLCanvasElement, Ctx];
  private spr: [HTMLCanvasElement, Ctx];
  private dst: ImageData;

  constructor(public s: Session, private onEnd: () => void) {
    this.mode = s.save.mode;
    this.base = makeCanvas(W, H);
    this.spr = makeCanvas(SPR_W, SPR_H);
    this.dst = new ImageData(W, H);
    const r = s.r;
    this.weather = (["day", "overcast", "dim"] as PresetName[])[Math.floor(r() * 3)];
    if (r() < s.room.outageChance) this.outageAt = 40 + r() * 80;
    // 첫 교시 시작 전 수석감독관 메모
    if (s.period === 0 && (s.room.tutorial.length || s.room.notes.length)) {
      this.memoOpen = true;
      this.memoPages = s.room.tutorial.length ? [...s.room.tutorial, ...s.room.notes] : ["감독 명부 메모", ...s.room.notes];
    }
    // 학생 시간 초기화 (2교시는 새로 시작)
    for (const st of s.room.students) {
      if (st.status === "leaving") st.status = "gone";
      st.acting = false; st.habitPose = null; st.pose = "write";
      st.nextCheatAt = 4 + r() * 10; st.nextHabitAt = 3 + r() * 12;
      st.stareT = 0; st.ledOn = false;
      if (st.partner >= 0 && st.partner > st.i) s.room.students[st.partner].nextCheatAt = st.nextCheatAt + 0.7;
    }
    for (const st of s.room.students) if (st.group >= 0) {
      const lead = s.room.students.find((o) => o.group === st.group)!;
      st.nextCheatAt = lead.nextCheatAt + (st === lead ? 0 : 0.3);
    }
    this.setupEvents();
    // 1교시 전 시계 확인 (실제 수능: 1·3교시 전에 시계를 책상 위에 두고 감독관이 확인)
    if (s.period === 0 && s.room.level >= 4) this.pre = 12;
    if (this.pre > 0) this.mode = "fp";   // 시계 확인은 교실을 돌며 직접
    // 부감독 헛기침 힌트: 교시당 1번, 정확도 약 70%, 50회차부터 없음
    if ((s.room.level >= 3 && s.room.level < 50) || s.room.bribedAide) this.aideHintAt = 45 + r() * 80;
  }

  // ===== 이벤트: 창밖 쪽지(15회차~), 일찍 퇴실(44회차~) =====
  windowSeat = -1;
  windowFrom = -1;
  earlyExit: number[] = [];
  earlyAt = -1;

  private setupEvents(): void {
    const { r, room } = this.s;
    const free = room.students.filter((x) => x.status === "seated" && !x.cheat);
    // 창가(왼쪽 첫 줄) 학생에게 창밖 조력자가 쪽지를 전달
    if (room.level >= 15 && r() < 0.18) {
      const cands = free.filter((x) => x.i % 5 === 0);
      if (cands.length) {
        const st = cands[Math.floor(r() * cands.length)];
        st.cheat = CHEAT_BY_ID.window;
        st.nextCheatAt = 1e9;               // 창밖 사람이 나타나야 시작
        this.windowSeat = st.i;
        this.windowFrom = 30 + r() * 70;
      }
    }
    // 카메라 안경으로 찍고 퇴실 가능 시간에 함께 나가는 학생들
    const early = room.students.filter((x) => x.cheat?.id === "earlyexit" && x.status === "seated" && !x.confiscated);
    if (this.s.period === 0 && early.length) {
      this.earlyExit = early.map((x) => x.i);
      this.earlyAt = 70 + r() * 60;          // 정해진 퇴실 시각은 없음 (수능에서 확인 안 됨)
    }
  }

  /** 휴대폰 화면 버튼 (오른쪽 아래 두 줄) */
  private buildTouchUi(): TouchButton[] {
    const list: Array<[string, string]> = [["KeyE", "관찰"], ["KeyF", "적발"], ["KeyT", "열화상"]];
    if (this.s.room.level >= 16) list.push(["KeyR", "전파"]);
    list.push(["Tab", this.mode === "cctv" ? "교실" : "CCTV"], ["KeyQ", "명부"]);
    return list.map(([code, label], k) => ({ code, label, x: 404 + (k % 2) * 38, y: 146 + Math.floor(k / 2) * 30, w: 34, h: 26 }));
  }

  /** 소리 자막: 들린 방향 쪽 화면 가장자리에 화살표와 이름 */
  private renderCaptions(g: Ctx): void {
    this.captions = this.captions.filter((c) => c.until > this.rt);
    this.captions.slice(-3).forEach((c, n) => {
      const behind = Math.abs(c.a) > Math.PI / 2;
      const arrow = behind ? "▼" : c.a < -0.25 ? "◀" : c.a > 0.25 ? "▶" : "▲";
      const text = `${arrow} ${c.text}${behind ? " (뒤)" : ""}`;
      g.font = KR(11);
      const tw = Math.ceil(g.measureText(text).width) + 8;
      const x = behind ? W / 2 - tw / 2 : Math.max(6, Math.min(W - tw - 6, W / 2 + Math.sin(c.a) * 190 - tw / 2));
      label(g, text, Math.round(x), (behind ? 220 : 64) - n * 15, { font: KR(11), color: "#cfe3ff" });
    });
  }

  private renderTouchUi(g: Ctx): void {
    for (const b of this.touchUi) {
      px(g, b.x, b.y, b.w, b.h, "rgba(16,22,20,0.75)");
      g.strokeStyle = COLORS.accent; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      g.font = KR(11); g.fillStyle = COLORS.chalk; g.textBaseline = "top";
      g.fillText(b.label, b.x + b.w / 2 - g.measureText(b.label).width / 2, b.y + 7);
    }
    if (this.touchUi.length && this.mode === "fp") {
      // 조이스틱 자리 안내 / 누르고 있는 동안 위치
      const st = this.stick;
      g.strokeStyle = "rgba(233,230,218,0.35)"; g.lineWidth = 1;
      if (st) {
        g.beginPath(); g.arc(st.ox, st.oy, 18, 0, Math.PI * 2); g.stroke();
        const dx = Math.max(-18, Math.min(18, st.x - st.ox)), dy = Math.max(-18, Math.min(18, st.y - st.oy));
        px(g, st.ox + dx - 4, st.oy + dy - 4, 8, 8, "rgba(240,181,74,0.8)");
      } else if (this.t < 10) {
        label(g, "왼쪽을 끌면 걷기 · 오른쪽을 끌면 고개 돌리기", 130, 30, { font: KR(11) });
      }
    }
  }

  /** 종료 10분 전 (게임 시간 마지막 25초) */
  lastMinutes(): boolean {
    return this.periodLen - this.t <= 25;
  }

  /** 학생 위치에서 나는 소리: 좌우 패닝 + 거리 감쇠 */
  private soundAt(kind: SoundKind, st: Student, base = 1): void {
    const dx = st.x - this.cam.x, dz = st.z - this.cam.z;
    let a = Math.atan2(dx, dz) - this.cam.yaw;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const range = kind === "buzz" || kind === "hum" ? 4 : kind === "whisper" ? (this.listening() ? 5 : 3.2) : 11;   // 진동은 4m 안, 듣기평가 중엔 이어폰 소리가 더 멀리
    const vol = base * Math.max(0, 1 - Math.hypot(dx, dz) / range);
    play(kind, Math.sin(a), vol, Math.abs(a) > Math.PI / 2);
    // 자막: 진동음(진동·다리 떨기 같은 이름), 딸깍, 기침, 작은 말소리만
    const names: Partial<Record<SoundKind, string>> = { buzz: "진동음", hum: "진동음", click: "딸깍", cough: "기침", whisper: "작은 말소리" };
    if (this.captionsOn && names[kind] && vol > 0.08) this.captions.push({ text: names[kind]!, a, until: this.rt + 1.6 });
  }

  /** 동작이 바뀔 때 나는 소리 단서 */
  private soundFor(st: Student): void {
    const prev = this.prevPose[st.i];
    // 부정행위 동작이 시작된 순간 기록 (결과 화면 "그때 무슨 일이")
    if (st.acting && !this.prevActing[st.i] && isCheating(st))
      this.s.acts.push({ seat: st.seat, period: this.s.period, t: this.t, near: this.mode === "fp" && this.dist(st) < OBSERVE_RANGE && this.watched(st) });
    // 눈 마주침: 2~3m에서 조준 중일 때만 (2m 안은 원래 멈추고, 3m 밖은 단서가 보이는 거리)
    const aimed = (this.target === st.i || this.panel === st.i) && this.mode === "fp" && this.dist(st) < 3 && this.s.room.level > 1;
    const glancing = st.pose === "glance";
    if (glancing && prev !== "glance") { this.glanceRoll[st.i] = this.s.r() < 0.6; this.lastGlance[st.i] = this.t; }   // 흘끗 한 번에 한 번만 판정
    const late = this.s.room.level >= 50;                                             // 50회차부터 굳는 시간이 겹침
    if (aimed && glancing && this.glanceRoll[st.i] && isCheating(st)) {
      // 부정행위자: 급히 고개를 숙이고 손이 굳음
      st.acting = false; st.loopIdx = 0;
      st.habitPose = "flinch"; st.pose = "flinch"; st.habitT = late ? 1.5 + this.s.r() * 2.5 : 4;
      st.nextCheatAt = Math.max(st.nextCheatAt, this.t + 5);
      st.skipGlanceUntil = this.t + 12;   // 다음 행동은 흘끗 없이 바로 (움찔만 반복되지 않게)
    } else if (aimed && glancing && this.glanceRoll[st.i] && st.timid && st.habitPose === "glance") {
      // 소심한 무고 학생: 움찔했다가 바로 다시 필기
      st.habitPose = "flinch"; st.pose = "flinch"; st.habitT = late ? 0.6 + this.s.r() * 2.4 : 0.6;
    }
    this.prevActing[st.i] = st.acting;
    if (st.acting) this.lastAct[st.i] = this.t;
    this.prevPose[st.i] = st.pose;
    if (prev === st.pose || st.status !== "seated") return;
    const ch = isCheating(st) ? st.cheat! : null;
    if (st.pose === "wrist" && ch?.id === "watch" && st.acting) this.soundAt("buzz", st, 0.9);     // 답이 도착한 진동
    if (st.pose === "cough") this.soundAt("cough", st, 0.8);                                          // 신호든 감기든 기침
    if (st.pose === "penup" && ch?.tells.camPen) this.soundAt("click", st, 0.7);                     // 카메라 펜 딸깍
    if ((st.pose === "nod" || st.pose === "ear") && ch?.tells.earpiece && this.dist(st) < 3.2) this.soundAt("whisper", st, 1);   // 가까이서만
    if (st.pose === "stretch") this.soundAt("chair", st, 0.6);
  }

  private updateAmbient(): void {
    if (this.t >= this.pathT) { this.s.path.push([this.s.period, this.cam.x, this.cam.z]); this.pathT = this.t + 0.5; }
    if (this.t >= this.nextAmbient) {
      const seated = this.students.filter((x) => x.status === "seated");
      if (seated.length) {
        // 무고한 학생도 비슷한 소리를 낸다: 볼펜 노크(카메라 펜과 헷갈림), 다리 떨기(진동과 헷갈림)
        const who = seated[Math.floor(this.s.r() * seated.length)];
        const roll = this.s.r();
        const kind: SoundKind = roll < 0.35 ? "page" : roll < 0.6 ? "chair" : roll < 0.8 ? "click" : "hum";
        this.soundAt(kind, who, this.lastMinutes() ? 0.9 : 0.5);
      }
      this.nextAmbient = this.t + (this.lastMinutes() ? 1.5 : 4) + this.s.r() * 5;
    }
    if (this.lastMinutes()) {
      if (!this.finalAnnounced) {
        this.finalAnnounced = true;
        this.toast("종료 10분 전입니다. 답안지의 성명·수험번호를 확인하세요.", 4, COLORS.accent);
      }
      const sec = Math.floor(this.t);
      if (sec !== this.lastTick) { this.lastTick = sec; play("tick", 0, 0.3); }
    }
  }

  private updateEvents(): void {
    this.updateAmbient();
    if (this.aideHintAt > 0 && this.t >= this.aideHintAt) {
      this.aideHintAt = -1;
      const seated = this.students.filter((x) => x.status === "seated");
      const cheaters = seated.filter((x) => isCheating(x));
      const honest = !this.s.room.bribedAide && this.s.r() < 0.7;   // 매수된 부감독은 일부러 엉뚱한 학생을 가리킴
      const pool = cheaters.length && honest ? cheaters : seated.filter((x) => !isCheating(x));
      if (pool.length) {
        const st = pool[Math.floor(this.s.r() * pool.length)];
        this.toast(`부감독이 헛기침을 하며 ${st.seat}번 쪽을 봅니다`, 4, COLORS.accent);
        this.s.aideHintSeats.push(st.seat);
      }
    }
    if (this.windowSeat >= 0 && this.t >= this.windowFrom && this.t < this.windowFrom + 0.1) {
      const st = this.students[this.windowSeat];
      if (st.status === "seated") st.nextCheatAt = this.t + 0.5;
    }
    if (this.earlyAt > 0 && this.t >= this.earlyAt) {
      // 한 명씩, 몇 초 간격으로 "시험 포기 → 대기실 이동"
      const next = this.earlyExit.map((i) => this.students[i]).find((x) => x.status === "seated");
      if (!next) { this.earlyAt = -1; return; }
      next.status = "leaving"; next.leaveT = 0;
      this.toast(`${next.seat}번 학생이 시험 포기 의사를 밝혀 대기실로 이동합니다`, 3);
      this.earlyAt = this.t + 4 + this.s.r() * 5;
    }
  }

  /** 창밖 사람이 보이는 동안 */
  windowPersonVisible(): boolean {
    if (this.windowSeat < 0 || this.t < this.windowFrom) return false;
    const st = this.students[this.windowSeat];
    return st.status === "seated" && this.t < this.windowFrom + 60;
  }

  get students(): Student[] {
    return this.s.room.students;
  }

  toast(text: string, sec = 3, color?: string): void {
    this.toasts.push({ text, until: this.rt + sec, color });
  }

  dist(st: Student): number {
    return Math.hypot(st.x - this.cam.x, st.z - this.cam.z);
  }

  /** 학생이 감독관을 의식하는지: 감독관이 앞(칠판 쪽)에 있으면 시야 안, 등 뒤면 최근 5초 안에 흘끗 돌아본 경우만 */
  noticed(st: Student): boolean {
    if (!this.watched(st)) return false;
    if (this.cam.z <= st.z) return true;
    return this.t - (this.lastGlance[st.i] ?? -99) < 5;
  }

  /** 감독관이 이 학생 쪽을 보고 있는지 (시야 ±35°, 7m 이내) */
  /** 부감독(뒷문 옆, 교실 앞쪽을 봄)이 지켜보는 범위: 뒤쪽 두 줄(11~20번). 앞쪽 두 줄은 정감독(플레이어) 몫 */
  aideSees(st: Student): boolean {
    return st.z >= 8.0;
  }

  watched(st: Student): boolean {
    if (this.aideSees(st)) return true;
    // CCTV를 보는 동안 감독관은 교탁 앞: 앞줄은 시선을 의식함
    if (this.mode === "cctv") return this.dist(st) < 3.3;
    const dx = st.x - this.cam.x, dz = st.z - this.cam.z;
    let a = Math.atan2(dx, dz) - this.cam.yaw;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) < 0.62 && Math.hypot(dx, dz) < 7;
  }

  outage(): boolean {
    return this.outageAt >= 0 && this.t >= this.outageAt + 0.6 && this.t < this.outageEnd;
  }

  // ===================== 갱신 =====================
  update(dt: number, inp: Input): void {
    if (this.ended) return;
    this.rt += dt;
    // 휴대폰: 화면 버튼 등록 (명부를 보는 중이면 터치는 닫기용)
    this.touchUi = inp.touchMode && !this.memoOpen ? this.buildTouchUi() : [];
    inp.touchButtons = this.touchUi;
    this.stick = inp.stick;
    if (this.glitch) { this.glitch.update(dt); if (this.glitch.fx.done()) this.glitch = null; }
    if (inp.hit("KeyM")) this.toast(toggleMute() ? "소리 끔" : "소리 켬", 1.5);
    if (inp.hit("KeyC")) { this.captionsOn = !this.captionsOn; this.toast(this.captionsOn ? "소리 자막 켬" : "소리 자막 끔", 1.5); }
    if (inp.hit("KeyQ")) {
      this.memoOpen = !this.memoOpen;
      if (this.memoOpen) { this.memoPages = this.notebookPages(); this.memoPage = 0; }
      inp.releaseLock();
    }
    if (this.memoOpen) {
      // ←/→ 로 감독관 수첩 쪽 넘기기
      const pages = 1 + this.s.save.notebook.length;
      if (inp.hit("ArrowRight") || inp.hit("KeyD")) this.memoPage = Math.min(pages - 1, this.memoPage + 1);
      if (inp.hit("ArrowLeft") || inp.hit("KeyA")) this.memoPage = Math.max(0, this.memoPage - 1);
      if (inp.clicked || inp.hit("Space") || inp.hit("Enter")) { this.memoOpen = false; if (this.mode === "fp") inp.requestLock(); }
      return; // 명부를 보는 동안은 시간이 멈춘다
    }

    if (this.pre > 0) {
      this.pre -= dt;
      if (inp.hit("Tab")) this.toast("시계 확인 중에는 교실을 돌며 직접 봐야 합니다", 2);
      if (this.mode === "fp") this.updateFp(dt, inp);
      else this.updateCctv(inp);
      if (this.pre <= 0) {
        this.toast("08:40 · 1교시 국어 시작", 2.5, COLORS.accent);
        if (this.s.save.mode === "cctv") { this.mode = "cctv"; this.cam.x = 5; this.cam.z = 0.95; this.cam.yaw = 0; this.glitch = cctvGlitch(); }
      }
      return;
    }
    this.t += dt;
    if (inp.hit("Tab")) {
      this.mode = this.mode === "fp" ? "cctv" : "fp";
      if (this.mode === "cctv") { this.cam.x = 5; this.cam.z = 0.95; this.cam.yaw = 0; }   // 교탁 앞 모니터로 이동
      this.glitch = cctvGlitch();
      this.s.save.mode = this.mode;
      this.panel = -1;
      if (this.mode === "cctv") inp.releaseLock();
      this.toast(this.mode === "cctv" ? "교탁 앞 CCTV 화면 · 학생을 클릭해 표시해 두세요" : "교탁 앞에서 감독을 이어 갑니다", 2);
    }

    if (this.mode === "fp") this.updateFp(dt, inp);
    else this.updateCctv(inp);
    this.updateEvents();

    // 정전 이벤트
    if (this.outageAt >= 0 && !this.outageDone && this.t >= this.outageAt && this.outageEnd < 0) {
      this.outageEnd = this.outageAt + 26;
      play("power", 0, 0.8);
      this.periodLen += 15; // 늦어진 만큼 시험 시간 연장
    }
    if (this.outageEnd > 0 && this.t >= this.outageEnd && !this.outageDone) {
      this.outageDone = true;
      this.toast("전기가 복구되었습니다. 늦어진 시간만큼 시험 시간을 연장합니다.", 4);
    }

    // 학생 행동
    const ctx = {
      t: this.t, dt, r: this.s.r, level: this.s.room.level,
      dist: (st: Student) => this.dist(st),
      watched: (st: Student) => this.watched(st),
      noticed: (st: Student) => this.noticed(st),
      collecting: this.collectT > 0,
      freezeRange: this.mode === "cctv" ? 3.3 : this.tiptoe ? 1.4 : FREEZE_RANGE, outage: this.outage(), lastMinutes: this.lastMinutes(),
    };
    for (const st of this.students) {
      updateStudent(st, ctx);
      this.soundFor(st);
      if (st.status === "leaving") {
        st.leaveT += dt;
        if (st.leaveT > 3.6) st.status = "gone";
      }
      // 바로 옆에 오래 머물면 "쳐다봐서 불편하다" 민원
      if (st.status === "seated" && this.mode === "fp" && this.pre <= 0 && this.dist(st) < 1.3 && (this.panel === st.i || this.target === st.i)) {
        st.stareT += dt;
        if (st.stareT > STARE_COMPLAINT_SEC - 3 && st.stareT - dt <= STARE_COMPLAINT_SEC - 3 && !st.stareComplained)
          this.toast(`${st.seat}번 학생이 불편해합니다. 조금 떨어지세요`, 2.5, COLORS.accent);
        if (st.stareT > STARE_COMPLAINT_SEC && !st.stareComplained) {
          st.stareComplained = true;
          this.addComplaint(0.5, `${st.seat}번 학생: "감독관이 계속 옆에 서 있어서 불편해요" 민원`);
        }
      } else st.stareT = Math.max(0, st.stareT - dt * 0.5);
    }

    if (this.endAt > 0 && this.t >= this.endAt) this.finish(this.pendingReason);
    if (this.t >= this.periodLen) {
      // 종료령 → 답안지 회수 (5회차부터). 35% 확률로 펜을 내려놓지 않는 학생이 있다
      if (!this.collectDone && this.s.room.level >= 5 && !this.ended) {
        if (this.collectT <= 0) {
          this.collectT = 12; this.collectDone = true;
          this.toast("종료령이 울렸습니다. 필기구를 내려놓으세요 · 답안지를 회수합니다", 3, COLORS.accent);
          if (this.s.r() < 0.35) {
            const seated = this.students.filter((x) => x.status === "seated");
            const pool = seated.filter((x) => x.cheat).length && this.s.r() < 0.6 ? seated.filter((x) => x.cheat) : seated;
            const st = pool[Math.floor(this.s.r() * pool.length)];
            if (st) st.cheat = CHEAT_BY_ID.overtime;   // 이 학생만 계속 씀
          }
        }
      } else if (this.collectT <= 0) this.finish("time");   // 회수 중에는 끝내지 않음
    }
    if (this.collectT > 0) {
      this.collectT -= dt;
      if (this.collectT <= 0) this.finish("time");
    }
  }

  /** 3교시 앞부분: 영어 듣기평가 방송 중 */
  listening(): boolean {
    return this.s.period === 2 && this.t >= 10 && this.t < 10 + LISTENING_SECONDS;   // 앞 10초는 자리 잡을 준비 시간
  }
  walkNoise = 0;
  tiptoe = false;
  lastStepComplaint = -99;

  private updateFp(dt: number, inp: Input): void {
    if (inp.clicked && !inp.locked) inp.requestLock();
    this.cam.yaw += inp.mouseDX * TURN;
    if (inp.isDown("ArrowLeft")) this.cam.yaw -= dt * 1.8;
    if (inp.isDown("ArrowRight")) this.cam.yaw += dt * 1.8;
    const fx = Math.sin(this.cam.yaw), fz = Math.cos(this.cam.yaw);
    let mx = 0, mz = 0;
    if (inp.isDown("KeyW") || inp.isDown("ArrowUp")) { mx += fx; mz += fz; }
    if (inp.isDown("KeyS") || inp.isDown("ArrowDown")) { mx -= fx; mz -= fz; }
    if (inp.isDown("KeyD")) { mx += fz; mz -= fx; }
    if (inp.isDown("KeyA")) { mx -= fz; mz += fx; }
    const len = Math.hypot(mx, mz);
    this.moving = len > 0;
    if (len > 0) {
      this.tiptoe = inp.isDown("ShiftLeft") || inp.isDown("ShiftRight");
      const step = ((this.tiptoe ? WALK * 0.45 : WALK) * dt) / len;
      this.tryMove(this.cam.x + mx * step, this.cam.z);
      this.tryMove(this.cam.x, this.cam.z + mz * step);
    }
    this.cam.y = 1.55 + (this.moving ? Math.sin(this.t * 9) * 0.012 : 0);
    // 듣기평가 중 걸으면 발소리 (게임 설정: 실제 이동 금지 규정은 확인 못 함)
    if (this.listening() && this.moving && !this.tiptoe) {
      this.walkNoise += dt;
      if (this.walkNoise > 1.5 && this.t - this.lastStepComplaint > 6) {
        this.lastStepComplaint = this.t; this.walkNoise = 0;
        this.addComplaint(0.5, "듣기평가 중 발소리가 시끄럽다는 민원");
      }
    } else this.walkNoise = Math.max(0, this.walkNoise - dt * 0.5);

    // 조준점에 걸린 학생
    this.target = this.pickTarget();

    if (this.endAt > 0) return;   // 끝나는 중에는 관찰·적발 불가
    // E: 관찰
    if (inp.hit("KeyE")) {
      if (this.panel >= 0) this.panel = -1;
      else if (this.target >= 0) {
        this.panel = this.target;
        this.students[this.panel].observed = true;
      } else this.toast("관찰할 학생을 화면 가운데에 두고 가까이 가세요", 2);
    }
    if (this.panel >= 0) {
      const st = this.students[this.panel];
      if (st.status !== "seated" || this.dist(st) > OBSERVE_RANGE + 1) this.panel = -1;
    }
    // T: 열화상
    if (inp.hit("KeyT")) {
      if (this.pre > 0) this.toast("시계 확인 시간에는 열화상을 쓰지 않습니다", 2);
      else if (this.panel < 0) this.toast("열화상은 관찰(E) 중에만 쓸 수 있습니다", 2);
      else if (this.thermalCharges <= 0) this.toast("이번 교시 열화상 횟수를 다 썼습니다", 2);
      else { this.thermalCharges--; this.thermalUntil = this.t + 3; }
    }
    // R: 전파 탐지기 (16회차부터 지급, 교시당 2회)
    if (inp.hit("KeyR")) {
      if (this.s.room.level < 16) this.toast("전파 탐지기는 아직 지급되지 않았습니다", 2);
      else if (this.panel < 0) this.toast("전파 탐지기는 관찰(E) 중에만 쓸 수 있습니다", 2);
      else if (this.radioCharges <= 0) this.toast("이번 교시 전파 탐지기 횟수를 다 썼습니다", 2);
      else {
        this.radioCharges--; this.radioUntil = this.t + 3;
        if (!this.radioExplained) { this.radioExplained = true; this.toast("바늘이 빨간 영역이면 근처 무선 기기가 송신 중입니다. 가끔 다른 기기 잡음도 있습니다", 4); }
      }
    }
    // F: 적발
    if (inp.hit("KeyF")) this.tryAccuse();
  }

  private updateCctv(inp: Input): void {
    if (inp.clicked) {
      // 가장 가까운 학생 표시/해제
      let best = -1, bd = 22;
      for (const st of this.students) {
        if (st.status !== "seated") continue;
        const d = Math.hypot(tdX(st.x) - inp.mouseX, tdY(st.z) - 10 - inp.mouseY);
        if (d < bd) { bd = d; best = st.i; }
      }
      if (best >= 0) {
        if (this.marks.has(best)) this.marks.delete(best);
        else this.marks.add(best);
      }
    }
  }

  private tryMove(x: number, z: number): void {
    if (x < 0.35 || x > ROOM_W - 0.35 || z < 0.35 || z > ROOM_D - 0.35) return;
    if (x > 4.1 && x < 5.9 && z < 0.8) return; // 교탁
    if (Math.hypot(x - this.aide.x, z - this.aide.z) < 0.45) return; // 부감독
    for (const cx of COLX) for (const rz of ROWZ) {
      if (Math.abs(x - cx) < 0.5 && z > rz - 0.45 && z < rz + 0.55) return;
    }
    this.cam.x = x;
    this.cam.z = z;
  }

  private pickTarget(): number {
    let best = -1, bz = 1e9;
    for (const st of this.students) {
      if (st.status !== "seated") continue;
      const c = toCam([st.x, 0, st.z], this.cam);
      if (c[2] < 0.4 || c[2] > OBSERVE_RANGE) continue;
      const sc = (SPX * F) / c[2];
      const [fx, fy] = proj(c);
      const w = SPR_W * sc, h = SPR_H * sc;
      // 머리(스프라이트 위쪽 1/4)가 조준점에 가장 가까운 학생
      const hx = fx, hy = fy - h * 0.72;
      const d = Math.hypot(W / 2 - hx, (H / 2 - hy) * 0.6);
      if (Math.abs(W / 2 - hx) < Math.max(10, w * 0.32) && d < bz) { bz = d; best = st.i; }
    }
    return best;
  }

  private tryAccuse(): void {
    if (this.endAt > 0 || this.s.replaced) return;   // 교체·종료가 정해진 뒤에는 적발 불가
    const idx = this.panel >= 0 ? this.panel : this.target;
    if (idx < 0) { this.toast("적발할 학생을 먼저 관찰(E)하세요", 2); return; }
    const st = this.students[idx];
    if (!st.observed) { this.toast("관찰(E)한 학생만 적발할 수 있습니다", 2); return; }
    if (this.dist(st) > ACCUSE_RANGE) { this.toast("조금 더 가까이 가서 조용히 처리하세요", 2); return; }
    if (this.pre > 0) { this.checkWatch(st); return; }
    const correct = isCheating(st);
    if (!correct && this.s.room.level <= 2 && !this.s.warningUsed) {
      this.s.warningUsed = true;
      this.panel = -1;
      this.toast("수석감독관: 증거가 부족합니다. 이번만 경고로 넘어갑니다.", 4, COLORS.accent);
      return;
    }
    st.status = "leaving";
    st.leaveT = 0;
    st.outcome = correct ? "caught" : "wrong";
    st.caughtAt = this.t;
    this.s.catches.push({ seat: st.seat, period: this.s.period, t: this.t, correct });
    this.panel = -1;
    if (correct) {
      this.caughtThisPeriod++;
      this.toast(`${st.seat}번 학생 · 기기 압수, 조용히 퇴실`, 3);
      if (END_WHEN_ALL_CAUGHT && !this.students.some((o) => isCheating(o))) {
        this.toast("이 교실의 부정행위자를 모두 찾았습니다", 3, COLORS.accent);
        this.endAt = this.t + 1.8; this.pendingReason = "allCaught";
      }
    } else {
      this.addComplaint(1, `${st.seat}번 학생: "억울합니다" 민원 접수`);
    }
  }

  /** 시계 확인 시간: 스마트워치(아날로그처럼 생긴 하이브리드 포함)만 보관 */
  private checkWatch(st: Student): void {
    this.panel = -1;
    if ((st.watch === "smart" || st.watch === "hybrid") && st.cheat?.id === "watch") {
      st.confiscated = true;
      this.toast(`${st.seat}번 · ${st.watch === "hybrid" ? "아날로그처럼 생긴 스마트워치" : "스마트워치"} 보관, 시험은 그대로 봅니다`, 3);
    } else if (st.watch === "none") {
      this.toast(`${st.seat}번은 시계가 없습니다`, 2);
    } else {
      if (this.watchChecked.has(st.i)) { this.toast(`${st.seat}번 시계는 이미 확인했습니다`, 2); return; }
      this.watchChecked.add(st.i);
      this.addComplaint(0.5, `${st.seat}번: "아날로그 시계인데 왜 가져가요" 민원`);
    }
  }

  /** 무선으로 송수신 중인 기기가 있는지 (이어폰·송수신기·스마트워치·휴대폰·AI 안경·카메라) */
  private transmitting(st: Student): boolean {
    if (!isCheating(st)) return false;
    // 송신 중: 부정행위 동작 중이거나 끝난 지 4초 이내
    if (!(st.acting || this.t - (this.lastAct[st.i] ?? -99) < 4)) return false;
    const c = st.cheat!;
    return !!(c.tells.earpiece || c.tells.neckDevice || c.tells.collarCam || c.tells.camPen || st.aiGen > 0 ||
      c.id === "watch" || c.family === "phone");
  }

  /** 관찰 중인 학생 주변 1.5m의 전파 세기 (0~1). 가끔 무고한 잡음이 섞인다 */
  private radioSignal(st: Student): number {
    let sig = 0.12 + 0.08 * Math.sin(this.t * 7);
    for (const o of this.students) {
      if (o.status !== "seated" || Math.hypot(o.x - st.x, o.z - st.z) > 1.5) continue;
      if (this.transmitting(o)) sig = Math.max(sig, 0.8 + 0.18 * Math.sin(this.t * 13));   // 옆 학생 기기도 같은 세기 → 1.5m 안 누구인지는 행동으로
    }
    const tick = Math.floor(this.t * 2 + st.i);
    if (tick % 9 === 0) sig = Math.max(sig, 0.45);   // 다른 전자기기 잡음
    if (tick % 31 === 0) sig = Math.max(sig, 0.88);  // 가끔은 잡음도 빨강까지
    return Math.min(1, sig);
  }

  /** 전파 탐지기 바늘 */
  private drawRadio(g: Ctx, st: Student): void {
    const x = 214, y = 196;
    px(g, x, y, 70, 64, "rgba(16,22,20,0.94)");
    g.font = KR(11); g.fillStyle = COLORS.chalk; g.textBaseline = "top"; g.fillText("전파 탐지", x + 6, y + 4);
    const cx = x + 35, cy = y + 56, r = 26;
    g.strokeStyle = "#2b3732"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
    g.strokeStyle = "#3f7a4a"; g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI * 1.5); g.stroke();   // 평소 범위 (초록)
    g.font = KR(9); g.fillStyle = "#7fd18c"; g.fillText("평소", x + 4, y + 50); g.fillStyle = COLORS.alert; g.fillText("송신", x + 50, y + 50);
    g.strokeStyle = COLORS.alert; g.beginPath(); g.arc(cx, cy, r, -0.6, 0); g.stroke();
    const sig = this.radioSignal(st);
    const a = Math.PI + sig * Math.PI;
    g.strokeStyle = COLORS.chalk; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)); g.stroke();
  }

  addComplaint(n: number, text: string): void {
    if (this.s.replaced) return;
    this.s.complaints = Math.min(COMPLAINT_MAX, this.s.complaints + n);
    this.toast(text, 3.5, COLORS.alert);
    if (this.s.complaints >= COMPLAINT_MAX) {
      this.s.replaced = true;
      this.toast("민원이 너무 많아 감독관이 교체됩니다", 3, COLORS.alert);
      this.endAt = this.t + 1.5; this.pendingReason = "replaced";
    }
  }

  finish(reason: ExamScene["endReason"]): void {
    if (this.ended) return;
    this.ended = true;
    this.endReason = reason;
    this.onEnd();
  }

  notebookPages(): string[] {
    const lines = ["감독 명부 · " + `${this.s.room.school} 제${this.s.room.roomNo}시험실`];
    if (this.s.room.tutorial.length) lines.push(...this.s.room.tutorial.slice(1));
    lines.push(...this.s.room.notes);
    lines.push(`조작: WASD 이동(Shift 까치발) · 마우스 시선 · E 관찰 · F 적발 · T 열화상${this.s.room.level >= 16 ? " · R 전파 탐지" : ""} · Tab CCTV · Q 명부 · M 소리 · C 소리 자막`);
    return lines;
  }

  // ===================== 그리기 =====================
  render(g: Ctx): void {
    if (this.mode === "fp") this.renderFp(g);
    else this.renderCctv(g);
    if (this.glitch) this.glitch.draw(g);
    this.renderHud(g);
    this.renderCaptions(g);
    this.renderTouchUi(g);
    if (this.memoOpen) this.renderMemo(g);
  }

  private presetNow(): PresetName {
    if (this.outageAt >= 0 && this.t >= this.outageAt && this.t < this.outageEnd) {
      if (this.t < this.outageAt + 0.6) return Math.floor(this.t * 8) % 2 ? "dark" : this.weather;
      return "dark";
    }
    return this.weather;
  }

  private renderFp(g: Ctx): void {
    const [, bg] = this.base;
    const [sprC, sg] = this.spr;
    bg.imageSmoothingEnabled = false;
    drawRoom(bg, this.cam);
    // 창밖 조력자 (창문 유리 너머 그림자)
    if (this.windowPersonVisible()) {
      const z = this.students[this.windowSeat].z;
      const bob = Math.sin(this.t * 2) * 0.03;
      quad(bg, this.cam, [[0.03, 1.05 + bob, z - 0.28], [0.03, 1.05 + bob, z + 0.28], [0.03, 1.85 + bob, z + 0.28], [0.03, 1.85 + bob, z - 0.28]], "#3b3f4a");
      quad(bg, this.cam, [[0.03, 1.9 + bob, z - 0.14], [0.03, 1.9 + bob, z + 0.14], [0.03, 2.22 + bob, z + 0.14], [0.03, 2.22 + bob, z - 0.14]], "#2e3138");
    }
    const lights: PointLight[] = [];
    type Item = { st: Student; wx: number; wz: number; kind: "seat" | "walk" | "aide" };
    const items: Item[] = [{ st: this.students[0], wx: this.aide.x, wz: this.aide.z, kind: "aide" }];
    for (const st of this.students) {
      items.push({ st, wx: st.x, wz: st.z, kind: "seat" });
      if (st.status === "leaving") {
        const u = Math.min(1, st.leaveT / 3.4);
        items.push({ st, wx: st.x + (DOOR.x - st.x) * u, wz: st.z + 0.5 + (DOOR.z - st.z - 0.5) * u, kind: "walk" });
      }
    }
    const vis = items
      .map((it) => ({ it, c: toCam([it.wx, 0, it.wz], this.cam) }))
      .filter((o) => o.c[2] > 0.35)
      .sort((a, b) => b.c[2] - a.c[2]);
    for (const { it, c } of vis) {
      const local: Array<{ x: number; y: number }> = [];
      if (it.kind === "aide") drawProctor(sg, this.t);
      else if (it.kind === "walk") drawStanding(sg, it.st, this.t);
      else if (it.st.status !== "seated") drawEmptySeat(sg);
      else if (this.cam.z > it.st.z + 0.15) drawStudentBack(sg, it.st, { t: this.t, ledVisible: false, lights: local });   // 학생은 칠판을 보고 앉아 있음
      else drawStudent(sg, it.st, { t: this.t, ledVisible: true, lights: local });
      const sc = (SPX * F) / c[2];
      const [fx, fy] = proj(c);
      const w = SPR_W * sc, h = SPR_H * sc;
      const left = fx - w / 2, top = fy - h;
      if (left > W || left + w < 0) continue;
      bg.drawImage(sprC, left, top, w, h);
      for (const L of local) lights.push({ x: Math.round(left + (L.x + 0.5) * sc), y: Math.round(top + (L.y + 0.5) * sc), r: Math.max(3, Math.round(11 * sc * 0.6)), c: [255, 70, 50], s: 0.95 });
      // CCTV에서 표시한 학생 머리 위 표시
      if (it.kind === "seat" && this.marks.has(it.st.i) && it.st.status === "seated") px(bg, fx - 2, top - 6, 4, 4, COLORS.accent);
    }
    drawClipboard(bg, this.t, this.moving);
    const src = bg.getImageData(0, 0, W, H);
    applyLight(src, this.dst, this.presetNow(), lights);
    g.putImageData(this.dst, 0, 0);

    // 조준점 + 대상 표시
    px(g, W / 2 - 1, H / 2 - 1, 2, 2, "rgba(233,230,218,0.85)");
    const ti = this.panel >= 0 ? this.panel : this.target;
    if (ti >= 0) {
      const st = this.students[ti];
      const c = toCam([st.x, 0, st.z], this.cam);
      if (c[2] > 0.35) {
        const sc = (SPX * F) / c[2];
        const [fx, fy] = proj(c);
        const w = SPR_W * sc, h = SPR_H * sc;
        const x0 = Math.round(fx - w * 0.38), x1 = Math.round(fx + w * 0.38);
        const y0 = Math.max(4, Math.round(fy - h * 0.98)), y1 = Math.min(H - 4, Math.round(fy - h * 0.4));
        g.fillStyle = COLORS.accent;
        const L = 6;
        g.fillRect(x0, y0, L, 1); g.fillRect(x0, y0, 1, L);
        g.fillRect(x1 - L, y0, L, 1); g.fillRect(x1, y0, 1, L);
        g.fillRect(x0, y1, L, 1); g.fillRect(x0, y1 - L, 1, L);
        g.fillRect(x1 - L, y1, L + 1, 1); g.fillRect(x1, y1 - L, 1, L + 1);
        const d = this.dist(st);
        const txt = !st.observed ? "[E] 관찰" : d <= ACCUSE_RANGE ? "[F] 적발  [E] 닫기" : "가까이 가면 [F] 적발";
        g.font = KR(12);
        const lw = Math.ceil(g.measureText(`${st.seat}번 ${txt}`).width) + 8;
        label(g, `${st.seat}번 ${txt}`, Math.max(4, Math.min(W - lw - 4, Math.round(fx - lw / 2))), Math.min(H - 20, y1 + 4), { font: KR(12), color: COLORS.accent });   // 얼굴을 가리지 않게 아래에
      }
    }
    if (this.panel >= 0) {
      const st = this.students[this.panel];
      const blur = Math.max(0, Math.min(1, (this.dist(st) - 3) / 1.2));   // 3m보다 멀면 흐릿
      const behind = this.cam.z > st.z + 0.15;   // 뒤에서 보면 어깨 너머 관찰
      drawCloseup(g, st, this.t, 10, 166, this.t < this.thermalUntil, blur, behind);
      if (blur > 0) label(g, "멀어서 흐릿합니다 · 조금 더 다가가세요", 14, 248, { font: KR(11), color: COLORS.accent });
      if (this.t < this.radioUntil) this.drawRadio(g, st);
      label(g, `${st.seat}번 ${this.cam.z > st.z + 0.15 ? "어깨 너머 " : ""}관찰 중 · T 열화상 ${this.thermalCharges}회${this.s.room.level >= 16 ? ` · R 전파 ${this.radioCharges}회` : ""}`, 8, 150, { font: KR(12), bg: "none", color: COLORS.chalk });
    }
  }

  private renderCctv(g: Ctx): void {
    const [, bg] = this.base;
    const [sprC, sg] = this.spr;
    drawTopRoom(bg);
    const order = [...this.students].sort((a, b) => b.z - a.z);
    for (const st of order) {
      if (st.status === "seated") drawStudentBack(sg, st, { t: this.t, ledVisible: false, lights: [] });   // 뒤쪽 카메라라 뒷모습
      else drawEmptySeat(sg);
      bg.drawImage(sprC, Math.round(tdX(st.x) - 16), Math.round(tdY(st.z) - 24));
    }
    for (const st of this.students) if (st.status === "leaving") {
      const u = Math.min(1, st.leaveT / 3.4);
      drawStanding(sg, st, this.t);
      bg.drawImage(sprC, Math.round(tdX(st.x + (DOOR.x - st.x) * u) - 16), Math.round(tdY(st.z + (DOOR.z - st.z) * u) - 30));
    }
    drawTopTeacher(bg, this.cam.x, this.cam.z, this.cam.yaw);
    drawTopTeacher(bg, this.aide.x, this.aide.z, Math.PI);   // 부감독 (앞쪽을 봄)
    const src = bg.getImageData(0, 0, W, H);
    cctvPass(src, this.dst, this.t, this.outage());
    g.putImageData(this.dst, 0, 0);
    for (const i of this.marks) {
      const st = this.students[i];
      if (st.status !== "seated") continue;
      g.strokeStyle = COLORS.accent; g.lineWidth = 1;
      g.strokeRect(Math.round(tdX(st.x) - 12) + 0.5, Math.round(tdY(st.z) - 26) + 0.5, 24, 30);
    }
    g.font = PIX(8); g.textBaseline = "top"; g.fillStyle = "#cfeec8";
    g.fillText("CAM-01  REAR", W - 96, 26);
    if (Math.floor(this.t * 2) % 2 === 0) px(g, 8, H - 14, 6, 6, COLORS.alert);
    g.fillText("REC", 18, H - 15);
  }

  private renderHud(g: Ctx): void {
    const p = PERIODS[this.s.period];
    const remain = Math.max(0, this.periodLen - this.t);
    const head = this.pre > 0 ? `시계 확인  08:${String(30 + Math.min(9, Math.floor((12 - this.pre) / 1.2))).padStart(2, "0")}` : `${p.name}  ${clockText(this.s.period, this.t)}`;
    label(g, head, 6, 6, { font: KR(12) });
    if (this.s.period === 2 && this.t < 10) label(g, `듣기평가 ${Math.ceil(10 - this.t)}초 전 · 지켜볼 자리를 잡으세요 (Shift 까치발)`, 70, 112, { font: KR(12), color: COLORS.accent });
    if (this.listening()) {
      const lines = ["[방송] 지금부터 영어 듣기평가를 시작합니다.", "감독관은 듣기평가 동안 이동을 자제해 주십시오."];
      px(g, 10, H - 58, 330, 44, "rgba(16,22,20,0.92)"); px(g, 10, H - 58, 3, 44, COLORS.accent);
      g.font = KR(13); g.textBaseline = "top"; g.fillStyle = COLORS.chalk;
      g.fillText(lines[0], 20, H - 53); g.fillText(lines[1], 20, H - 34);
      label(g, `듣기평가 ${Math.ceil(10 + LISTENING_SECONDS - this.t)}초`, 110, 20, { font: KR(11), color: COLORS.accent });
    }
    if (this.collectT > 0) label(g, `답안지 회수 중 ${Math.ceil(this.collectT)}초 · 아직 펜을 움직이는 학생이 있으면 관찰 후 F`, 50, 112, { font: KR(12), color: COLORS.accent });
    if (this.pre > 0) label(g, "학생들이 시계를 책상 위에 올려 둡니다 · 스마트워치는 관찰(E) 후 F로 보관", 40, 112, { font: KR(12), color: COLORS.accent });
    // 남은 시간 막대
    px(g, 6, 24, 100, 4, COLORS.line);
    const hurry = this.lastMinutes() && Math.floor(this.rt * 2) % 2 === 0;
    px(g, 6, 24, Math.round(100 * (remain / this.periodLen)), 4, this.lastMinutes() ? (hurry ? COLORS.alert : "#ff8a7f") : COLORS.accent);
    if (this.lastMinutes()) label(g, "종료 10분 전", 110, 20, { font: KR(11), color: COLORS.alert });
    const caught = this.s.catches.filter((c) => c.correct).length + this.s.gateEjected.length;
    label(g, `CAUGHT ${caught}/?`, 6, 32, { font: PIX(8) });
    // 민원 게이지 3칸
    label(g, "민원", W - 92, 6, { font: KR(12) });
    for (let k = 0; k < COMPLAINT_MAX; k++) {
      const fill = Math.min(1, Math.max(0, this.s.complaints - k));
      px(g, W - 58 + k * 17, 9, 14, 10, COLORS.line);
      if (fill > 0) px(g, W - 58 + k * 17, 9, Math.round(14 * fill), 10, COLORS.alert);
    }
    if (this.mode === "fp" && !this.memoOpen && this.t < 6 && this.pre <= 0 && this.s.period === 0)
      if (!this.touchUi.length) label(g, "화면 클릭 → 마우스 고정 · Q 명부 보기", W / 2 - 100, 132, { font: KR(12) });
    // 정전 방송
    this.renderOutage(g);
    // 토스트
    this.toasts = this.toasts.filter((x) => x.until > this.rt);
    this.toasts.slice(-3).forEach((x, n) => {
      g.font = KR(12);
      const w = Math.ceil(g.measureText(x.text).width) + 12;
      label(g, x.text, Math.round(W / 2 - w / 2), 46 + n * 20, { font: KR(12), color: x.color ?? COLORS.chalk });
    });
  }

  private renderOutage(g: Ctx): void {
    if (this.outageAt < 0 || this.t < this.outageAt + 1 || this.t > this.outageAt + 10) return;
    const e = this.t - this.outageAt;
    if (this.mode === "fp") {
      const sp = toCam(SPEAKER, this.cam);
      if (sp[2] > 0.2) {
        const [sx, sy] = proj(sp);
        const ring = Math.floor(this.t * 6) % 3;
        for (let n = 0; n <= ring; n++) {
          px(g, sx - 8 - n * 6, sy - 3, 2, 6, COLORS.accent);
          px(g, sx + 8 + n * 6, sy - 3, 2, 6, COLORS.accent);
        }
      }
    }
    if (e < 4 && Math.floor(this.t * 3) % 3 !== 2) {
      g.font = PIX(16);
      const lw = Math.ceil(g.measureText("EVENT!").width) + 16;
      px(g, W / 2 - lw / 2, 92, lw, 22, COLORS.accent);
      g.fillStyle = COLORS.bg; g.textBaseline = "top"; g.fillText("EVENT!", W / 2 - lw / 2 + 8, 95);
    }
    const lines = e < 5.5
      ? ["갑작스러운 정전입니다.", "수험생 여러분은 동요하지 말고 기다려 주십시오."]
      : ["정전으로 늦어진 시간만큼", "시험 시간을 연장합니다. 감독관은 자리를 지켜 주십시오."];
    px(g, 10, H - 58, 320, 44, "rgba(16,22,20,0.92)");
    px(g, 10, H - 58, 3, 44, COLORS.accent);
    g.font = KR(13); g.textBaseline = "top";
    g.fillStyle = COLORS.accent; g.fillText("[방송실]", 20, H - 53);
    g.fillStyle = COLORS.chalk; g.fillText(lines[0], 76, H - 53); g.fillText(lines[1], 20, H - 34);
  }

  private renderMemo(g: Ctx): void {
    px(g, 0, 0, W, H, "rgba(0,0,0,0.55)");
    const x = 70, y = 20, w = 340, h = 230;
    px(g, x - 6, y - 6, w + 12, h + 12, "#5a3f28");
    px(g, x, y, w, h, "#f4f2ea");
    px(g, x + w / 2 - 20, y - 10, 40, 10, "#9aa0a8");
    g.textBaseline = "top";
    const nbIds = [...this.s.save.notebook].sort((a, b) => CHEAT_BY_ID[a].no - CHEAT_BY_ID[b].no);
    const pages = 1 + nbIds.length;
    g.font = KR(11); g.fillStyle = "#7d776b";
    const pageText = `${this.memoPage + 1} / ${pages}${pages > 1 ? "  ←/→ 넘기기" : ""}`;
    g.fillText(pageText, x + w - 14 - g.measureText(pageText).width, y + 14);
    if (this.memoPage > 0) {
      // 감독관 수첩: 손글씨 메모 한 쪽
      const c = CHEAT_BY_ID[nbIds[this.memoPage - 1]];
      for (let k = 0; k < 9; k++) px(g, x + 10, y + 44 + k * 18, w - 20, 1, "#d8d2c2");
      px(g, x + 34, y + 36, 1, h - 50, "#e3a49a");
      g.font = KR(16); g.fillStyle = COLORS.navy;
      g.fillText(`감독관 수첩 · ${c.name}`, x + 14, y + 12);
      const missed = this.s.save.noteMissed.includes(c.id);
      if (missed) { g.font = KR(12); g.fillStyle = "#b03a2e"; g.fillText("처음엔 놓쳤던 수법", x + w - 128, y + 30); }
      g.font = KR(13); g.fillStyle = missed ? "#b03a2e" : "#2a3a6a";
      let yy = y + 48;
      for (const line of wrapText(g, c.hint, w - 56)) { g.fillText(line, x + 42, yy); yy += 18; }
      yy += 8;
      g.font = KR(12); g.fillStyle = "#7d776b";
      const kindText = c.url ? `실제 사례: ${c.source}` : c.source.includes("게임 설정") ? "게임에서 지어낸 수법입니다 (실제 사례 없음)" : "널리 알려진 수법 (특정 사건 출처 미확인)";
      for (const line of wrapText(g, kindText, w - 56)) { g.fillText(line, x + 42, yy); yy += 16; }
      if (c.url) {
        // 신문 스크랩처럼 출처 주소를 붙여 둠
        yy += 4;
        px(g, x + 40, yy - 2, w - 60, 30, "#efe6cf"); px(g, x + 40, yy - 2, w - 60, 1, "#cdbf9c");
        g.font = PIX(8); g.fillStyle = "#5a4a2a";
        const u = c.url.replace(/^https?:\/\//, "");
        g.fillText(u.slice(0, 48), x + 46, yy + 3);
        if (u.length > 48) g.fillText(u.slice(48, 96), x + 46, yy + 14);
      }
      g.font = KR(12); g.fillStyle = "#7d776b";
      g.fillText("클릭하거나 Space를 누르면 감독으로 돌아갑니다", x + 14, y + h - 22);
      return;
    }
    g.font = KR(16); g.fillStyle = COLORS.navy;
    g.fillText(this.memoPages[0] ?? "감독 명부", x + 14, y + 12);
    // 들어갈 줄 수를 먼저 세고, 넘치면 글자를 줄인다
    let size = 13, lh = 17;
    for (; size >= 10; size--, lh -= 1.5) {
      g.font = KR(size);
      let n = 0;
      for (const para of this.memoPages.slice(1)) n += wrapText(g, para, w - 40).length;
      if (40 + n * lh + this.memoPages.length * 5 < h - 48) break;
    }
    g.fillStyle = COLORS.ink;
    let yy = y + 40;
    for (const para of this.memoPages.slice(1)) {
      px(g, x + 12, yy + 5, 4, 4, COLORS.alert);
      g.fillStyle = COLORS.ink;   // 글머리 점 색이 본문에 번지지 않게
      for (const line of wrapText(g, para, w - 40)) {
        g.fillText(line, x + 22, yy);
        yy += lh;
      }
      yy += 5;
    }
    // 수첩 기록
    const nb = this.s.save.notebook;
    if (nb.length) {
      g.font = KR(12); g.fillStyle = "#7d776b";
      g.fillText("→ 뒷장에 감독관 수첩 메모가 있습니다", x + 14, y + h - 40);
    }
    g.font = KR(12); g.fillStyle = "#7d776b";
    g.fillText("클릭하거나 Space를 누르면 감독을 시작합니다", x + 14, y + h - 22);
  }
}
