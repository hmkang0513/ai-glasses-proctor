// pixelfx 연결: 조용한 연출만 쓴다 (시작 화면 낙엽, CCTV 전환 글리치)
import { clearFrame, composite, createFrame, createFx, type Frame, type Fx } from "pixelfx";
import * as fallingLeaves from "pixelfx/fx/weather/falling-leaves";
import * as glitchWipe from "pixelfx/fx/transitions/glitch-wipe";
import { H, W, makeCanvas, type Ctx } from "../core/px";

/** 효과 하나를 자기 프레임에 그려 화면 위에 얹는다 */
class Layer {
  private frame: Frame;
  private img: ImageData;
  private canvas: HTMLCanvasElement;
  private g: Ctx;
  constructor(public fx: Fx, w: number, h: number, private speed = 1, private native: { x: number; y: number; alpha: number } | null = null) {
    this.frame = createFrame(w, h);
    this.img = new ImageData(w, h);
    [this.canvas, this.g] = makeCanvas(w, h);
  }
  update(dt: number): void {
    this.fx.update(dt * this.speed);
  }
  draw(g: Ctx): void {
    clearFrame(this.frame);
    this.fx.draw(this.frame);
    composite(this.frame, this.img.data, null);
    if (this.native) {                       // 반투명 바닥·그늘 픽셀은 지우고 잎만 남김
      const d = this.img.data;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 200) d[i] = 0;
    }
    this.g.putImageData(this.img, 0, 0);
    g.imageSmoothingEnabled = false;
    if (this.native) {                       // 원래 크기로, 반투명하게
      g.globalAlpha = this.native.alpha;
      g.drawImage(this.canvas, this.native.x, this.native.y);
      g.globalAlpha = 1;
    } else g.drawImage(this.canvas, 0, 0, W, H);   // 320×180 전환 효과는 화면 크기로 늘림
  }
}

/** 시작 화면: 11월 수능날의 낙엽 (화면 가운데 320×180 영역) */
export function titleLeaves(): Layer {
  return new Layer(createFx(fallingLeaves, { x: 160, y: 170, seed: 11 }), 320, 180, 0.8, { x: 140, y: 20, alpha: 0.85 });
}

/** CCTV 화면 전환 글리치 (원래 1.8초 → 2.5배 빠르게) */
export function cctvGlitch(): Layer {
  return new Layer(createFx(glitchWipe, { seed: Math.floor(Math.random() * 999) }), 320, 180, 2.5);
}

export type { Layer };
