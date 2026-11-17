// 안경 디자인: 모양 × 색. AI 안경은 이 디자인 위에 세대별 부품을 얹는다.
import { px, type Ctx } from "../core/px";

export type GType = "metal" | "round" | "half" | "horn";
export interface GStyle {
  type: GType;
  color: string;
  name: string;
}

export const GSTYLES: GStyle[] = [
  { type: "metal", color: "#b8bcc4", name: "은테" },
  { type: "metal", color: "#7d8188", name: "건메탈 회색테" },
  { type: "round", color: "#c9a95a", name: "금색 동그란 테" },
  { type: "horn", color: "#1e1e1e", name: "검은 뿔테" },   // 1세대 AI 안경과 헷갈리는 미끼
  { type: "horn", color: "#6b4428", name: "갈색 뿔테" },
  { type: "horn", color: "#2f3e63", name: "남색 뿔테" },
  { type: "half", color: "#7d8188", name: "회색 반무테" },
  { type: "horn", color: "#d9d3c7", name: "투명테" },
];

/** 1세대 AI 안경에 어울리는 디자인 (뿔테 계열) */
export const AI1_STYLES = [GSTYLES[3], GSTYLES[4], GSTYLES[7]];
export const AI2_STYLE: GStyle = { type: "metal", color: "#3a3d42", name: "얇은 금속테" };

const partColor = (st: GStyle) => (st.color === "#d9d3c7" ? "#8a8478" : st.color);

/** 작은 학생 스프라이트용 안경 (렌즈 3×3, x는 왼쪽 렌즈 시작) */
export function drawSpriteGlasses(g: Ctx, x: number, ey: number, st: GStyle, aiGen = 0): void {
  g.fillStyle = st.color;
  for (const lx of [x, x + 5]) {
    if (st.type === "round") {
      g.fillRect(lx + 1, ey - 1, 1, 1); g.fillRect(lx + 1, ey + 1, 1, 1);
      g.fillRect(lx, ey, 1, 1); g.fillRect(lx + 2, ey, 1, 1);
    } else if (st.type === "half") {
      g.fillRect(lx, ey - 1, 3, 1);
    } else {
      g.fillRect(lx, ey - 1, 3, 1); g.fillRect(lx, ey + 1, 3, 1);
      if (st.type === "horn") g.fillRect(lx, ey - 2, 3, 1);   // 뿔테: 윗테만 두껍게
    }
  }
  g.fillRect(x + 3, ey, 2, 1);
  // 렌즈(유리): 눈 양옆을 밝게 → 가까이서 선글라스처럼 보이지 않게
  if (st.type !== "half") {
    g.fillStyle = "rgba(220,235,240,0.55)";
    for (const lx of [x, x + 5]) { g.fillRect(lx, ey, 1, 1); g.fillRect(lx + 2, ey, 1, 1); }
  }
  if (aiGen === 1) {                                           // 1세대: 두꺼운 안경다리
    g.fillStyle = partColor(st);
    g.fillRect(x - 2, ey - 1, 2, 2); g.fillRect(x + 8, ey - 1, 2, 2);
  }
}

/** 64×64 확대 얼굴용 안경 */
export function drawFaceGlasses(g: Ctx, st: GStyle): void {
  const c = st.color;
  if (st.type === "metal") {
    g.strokeStyle = c; g.lineWidth = 1;
    g.strokeRect(19.5, 25.5, 11, 8); g.strokeRect(34.5, 25.5, 11, 8);
    px(g, 31, 28, 3, 1, c); px(g, 14, 28, 6, 1, c); px(g, 46, 28, 4, 1, c);
  } else if (st.type === "round") {
    g.strokeStyle = c; g.lineWidth = 1.5;
    for (const ex of [25, 40]) { g.beginPath(); g.ellipse(ex, 29.5, 6, 5, 0, 0, Math.PI * 2); g.stroke(); }
    px(g, 31, 28, 3, 1, c); px(g, 14, 28, 5, 1, c); px(g, 46, 28, 4, 1, c);
  } else if (st.type === "half") {
    for (const x0 of [19, 34]) { px(g, x0, 25, 12, 2, c); px(g, x0, 25, 1, 5, c); px(g, x0 + 11, 25, 1, 5, c); }
    px(g, 31, 26, 3, 1, c); px(g, 14, 26, 5, 1, c); px(g, 46, 26, 4, 1, c);
  } else {
    for (const x0 of [18, 33]) {
      px(g, x0, 24, 13, 3, c); px(g, x0, 33, 13, 2, c);
      px(g, x0, 24, 2, 11, c); px(g, x0 + 11, 24, 2, 11, c);
    }
    px(g, 31, 27, 2, 2, c); px(g, 12, 27, 6, 2, c); px(g, 46, 27, 5, 2, c);
  }
}

/** 확대 얼굴에 세대별 AI 부품을 얹는다. ledOn: 촬영 중 */
export function drawFaceAiParts(g: Ctx, gen: number, st: GStyle, ledOn: boolean): void {
  const c = partColor(st);
  if (gen === 1) {
    px(g, 10, 27, 8, 3, c); px(g, 47, 27, 6, 3, c);
    px(g, 46, 22, 5, 5, c); px(g, 47, 23, 3, 3, "#1d3557"); px(g, 48, 23, 1, 1, "#9ad");
    if (ledOn) { px(g, 52, 23, 2, 2, "#ff3b30"); g.fillStyle = "rgba(255,70,50,0.35)"; g.fillRect(50, 21, 6, 6); }
    else px(g, 52, 23, 2, 2, "#5a1a16");
  } else if (gen === 2) {
    px(g, 46, 27, 5, 3, c); px(g, 47, 25, 3, 2, "#3a3a3a"); px(g, 47, 28, 1, 1, "#1d3557");
  }
  // 3·4세대: 겉으로 보이는 부품 없음
}
