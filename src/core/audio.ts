// 교실 소리 (Web Audio로 직접 합성). 위치에 따라 좌우로 들리고 멀수록 작다.
// 브라우저 정책상 첫 클릭·키 입력 뒤에만 소리가 난다.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** 첫 사용자 입력에서 오디오를 깨운다 */
export function unlockAudio(): void {
  const once = () => { ensure(); window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export type SoundKind = "buzz" | "cough" | "chair" | "click" | "whisper" | "page" | "tick" | "power" | "hum" | "tap" | "rain";

/** pan: -1(왼쪽)~1(오른쪽), vol: 0~1 */
/** muffled: 등 뒤에서 난 소리는 먹먹하게 (앞뒤 구분) */
export function play(kind: SoundKind, pan = 0, vol = 1, muffled = false): void {
  const ac = ensure();
  if (!ac || !master || vol <= 0.02) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  const panner = ac.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  if (muffled) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1500;
    out.connect(lp).connect(panner).connect(master);
  } else out.connect(panner).connect(master);

  const noise = (dur: number) => {
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    return src;
  };
  const env = (g: GainNode, peak: number, a: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };

  switch (kind) {
    case "buzz": {          // 스마트워치 진동: 짧게 두 번 "지잉 지잉"
      for (const off of [0, 0.22]) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = "triangle"; o.frequency.value = 160;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.08 * vol, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.15);
        o.connect(g).connect(out); o.start(t + off); o.stop(t + off + 0.16);
      }
      break;
    }
    case "rain": {          // 빗소리: 낮게 걸러진 잡음 (창가 쪽)
      const n = noise(2.2); const f = ac.createBiquadFilter(); const g = ac.createGain();
      f.type = "lowpass"; f.frequency.value = 900; env(g, 0.05 * vol, 0.4, 2.2);
      n.connect(f).connect(g).connect(out); n.start(t);
      break;
    }
    case "tap": {           // 적발: 감독관이 책상을 "톡" 두드림 (나무 소리)
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      env(g, 0.35 * vol, 0.002, 0.12);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.14);
      break;
    }
    case "cough": {         // 기침: 걸러진 잡음 두 번
      for (const off of [0, 0.18]) {
        const n = noise(0.16); const f = ac.createBiquadFilter(); const g = ac.createGain();
        f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 0.8;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.5 * vol, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.15);
        n.connect(f).connect(g).connect(out); n.start(t + off);
      }
      break;
    }
    case "chair": {         // 의자 끄는 소리: 낮게 긁힘
      const n = noise(0.35); const f = ac.createBiquadFilter(); const g = ac.createGain();
      f.type = "lowpass"; f.frequency.value = 400; env(g, 0.3 * vol, 0.05, 0.35);
      n.connect(f).connect(g).connect(out); n.start(t);
      break;
    }
    case "click": {         // 펜 딸깍
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "square"; o.frequency.value = 2400; env(g, 0.15 * vol, 0.003, 0.04);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.05);
      break;
    }
    case "whisper": {       // 귓속 이어폰에서 새는 아주 작은 말소리
      const n = noise(0.5); const f = ac.createBiquadFilter(); const g = ac.createGain();
      f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 4;
      const lfo = ac.createOscillator(); const lg = ac.createGain();
      lfo.frequency.value = 9; lg.gain.value = 0.05 * vol;
      lfo.connect(lg).connect(g.gain); env(g, 0.08 * vol, 0.05, 0.5);
      n.connect(f).connect(g).connect(out); n.start(t); lfo.start(t); lfo.stop(t + 0.5);
      break;
    }
    case "page": {          // 시험지 넘기는 소리
      const n = noise(0.18); const f = ac.createBiquadFilter(); const g = ac.createGain();
      f.type = "highpass"; f.frequency.value = 1800; env(g, 0.12 * vol, 0.02, 0.18);
      n.connect(f).connect(g).connect(out); n.start(t);
      break;
    }
    case "tick": {          // 벽시계 초침 (마지막 10분)
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "triangle"; o.frequency.value = 1300; env(g, 0.08 * vol, 0.002, 0.03);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.04);
      break;
    }
    case "hum": {           // 다리를 떨어 책상이 우웅 (무고한 학생의 진동음 미끼)
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "triangle"; o.frequency.value = 150; env(g, 0.07 * vol, 0.03, 0.4);
      const lfo = ac.createOscillator(); const lg = ac.createGain();
      lfo.frequency.value = 7; lg.gain.value = 0.03 * vol; lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.42); lfo.start(t); lfo.stop(t + 0.42);
      break;
    }
    case "power": {         // 정전: 전기가 툭 끊기는 소리
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      env(g, 0.25 * vol, 0.01, 0.45);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.5);
      break;
    }
  }
}
