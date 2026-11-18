// 1인칭 렌더러 (둠 방식): 방은 원근 다각형, 학생은 거리에 맞춰 키운 픽셀 스프라이트
import { H, W, px, type Ctx } from "../core/px";
import { ROOM_D, ROOM_W } from "../world/student";

export const F = 250;          // 초점 거리(픽셀)
export const NEAR = 0.12;
export type V3 = [number, number, number];

export interface Camera { x: number; z: number; y: number; yaw: number }

export function toCam(p: V3, cam: Camera): V3 {
  const dx = p[0] - cam.x, dz = p[2] - cam.z;
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  return [dx * c - dz * s, p[1] - cam.y, dx * s + dz * c];
}

function clipNear(poly: V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const k = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]);
    }
  }
  return out;
}

export const proj = (q: V3): [number, number] => [W / 2 + (q[0] / q[2]) * F, H / 2 - (q[1] / q[2]) * F];

export function quad(g: Ctx, cam: Camera, pts: V3[], col: string): void {
  const c = clipNear(pts.map((p) => toCam(p, cam)));
  if (c.length < 3) return;
  g.fillStyle = col;
  g.beginPath();
  c.forEach((q, i) => {
    const [x, y] = proj(q);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  });
  g.closePath();
  g.fill();
}

const onLeft = (z0: number, z1: number, y0: number, y1: number, x = 0.01): V3[] => [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]];
const onRight = (z0: number, z1: number, y0: number, y1: number, x = ROOM_W - 0.01): V3[] => [[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]];
const onBack = (x0: number, x1: number, y0: number, y1: number, z = ROOM_D - 0.01): V3[] => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
const onFront = (x0: number, x1: number, y0: number, y1: number, z = 0.01): V3[] => [[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]];

export const SPEAKER: V3 = [7.6, 2.52, ROOM_D];
export const RH = 3; // 천장 높이

/** 학교마다 다른 교실 풍경 (색·소품만, 배치·판정은 같음) */
export interface RoomLook { back: string; left: string; right: string; front: string; floorA: string; floorB: string; board: string; props: string[]; paper?: [string, string] }
const PALETTES: Record<string, Omit<RoomLook, "props" | "paper">> = {
  base:  { back: "#b9b3a1", left: "#b3ad9b", right: "#aaa492", front: "#b6b09e", floorA: "#86684a", floorB: "#7c5f43", board: "#2f4a3a" },
  green: { back: "#b9c2a1", left: "#b3bc9b", right: "#aab392", front: "#b6bf9e", floorA: "#86684a", floorB: "#7c5f43", board: "#2f4a3a" },
  sky:   { back: "#a9b8c4", left: "#a3b2be", right: "#9aa9b5", front: "#a6b5c1", floorA: "#8a7058", floorB: "#80664e", board: "#2a3f4a" },
  cream: { back: "#d2c7ad", left: "#ccc1a7", right: "#c3b89e", front: "#cfc4aa", floorA: "#7c5f43", floorB: "#725539", board: "#2f4a3a" },
  pink:  { back: "#c9b4ad", left: "#c3aea7", right: "#baa59e", front: "#c6b1aa", floorA: "#86684a", floorB: "#7c5f43", board: "#34483c" },
  fresh: { back: "#c4c4bc", left: "#bebeb6", right: "#b5b5ad", front: "#c1c1b9", floorA: "#a58a64", floorB: "#9a7f5a", board: "#2a3a44" },
};
const SCHOOL_LOOK: Record<string, [string, string[]]> = {
  한빛고: ["base", ["motto"]], 새솔고: ["green", ["plants"]], 늘봄고: ["cream", ["vase", "motto"]], 푸른숲고: ["green", ["plants", "banner"]],
  다온고: ["sky", ["clock2"]], 가람고: ["sky", ["banner"]], 해오름고: ["cream", ["vase"]], 별빛여고: ["pink", ["vase", "notice"]],
  솔뫼고: ["fresh", ["motto"]], 나래고: ["base", ["banner", "plants"]], 도담고: ["fresh", ["clock2", "notice"]], 누리고: ["pink", ["motto"]],
};
/** 21회차부터 학교 이름으로 풍경 고정 (그 전엔 늘 같은 기본 교실) */
export function lookFor(school: string, level: number): RoomLook | undefined {
  if (level < 21) return undefined;
  const [pal, props] = SCHOOL_LOOK[school] ?? ["base", []];
  return { ...PALETTES[pal], props, paper: props.includes("notice") ? ["#a8d0e8", "#f4c2c2"] : undefined };
}

