// 키보드·마우스 입력. 1인칭에서는 캔버스를 클릭하면 마우스를 고정(포인터 락)한다.
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  /** 캔버스 내부 좌표(480×270 기준) */
  mouseX = -1;
  mouseY = -1;
  clicked = false;
  locked = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      const k = e.code;
      if (["Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => this.down.clear());
    canvas.addEventListener("mousemove", (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener("mousedown", () => {
      this.clicked = true;
    });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** 이번 프레임에 새로 눌렸는지 */
  hit(code: string): boolean {
    return this.pressed.has(code);
  }

  requestLock(): void {
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
