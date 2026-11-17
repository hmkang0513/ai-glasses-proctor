// 조명 (LutLight2D 원리): 빛 세기를 계단식으로 나누고, 계단마다 정한 색조(램프)를 곱한다
import { H, W } from "../core/px";
import { makeRng } from "../core/rng";

export type PresetName = "day" | "overcast" | "dark" | "dim";
interface Preset { amb: number; win: number; lo: [number, number, number]; hi: [number, number, number] }

export const PRESETS: Record<PresetName, Preset> = {
  day:      { amb: 0.80, win: 0.50, lo: [0.55, 0.50, 0.62], hi: [1.10, 1.04, 0.90] },
  overcast: { amb: 0.66, win: 0.26, lo: [0.48, 0.52, 0.62], hi: [0.98, 1.00, 1.04] },
  dim:      { amb: 0.52, win: 0.30, lo: [0.30, 0.32, 0.52], hi: [0.95, 0.95, 1.06] },
  dark:     { amb: 0.30, win: 0.16, lo: [0.20, 0.24, 0.42], hi: [0.90, 0.92, 1.05] },
};

const cache = new Map<string, Float32Array>();
function lightMap(name: PresetName): Float32Array {
  let m = cache.get(name);
  if (m) return m;
  const p = PRESETS[name];
  m = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // 1인칭: 왼쪽 창문 쪽이 밝고 아래(가까운 곳)가 조금 더 밝다
    m[y * W + x] = p.amb + p.win * Math.max(0, 1 - x / (W * 0.7)) + 0.12 * (y / H);
  }
  cache.set(name, m);
  return m;
}

export interface PointLight { x: number; y: number; r: number; c: [number, number, number]; s: number }

export function applyLight(src: ImageData, dst: ImageData, preset: PresetName, lights: PointLight[]): void {
  const p = PRESETS[preset];
  const m = lightMap(preset);
  const s = src.data, d = dst.data;
  for (let k = 0, o = 0; k < W * H; k++, o += 4) {
    const q = Math.round(m[k] * 6) / 6;
    const u = q < 0 ? 0 : q > 1 ? 1 : q;
    d[o] = s[o] * q * (p.lo[0] + (p.hi[0] - p.lo[0]) * u);
    d[o + 1] = s[o + 1] * q * (p.lo[1] + (p.hi[1] - p.lo[1]) * u);
    d[o + 2] = s[o + 2] * q * (p.lo[2] + (p.hi[2] - p.lo[2]) * u);
    d[o + 3] = 255;
  }
  for (const L of lights) {
    const y0 = Math.max(0, L.y - L.r), y1 = Math.min(H - 1, L.y + L.r);
    const x0 = Math.max(0, L.x - L.r), x1 = Math.min(W - 1, L.x + L.r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dd = Math.hypot(x - L.x, y - L.y) / L.r;
      if (dd >= 1) continue;
      const gl = (Math.ceil((1 - dd) * (1 - dd) * 3) / 3) * L.s * 0.55;
      const o = (y * W + x) * 4;
      d[o] = Math.min(255, d[o] + L.c[0] * gl);
      d[o + 1] = Math.min(255, d[o + 1] + L.c[1] * gl);
      d[o + 2] = Math.min(255, d[o + 2] + L.c[2] * gl);
    }
  }
}

// ===== CCTV: 저해상도 + 초록 램프 + 노이즈 + 주사선 =====
const GREEN = [[6, 16, 10], [16, 52, 30], [40, 98, 58], [92, 158, 102], [178, 226, 170]];
export function cctvPass(src: ImageData, dst: ImageData, t: number, dark: boolean): void {
  const s = src.data, d = dst.data;
  const nr = makeRng(Math.floor(t * 8));
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    let lum = 0;
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
      const o = ((y + yy) * W + x + xx) * 4;
      lum += s[o] * 0.3 + s[o + 1] * 0.59 + s[o + 2] * 0.11;
    }
    lum /= 4 * 255;
    if (dark) lum *= 0.55;
    const vx = (x - W / 2) / (W / 2), vy = (y - H / 2) / (H / 2);
    lum *= 1 - 0.35 * (vx * vx + vy * vy);
    lum += (nr() - 0.5) * 0.06;
    const idx = Math.max(0, Math.min(4, Math.round(lum * 4.6)));
    const c = GREEN[idx];
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
      const o = ((y + yy) * W + x + xx) * 4;
      const scan = yy === 1 ? 0.78 : 1;
      d[o] = c[0] * scan; d[o + 1] = c[1] * scan; d[o + 2] = c[2] * scan; d[o + 3] = 255;
    }
  }
}
