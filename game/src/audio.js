/* GOLDEN HOUR — Fjord Mail Run · audio.js
 * WebAudio synthesis only: engine drone, wind, ring chimes, landing fanfare.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
/* ---------- audio (WebAudio synth, no files) ---------- */
const audio = { ctx: null, master: null, eng: null, engGain: null, wind: null, windGain: null, started: false };
function initAudio() {
  if (audio.started) { if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain(); audio.master.gain.value = G.muted ? 0 : 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.eng = audio.ctx.createOscillator(); audio.eng.type = 'sawtooth'; audio.eng.frequency.value = 70;
    const sub = audio.ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 35;
    const lp = audio.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    audio.engGain = audio.ctx.createGain(); audio.engGain.gain.value = 0.0;
    audio.eng.connect(lp); sub.connect(lp); lp.connect(audio.engGain); audio.engGain.connect(audio.master);
    audio.eng.start(); sub.start(); audio.sub = sub;
    const len = audio.ctx.sampleRate * 2;
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = audio.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = audio.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    audio.windGain = audio.ctx.createGain(); audio.windGain.gain.value = 0.0;
    src.connect(bp); bp.connect(audio.windGain); audio.windGain.connect(audio.master);
    src.start();
    audio.started = true;
  } catch (e) { /* audio unavailable: game still plays */ }
}
function beep(freq, dur, type, vol, when) {
  if (!audio.started || G.muted) return;
  const t0 = audio.ctx.currentTime + (when || 0);
  const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.25, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(audio.master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(name) {
  if (!audio.started || G.muted) return;
  if (name === 'ring') { beep(880, 0.18, 'sine', 0.3); beep(1318, 0.28, 'sine', 0.25, 0.09); }
  if (name === 'perfect') { beep(880, 0.15, 'sine', 0.3); beep(1108, 0.15, 'sine', 0.3, 0.08); beep(1318, 0.3, 'sine', 0.3, 0.16); }
  if (name === 'crash') { beep(90, 0.5, 'sawtooth', 0.4); beep(55, 0.7, 'sine', 0.4, 0.05); }
  if (name === 'land') { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.25, 'triangle', 0.28, i * 0.1)); }
  if (name === 'warn') { beep(440, 0.12, 'square', 0.12); }
}
function updateAudio() {
  if (!audio.started) return;
  const th = G.throttle;
  audio.eng.frequency.value = 55 + th * 90;
  audio.sub.frequency.value = 28 + th * 45;
  audio.engGain.gain.value = G.state === 'flying' ? 0.05 + th * 0.06 : 0.0;
  audio.windGain.gain.value = G.state === 'flying' ? clamp((G.speed - 30) / 120, 0, 0.12) : 0.0;
}
