// CCTV용 위에서 본 교실. 교실 뒤 천장 카메라 → 화면 아래가 교실 앞(교탁)
import { W, px, type Ctx } from "../core/px";
import { ROOM_D, ROOM_W } from "../world/student";

/** 월드 좌표(m) → 화면 좌표 */
export const tdX = (x: number) => 40 + (x / ROOM_W) * 400;
export const tdY = (z: number) => 250 - (z / ROOM_D) * 205;

export function drawTopRoom(g: Ctx): void {
  // 바닥
  for (let y = 40; y < 270; y += 6) {
    px(g, 0, y, W, 6, Math.floor(y / 6) % 2 ? "#86684a" : "#7c5f43");
    for (let x = (y * 7) % 40; x < W; x += 40) px(g, x, y, 1, 6, "#6a5039");
  }
  // 뒷벽 (위)
  px(g, 0, 0, W, 40, "#b9b3a1"); px(g, 0, 36, W, 4, "#5c4a3a");
  for (let x = 300; x < 440; x += 14) { px(g, x, 8, 12, 26, "#6f7d86"); px(g, x + 8, 20, 2, 2, "#cfd6da"); }
  px(g, 60, 10, 90, 22, "#6e5a3e"); px(g, 64, 13, 82, 16, "#a88a5c");
  px(g, 220, 10, 14, 14, "#2a2a2a"); px(g, 221, 11, 12, 12, "#f2efe6");
  // 왼쪽 창문 벽
  px(g, 0, 40, 30, 230, "#b3ad9b");
  for (const z0 of [1.5, 5.5, 9.5]) { const y1 = tdY(z0 + 3), y0 = tdY(z0); px(g, 4, y1, 22, y0 - y1, "#e6e2d6"); px(g, 7, y1 + 3, 16, y0 - y1 - 6, "#8fbfd4"); }
  // 오른쪽 벽 + 뒷문
  px(g, 450, 40, 30, 230, "#aaa492");
  px(g, 452, tdY(12.6), 10, tdY(10.8) - tdY(12.6), "#6b4d33");
  // 앞: 교탁 (아래)
  px(g, tdX(4.3), tdY(0.6), tdX(5.7) - tdX(4.3), 10, "#6b4d33");
}

/** 감독관 (위에서 본 모습) */
export function drawTopTeacher(g: Ctx, x: number, z: number, yaw: number): void {
  const sx = tdX(x), sy = tdY(z);
  px(g, sx - 6, sy - 5, 12, 10, "#39435a");
  px(g, sx - 4, sy - 4, 8, 8, "#2a2420");
  // 보는 방향 (월드 +z = 화면 위)
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (let k = 6; k < 16; k += 2) px(g, sx + fx * k, sy - fz * k, 2, 2, "#f0b54a");
}
