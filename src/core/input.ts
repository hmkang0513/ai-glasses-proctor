// 키보드·마우스·터치 입력.
// PC: 1인칭에서는 캔버스를 클릭하면 마우스를 고정(포인터 락)한다.
// 휴대폰: 화면 왼쪽을 끌면 걷기(가상 조이스틱), 오른쪽을 끌면 고개 돌리기, 화면 버튼은 키 입력으로 바꾼다.
import { H, W } from "./px";

export interface TouchButton { x: number; y: number; w: number; h: number; code: string; label: string }

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private stickKeys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  /** 캔버스 내부 좌표(480×270 기준) */
  mouseX = -1;
  mouseY = -1;
  clicked = false;
  locked = false;
  /** 터치로 조작 중인지 (한 번이라도 터치하면 켜짐) */
  touchMode = false;
  /** 시험 장면이 매 프레임 등록하는 터치 버튼. 비어 있으면 터치는 클릭으로만 쓰인다 */
  touchButtons: TouchButton[] = [];
  /** 터치 조이스틱 상태 (그리기용) */
  stick: { ox: number; oy: number; x: number; y: number } | null = null;

  private stickId = -1;
  private lookId = -1;
  private lookX = 0;

  constructor(private canvas: HTMLCanvasElement) {
    // 터치 화면 기기(휴대폰·태블릿)는 처음부터 터치 모드: 마우스 고정을 쓰지 않는다
    try {
      this.touchMode = navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches;
    } catch { /* 확인 못 하면 PC로 간주 */ }
    window.addEventListener("keydown", (e) => {
      const k = e.code;
      if (["Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => { this.down.clear(); this.stickKeys.clear(); });

    canvas.addEventListener("pointermove", (e) => {
      const [x, y] = this.toCanvas(e);
      if (e.pointerType !== "mouse") {
        if (e.pointerId === this.stickId && this.stick) { this.stick.x = x; this.stick.y = y; this.updateStick(); }
        if (e.pointerId === this.lookId) { this.mouseDX += (x - this.lookX) * 3.2; this.lookX = x; }
        return;
      }
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
      this.mouseX = x;
      this.mouseY = y;
    });

    canvas.addEventListener("pointerdown", (e) => {
      const [x, y] = this.toCanvas(e);
      this.mouseX = x;      // 터치는 이동 없이 바로 누르므로 여기서 위치를 잡는다
      this.mouseY = y;
      if (e.pointerType !== "mouse" || this.touchMode) {   // 손가락·펜 (또는 터치 기기)
        this.touchMode = true;
        e.preventDefault();
        const btn = this.touchButtons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
        if (btn) { this.pressed.add(btn.code); return; }
        if (this.touchButtons.length) {
          if (x < W * 0.45 && this.stickId < 0) {
            this.stickId = e.pointerId; this.stick = { ox: x, oy: y, x, y };
          } else if (this.lookId < 0) {
            this.lookId = e.pointerId; this.lookX = x;
          }
        }
      }
      this.clicked = true;
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickId) { this.stickId = -1; this.stick = null; this.stickKeys.clear(); }
      if (e.pointerId === this.lookId) this.lookId = -1;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  private toCanvas(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  /** 조이스틱 방향 → WASD */
  private updateStick(): void {
    this.stickKeys.clear();
    if (!this.stick) return;
    const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
    if (Math.hypot(dx, dy) < 6) return;
    if (dy < -6) this.stickKeys.add("KeyW");
    if (dy > 6) this.stickKeys.add("KeyS");
    if (dx < -6) this.stickKeys.add("KeyA");
    if (dx > 6) this.stickKeys.add("KeyD");
  }

  isDown(code: string): boolean {
    return this.down.has(code) || this.stickKeys.has(code);
  }

  /** 이번 프레임에 새로 눌렸는지 */
  hit(code: string): boolean {
    return this.pressed.has(code);
  }

  requestLock(): void {
    if (this.touchMode) return;   // 휴대폰에는 포인터 락이 없다
    if (!this.locked) {
      try {
        const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* 포인터 락이 안 되는 환경이면 무시 */
      }
    }
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** 프레임 끝에서 1회성 입력 초기화 */
  endFrame(): void {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
  }
}