/** 교실(벽·바닥·창문·칠판·사물함·스피커) */
export function drawRoom(g: Ctx, cam: Camera, look?: RoomLook): void {
  const L = look ?? { ...PALETTES.base, props: [] };
  g.fillStyle = "#c9c6ba";
  g.fillRect(0, 0, W, H);
  quad(g, cam, [[0, RH, 0], [ROOM_W, RH, 0], [ROOM_W, RH, ROOM_D], [0, RH, ROOM_D]], "#c9c6ba");
  for (let z = 2; z < ROOM_D; z += 3.5) for (const x of [2.5, 7.5])
    quad(g, cam, [[x - 0.8, RH - 0.01, z], [x + 0.8, RH - 0.01, z], [x + 0.8, RH - 0.01, z + 0.3], [x - 0.8, RH - 0.01, z + 0.3]], "#e9e7df");
  for (let z = 0, k = 0; z < ROOM_D; z += 0.45, k++)
    quad(g, cam, [[0, 0, z], [ROOM_W, 0, z], [ROOM_W, 0, z + 0.45], [0, 0, z + 0.45]], k % 2 ? L.floorA : L.floorB);
  quad(g, cam, onBack(0, ROOM_W, 0, RH, ROOM_D), L.back);
  quad(g, cam, onLeft(0, ROOM_D, 0, RH, 0), L.left);
  quad(g, cam, onRight(0, ROOM_D, 0, RH, ROOM_W), L.right);
  quad(g, cam, onFront(0, ROOM_W, 0, RH, 0), L.front);
  quad(g, cam, onBack(0, ROOM_W, 0, 0.15), "#5c4a3a");
  quad(g, cam, onLeft(0, ROOM_D, 0, 0.15), "#5c4a3a");
  quad(g, cam, onRight(0, ROOM_D, 0, 0.15), "#5c4a3a");
  quad(g, cam, onFront(0, ROOM_W, 0, 0.15), "#5c4a3a");
  // 왼쪽 창문
  for (const z0 of [1.5, 5.5, 9.5]) {
    quad(g, cam, onLeft(z0 - 0.08, z0 + 3.08, 0.92, 2.48), "#e6e2d6");
    quad(g, cam, onLeft(z0, z0 + 3, 1.0, 2.4, 0.02), "#8fbfd4");
    quad(g, cam, onLeft(z0 + 1.47, z0 + 1.53, 1.0, 2.4, 0.03), "#e6e2d6");
    quad(g, cam, onLeft(z0 + 0.2, z0 + 0.9, 2.1, 2.2, 0.03), "#d6f0fa");
  }
  // 뒷벽: 게시판, 시계, 사물함, 스피커
  quad(g, cam, onBack(0.8, 3.6, 1.1, 2.2), "#6e5a3e");
  quad(g, cam, onBack(0.9, 3.5, 1.2, 2.1, ROOM_D - 0.02), "#a88a5c");
  quad(g, cam, onBack(1.2, 1.8, 1.5, 1.9, ROOM_D - 0.03), L.paper?.[0] ?? "#f2efe6");
  quad(g, cam, onBack(2.3, 3.1, 1.4, 1.95, ROOM_D - 0.03), L.paper?.[1] ?? "#e8d27a");
  quad(g, cam, onBack(4.7, 5.3, 2.2, 2.7), "#2a2a2a");
  quad(g, cam, onBack(4.75, 5.25, 2.25, 2.65, ROOM_D - 0.02), "#f2efe6");
  for (let x = 6; x < 9.6; x += 0.6) {
    quad(g, cam, onBack(x, x + 0.56, 0.15, 1.9), "#6f7d86");
    quad(g, cam, onBack(x + 0.4, x + 0.48, 1.0, 1.1, ROOM_D - 0.02), "#cfd6da");
  }
  quad(g, cam, onBack(7.2, 8.0, 2.25, 2.8), "#3a3a3a");
  quad(g, cam, onBack(7.28, 7.92, 2.31, 2.74, ROOM_D - 0.02), "#5a5a5a");
  for (let yy = 2.36; yy < 2.72; yy += 0.08) quad(g, cam, onBack(7.32, 7.88, yy, yy + 0.03, ROOM_D - 0.03), "#2a2a2a");
  // 오른쪽 벽: 뒷문
  quad(g, cam, onRight(10.8, 12.6, 0, 2.2), "#6b4d33");
  quad(g, cam, onRight(11.0, 11.6, 1.3, 2.0, ROOM_W - 0.02), "#8fbfd4");
  // 앞벽: 칠판, 교탁
  quad(g, cam, onFront(2.2, 7.8, 0.9, 2.3), "#5a4636");
  quad(g, cam, onFront(2.3, 7.7, 1.0, 2.2, 0.02), L.board);
  quad(g, cam, onFront(3.0, 4.6, 1.8, 1.86, 0.03), "#d9d6c8");
  quad(g, cam, onFront(3.0, 5.4, 1.6, 1.66, 0.03), "#d9d6c8");
  // 교탁 (앞쪽 가운데)
  quad(g, cam, [[4.3, 0, 0.6], [5.7, 0, 0.6], [5.7, 1.05, 0.6], [4.3, 1.05, 0.6]], "#6b4d33");
  quad(g, cam, [[4.3, 1.05, 0.6], [5.7, 1.05, 0.6], [5.7, 1.05, 0.2], [4.3, 1.05, 0.2]], "#8a6644");
  // 학교별 소품
  const P = L.props;
  if (P.includes("motto")) {   // 칠판 위 급훈 액자
    quad(g, cam, onFront(4.2, 5.8, 2.35, 2.62), "#5a4636"); quad(g, cam, onFront(4.28, 5.72, 2.4, 2.57, 0.02), "#f4f2ea");
    for (const yy of [2.43, 2.48, 2.53]) quad(g, cam, onFront(4.4, 5.6, yy, yy + 0.02, 0.03), "#555");
  }
  if (P.includes("banner")) {  // 뒷벽 현수막
    quad(g, cam, onBack(0.9, 3.5, 2.35, 2.65), "#f4f2ea"); quad(g, cam, onBack(1.1, 3.3, 2.45, 2.55, ROOM_D - 0.02), "#c0504d");   // 게시판 위 (시계를 가리지 않게)
  }
  if (P.includes("clock2")) {  // 앞벽 큰 시계
    quad(g, cam, onFront(7.9, 8.4, 2.2, 2.7), "#2a2a2a"); quad(g, cam, onFront(7.95, 8.35, 2.25, 2.65, 0.02), "#f2efe6");
  }
  if (P.includes("plants")) {  // 창가 화분
    for (const z of [2.5, 6.5, 10.5]) { quad(g, cam, onLeft(z, z + 0.3, 0.9, 1.05, 0.03), "#a0613a"); quad(g, cam, onLeft(z - 0.05, z + 0.35, 1.05, 1.25, 0.04), "#4f8a4a"); }
  }
  if (P.includes("vase")) {    // 교탁 위 꽃병
    quad(g, cam, [[4.9, 1.05, 0.35], [5.1, 1.05, 0.35], [5.1, 1.3, 0.35], [4.9, 1.3, 0.35]], "#8fbfd4");
    quad(g, cam, [[4.85, 1.3, 0.35], [4.98, 1.3, 0.35], [4.98, 1.42, 0.35], [4.85, 1.42, 0.35]], "#e8a13a");
    quad(g, cam, [[5.02, 1.32, 0.35], [5.15, 1.32, 0.35], [5.15, 1.44, 0.35], [5.02, 1.44, 0.35]], "#c0504d");
  }
}

