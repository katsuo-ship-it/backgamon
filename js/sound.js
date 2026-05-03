// 効果音モジュール。
// 同梱フリー音源 (assets/sounds/*.mp3) を遅延ロードする。
// ファイルが見つからない場合は Web Audio API でビープ音を合成して代替する。

const SOUND_FILES = {
  dice:        "assets/sounds/dice.mp3",
  place:       "assets/sounds/place.mp3",
  hit:         "assets/sounds/hit.mp3",
  win:         "assets/sounds/win.mp3",
  gammon:     "assets/sounds/gammon.mp3",
  backgammon: "assets/sounds/backgammon.mp3",
  bearoff:    "assets/sounds/bearoff.mp3",
};

const buffers = {};
let audioCtx = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = !!on; }
export function isSoundEnabled() { return enabled; }

function ensureCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  return audioCtx;
}

export async function preloadSounds() {
  const ctx = ensureCtx();
  if (!ctx) return;
  await Promise.all(
    Object.entries(SOUND_FILES).map(async ([key, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        buffers[key] = await ctx.decodeAudioData(arr);
      } catch (e) {
        // 無視: ファイルが無いだけ。フォールバックで合成音を使う
      }
    })
  );
}

function playBuffer(buf, gain = 0.7) {
  const ctx = ensureCtx();
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start();
}

// 合成フォールバック (シンプルな短音)
function synth(type) {
  const ctx = ensureCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  let freq = 440, dur = 0.15, vol = 0.18, wave = "sine";
  switch (type) {
    case "dice":       freq = 220; dur = 0.25; wave = "square"; break;
    case "place":      freq = 320; dur = 0.08; wave = "triangle"; break;
    case "hit":        freq = 140; dur = 0.4;  wave = "sawtooth"; vol = 0.25; break;
    case "win":        freq = 660; dur = 0.5;  wave = "triangle"; break;
    case "gammon":     freq = 880; dur = 0.7;  wave = "triangle"; break;
    case "backgammon": freq = 1100; dur = 0.9; wave = "triangle"; break;
    case "bearoff":    freq = 520; dur = 0.18; wave = "sine"; break;
  }
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, now);
  if (type === "win" || type === "gammon" || type === "backgammon") {
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + dur * 0.7);
  }
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

export function play(name) {
  if (!enabled) return;
  const ctx = ensureCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
  if (buffers[name]) playBuffer(buffers[name]);
  else synth(name);
}

// ==== 環境音楽 (アンビエント) ====
// Web Audio で生成する低音のドローン + 微かなパッド。アセット不要。
let ambient = null;
export function startAmbient() {
  const ctx = ensureCtx();
  if (!ctx) return;
  if (ambient) return;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.04;
  masterGain.connect(ctx.destination);

  // ベースドローン (低音)
  const drone = ctx.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 65.41; // C2
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.6;
  drone.connect(droneGain).connect(masterGain);

  // 上声部 (5 度上)
  const drone2 = ctx.createOscillator();
  drone2.type = "sine";
  drone2.frequency.value = 98.00; // G2
  const drone2Gain = ctx.createGain();
  drone2Gain.gain.value = 0.35;
  drone2.connect(drone2Gain).connect(masterGain);

  // パッド: ゆっくり LFO で振幅変調
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain).connect(droneGain.gain);

  // 高音きらめき (時々鳴る短い倍音)
  const highOsc = ctx.createOscillator();
  highOsc.type = "triangle";
  highOsc.frequency.value = 523.25; // C5
  const highGain = ctx.createGain();
  highGain.gain.value = 0;
  highOsc.connect(highGain).connect(masterGain);

  drone.start();
  drone2.start();
  lfo.start();
  highOsc.start();

  // たまに高音を点滅
  const sparkleTimer = setInterval(() => {
    const now = ctx.currentTime;
    highGain.gain.cancelScheduledValues(now);
    highGain.gain.setValueAtTime(0, now);
    highGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
    highGain.gain.linearRampToValueAtTime(0, now + 2.5);
  }, 8000);

  ambient = { drone, drone2, lfo, highOsc, masterGain, sparkleTimer };
}

export function stopAmbient() {
  if (!ambient) return;
  try {
    clearInterval(ambient.sparkleTimer);
    const ctx = ensureCtx();
    const now = ctx.currentTime;
    ambient.masterGain.gain.cancelScheduledValues(now);
    ambient.masterGain.gain.setValueAtTime(ambient.masterGain.gain.value, now);
    ambient.masterGain.gain.linearRampToValueAtTime(0, now + 1.0);
    ambient.drone.stop(now + 1.1);
    ambient.drone2.stop(now + 1.1);
    ambient.lfo.stop(now + 1.1);
    ambient.highOsc.stop(now + 1.1);
  } catch (e) { /* ignore */ }
  ambient = null;
}

export function setAmbientEnabled(on) {
  if (on) startAmbient();
  else stopAmbient();
}
