// pixelfx(https://github.com/patch-gg/pixelfx, MIT)는 JS라서 쓰는 부분만 타입을 적어 둔다
declare module "pixelfx" {
  export interface Frame { w: number; h: number; ox: number; oy: number; color: Uint32Array; light: Uint32Array }
  export interface Fx {
    update(dt: number): void;
    draw(frame: Frame, layer?: "back" | "front"): void;
    stop(): void;
    done(): boolean;
    readonly t: number;
  }
  export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
  export function clearFrame(f: Frame): Frame;
  export function createFx(mod: unknown, o?: Record<string, unknown>): Fx;
  export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | Uint32Array | null, lightK?: number): Uint8ClampedArray;
}
declare module "pixelfx/fx/*" {
  export const meta: { duration?: number; size?: [number, number]; origin?: [number, number]; loop?: boolean };
}
