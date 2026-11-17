// 진입점: 화면 크기 맞추기, 게임 루프, 장면 전환
import { H, W } from "./core/px";
import { Input } from "./core/input";
import { unlockAudio } from "./core/audio";
import { loadSave, writeSave } from "./core/save";
import { newSession, todayKey, type Session } from "./game/session";
import { TitleScene } from "./game/title";
import { ExamScene } from "./game/exam";
import { BreakScene } from "./game/breakScene";
import { ResultScene } from "./game/result";
import { GateScene } from "./game/gate";
import { END_WHEN_ALL_CAUGHT } from "./data/rules";
import { isCheating } from "./world/student";

interface Scene {
  update(dt: number, inp: Input): void;
  render(g: CanvasRenderingContext2D): void;
}

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const g = canvas.getContext("2d", { willReadFrequently: true })!;
g.imageSmoothingEnabled = false;
const input = new Input(canvas);
const save = loadSave();
unlockAudio();

function fit(): void {
  const s = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
}
window.addEventListener("resize", fit);
fit();

let scene: Scene;
let session: Session | null = null;

function goTitle(): void {
  input.releaseLock();
  scene = new TitleScene(save, () => startSession(), () => startSession(undefined, true));
}

function startSession(levelOverride?: number, daily = false): void {
  const lv = levelOverride ?? save.level;
  session = newSession(save, levelOverride, daily ? 0 : save.attempts[lv] ?? 0, daily ? todayKey() : null);
  if (session.room.gate) scene = new GateScene(session, () => (session!.replaced ? showResult() : startPeriod(0)));
  else startPeriod(0);
}

function startPeriod(p: 0 | 1): void {
  const s = session!;
  s.period = p;
  const exam: ExamScene = new ExamScene(s, () => {
    writeSave(save);
    if (s.replaced || p === 1 || s.room.periods === 1) showResult();
    else { input.releaseLock(); scene = new BreakScene(s, () => startPeriod(1)); }
  });
  scene = exam;
  // 2교시를 시작할 때 남은 부정행위자도 이벤트도 없으면 바로 결과로
  if (p === 1 && END_WHEN_ALL_CAUGHT && !s.room.students.some((x) => isCheating(x))) showResult();
}

function showResult(): void {
  input.releaseLock();
  const s = session!;
  scene = new ResultScene(s, {
    next: () => startSession(),
    retry: () => startSession(s.room.level),
    title: goTitle,
  });
}

// 개발용: 주소 끝에 #lv=12 를 붙이면 그 회차로 바로 시작
const m = location.hash.match(/lv=(\d+)/);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scene.update(dt, input);
  scene.render(g);
  input.endFrame();
  requestAnimationFrame(frame);
}

const fontsReady = document.fonts
  ? Promise.all([document.fonts.load("12px \"Do Hyeon\"", "감독관"), document.fonts.load("8px Silkscreen")])
  : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2000))]).finally(() => {
  if (m) startSession(Number(m[1]));
  else goTitle();
  requestAnimationFrame(frame);
});

// 테스트·디버깅용 노출
(window as unknown as { __game: unknown }).__game = { get scene() { return scene; }, get session() { return session; }, save };