/** 감독 명부(클립보드)를 든 손 */
export function drawClipboard(g: Ctx, t: number, moving: boolean, checks = 0): void {
  const bob = moving ? Math.round(Math.sin(t * 9) * 2) : 0;
  const x = W - 96, y = H - 66 + bob;
  px(g, x, y, 62, 80, "#5a3f28");
  px(g, x + 4, y + 6, 54, 74, "#f4f2ea");
  px(g, x + 22, y - 3, 18, 8, "#9aa0a8");
  for (let i = 0; i < 8; i++) {
    px(g, x + 10, y + 16 + i * 7, 4, 4, "#9aa");
    px(g, x + 18, y + 17 + i * 7, 26 - (i % 3) * 5, 2, "#aab");
    if (i < checks) {   // 적발할 때마다 빨간 펜 체크
      const cx = x + 9, cy = y + 16 + i * 7;
      px(g, cx, cy + 2, 2, 2, "#c8322a"); px(g, cx + 2, cy + 3, 2, 2, "#c8322a"); px(g, cx + 4, cy + 1, 2, 2, "#c8322a"); px(g, cx + 6, cy - 1, 2, 2, "#c8322a");
    }
  }
  px(g, x - 6, y + 40, 16, 14, "#e0b48e");
  px(g, x - 14, y + 46, 12, 30, "#39435a");
}
