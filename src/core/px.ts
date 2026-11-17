// 픽셀 그리기 도우미와 화면 상수
export const W = 480;
export const H = 270;

export type Ctx = CanvasRenderingContext2D;

/** 정수 좌표로 사각형 채우기 */
export function px(g: Ctx, x: number, y: number, w: number, h: number, col: string): void {
  g.fillStyle = col;
  g.fillRect(x | 0, y | 0, w, h);
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

export const KR = (size: number) => `${size}px "Do Hyeon", "Malgun Gothic", sans-serif`;
export const PIX = (size = 8) => `${size}px Silkscreen, Consolas, monospace`;

/** 글자 + 어두운 배경 상자 */
export function label(g: Ctx, text: string, x: number, y: number, opt: { font?: string; color?: string; bg?: string; pad?: number } = {}): number {
  g.font = opt.font ?? PIX(8);
  g.textBaseline = "top";
  const pad = opt.pad ?? 4;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = parseInt(g.font, 10) + pad + 2;
  if (opt.bg !== "none") {
    g.fillStyle = opt.bg ?? "rgba(16,22,20,0.88)";
    g.fillRect(x, y, w, h);
  }
  g.fillStyle = opt.color ?? "#e9e6da";
  g.fillText(text, x + pad, y + Math.floor(pad / 2) + 1);
  return w;
}

/** 여러 줄 한국어 문장을 폭에 맞춰 줄바꿈 */
export function wrapText(g: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (g.measureText(test).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export const COLORS = {
  bg: "#101614",
  panel: "#18211e",
  line: "#2b3732",
  chalk: "#e9e6da",
  muted: "#9aa69f",
  accent: "#f0b54a",
  alert: "#ff5a4f",
  green: "#7fd18c",
  paper: "#ece8dc",
  ink: "#3a2a20",
  navy: "#3a4a7a",
} as const;
