/* GOLDEN HOUR — Fjord Mail Run
 * An original arcade flight game. Chase view over a fjord valley at sunset.
 * Fly the last mail plane of the day through glowing delivery rings and land
 * on the mountain airstrip before dark. 3 legs, 12 rings per leg, fuel,
 * weather fronts, day -> dusk lighting. No network, no external assets:
 * all art is procedural canvas drawing, all sound is WebAudio synthesis.
 * Controls: arrows / WASD steer, Shift/W throttle up, Ctrl/S throttle down,
 * mouse steer, P pause, M mute, Enter start, R restart.
 * Deterministic demo shots for screenshots: ?shot=title|ring|runway|complete
 */
'use strict';

const W = 1280, H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/* ---------- utils ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmt(n, d) { return n.toFixed(d === undefined ? 0 : d); }

/* ---------- input ---------- */
const keys = {};
let mouseX = null, mouseActive = false;
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true; keys[e.key] = true;
  initAudio();
  handleKey(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; keys[e.key] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) / r.width * W; mouseActive = true;
});
canvas.addEventListener('mouseleave', () => { mouseActive = false; });
canvas.addEventListener('mousedown', () => { initAudio(); handleKey('Enter'); });

function handleKey(k) {
  if (k === 'Enter' || k === ' ') {
    if (G.state === 'title') startGame();
    else if (G.state === 'legcomplete') nextLeg();
    else if (G.state === 'gameover' || G.state === 'complete') startGame();
  }
  if (k === 'p' || k === 'P') {
    if (G.state === 'flying') G.state = 'paused';
    else if (G.state === 'paused') G.state = 'flying';
  }
  if (k === 'm' || k === 'M') { G.muted = !G.muted; if (audio.master) audio.master.gain.value = G.muted ? 0 : 0.5; }
  if (k === 'r' || k === 'R') { if (G.state !== 'title') startGame(); }
}

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

/* ---------- game state ---------- */
const LEGS = [
  { name: 'LEG 1 — RIVER VALLEY', sky: ['#1b2350', '#e8734a', '#f7b733'], sunY: 300, wind: 0,  rings: 12, length: 5600 },
  { name: 'LEG 2 — CROSSWIND PASS', sky: ['#241a4d', '#d95b43', '#f08a2e'], sunY: 330, wind: 6,  rings: 12, length: 6200 },
  { name: 'LEG 3 — DUSK RIDGE', sky: ['#120f33', '#8f3d5e', '#e0653a'], sunY: 355, wind: -8, rings: 12, length: 6800 },
];
const G = {
  state: 'title', // title | flying | paused | legcomplete | crashed | gameover | complete
  leg: 0, score: 0, lives: 3, fuel: 100,
  x: 0, y: 150, z: 0, heading: 0, roll: 0, pitch: 0,
  speed: 62, throttle: 0.62, vspeed: 0,
  ringsHit: 0, ringTotal: 12, time: 0, legTime: 0,
  msg: '', msgT: 0, shake: 0, muted: false,
  particles: [], birds: [], legStartScore: 0,
  autopilot: false, demoShot: null,
  camX: 0, camY: 150,
};
let world = null; // { rings, peaks, trees, clouds, runwayZ, balloons, riverPts }

/* ---------- world generation (seeded, deterministic per leg) ---------- */
function genWorld(legIdx) {
  const leg = LEGS[legIdx];
  const rnd = mulberry32(20261126 + legIdx * 7919);
  const rings = [];
  let rx = 0;
  for (let i = 0; i < leg.rings; i++) {
    rx += (rnd() - 0.5) * 260;
    rx = clamp(rx, -320, 320);
    rings.push({
      z: 600 + i * ((leg.length - 900) / leg.rings),
      x: rx, y: 120 + rnd() * 160, r: 42,
      passed: false, hue: i % 3,
    });
  }
  const peaks = [];
  for (let i = 0; i < 90; i++) {
    const side = rnd() > 0.5 ? 1 : -1;
    peaks.push({
      z: 300 + i * 85 + rnd() * 40,
      x: side * (340 + rnd() * 620),
      h: 120 + rnd() * 260, w: 180 + rnd() * 260,
      snow: rnd() > 0.45,
    });
  }
  // a few near-valley peaks the player must avoid (tall, inside the corridor)
  // never block the final approach corridor to the runway
  const runwayX0 = rings[rings.length - 1].x * 0.4;
  const hazards = [];
  for (let i = 0; i < 7; i++) {
    const hz = {
      z: 900 + i * 800 + rnd() * 300,
      x: (rnd() - 0.5) * 560,
      h: 150 + rnd() * 120, w: 120 + rnd() * 80,
    };
    if (hz.z > leg.length - 900 && Math.abs(hz.x - runwayX0) < 100) continue;
    hazards.push(hz);
  }
  const trees = [];
  for (let i = 0; i < 160; i++) {
    trees.push({ z: 200 + rnd() * leg.length, x: (rnd() - 0.5) * 640, s: 0.7 + rnd() * 0.9 });
  }
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({ z: rnd() * 7000, x: (rnd() - 0.5) * 1600, y: 260 + rnd() * 190, s: 0.8 + rnd() * 1.6, a: 0.5 + rnd() * 0.4 });
  }
  const balloons = [];
  for (let i = 0; i < 5; i++) {
    balloons.push({ z: 1400 + i * 1100 + rnd() * 400, x: (rnd() - 0.5) * 420, y: 170 + rnd() * 130, hit: false });
  }
  // river centre line (winding sine, so it reads as a river, not a road)
  const river = [];
  for (let z = 0; z <= leg.length + 1500; z += 150) river.push({ z, x: Math.sin(z * 0.0006) * 210 });
  return {
    rings, peaks, hazards, trees, clouds, balloons, river,
    runwayZ: leg.length, runwayX: rings[rings.length - 1].x * 0.4,
  };
}
function riverX(z) {
  if (!world) return 0;
  const pts = world.river;
  const i = clamp(Math.floor(z / 150), 0, pts.length - 2);
  const t = (z - pts[i].z) / 150;
  return lerp(pts[i].x, pts[i + 1].x, t);
}

/* ---------- flow ---------- */
function startGame() {
  G.leg = 0; G.score = 0; G.lives = 3; G.fuel = 100; G.time = 0;
  loadLeg(0);
  G.state = 'flying';
  showMsg('LEG 1 — RIVER VALLEY · FLY THE RINGS', 3);
}
function loadLeg(i) {
  G.leg = i; world = genWorld(i);
  G.x = 0; G.y = 150; G.z = 0; G.heading = 0; G.roll = 0; G.pitch = 0;
  G.speed = 62; G.throttle = 0.62; G.vspeed = 0;
  G.ringsHit = 0; G.ringTotal = LEGS[i].rings; G.legTime = 0; G.fuel = Math.max(G.fuel, 70);
  G.particles = []; G.legStartScore = G.score;
  G.birds = [];
  for (let b = 0; b < 6; b++) G.birds.push({ z: 500 + b * 900, x: (Math.random() - 0.5) * 500, y: 190 + Math.random() * 120, ph: Math.random() * 6 });
}
function nextLeg() {
  if (G.leg + 1 >= LEGS.length) { G.state = 'complete'; sfx('land'); return; }
  loadLeg(G.leg + 1);
  G.state = 'flying';
  showMsg(LEGS[G.leg].name + ' · FLY THE RINGS', 3);
}
function showMsg(t, dur) { G.msg = t; G.msgT = dur || 2.2; }
function crash(reason) {
  if (G.state !== 'flying') return;
  G.state = 'crashed'; G.shake = 14; sfx('crash');
  spawnBurst(40, '#ff8833');
  G.lives--;
  showMsg(reason, 2.5);
  setTimeout(() => {
    if (G.lives <= 0) { G.state = 'gameover'; }
    else {
      // respawn at last ring
      const idx = world.rings.findIndex(r => !r.passed);
      const rz = idx <= 0 ? 0 : world.rings[idx - 1].z - 250;
      G.z = Math.max(0, rz); G.x = 0; G.y = 150; G.heading = 0; G.roll = 0; G.pitch = 0;
      G.speed = 62; G.fuel = Math.max(G.fuel, 55); G.state = 'flying';
      showMsg('BACK IN THE AIR · ' + G.lives + (G.lives === 1 ? ' LIFE' : ' LIVES') + ' LEFT', 2.5);
    }
  }, 1600);
}
function spawnBurst(n, color) {
  // screen-space burst at the plane
  const ps = planeScreen();
  for (let i = 0; i < n; i++) {
    G.particles.push({ x: ps.x + (Math.random() - 0.5) * 60, y: ps.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.6 + Math.random() * 0.7, color, s: 2 + Math.random() * 4 });
  }
}
function ringBurst(ring) {
  // screen-space golden burst around the plane when a ring is flown
  const ps = planeScreen();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    G.particles.push({ x: ps.x + Math.cos(a) * 55, y: ps.y + Math.sin(a) * 55, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.8, color: '#ffd76a', s: 3 });
  }
}

/* ---------- update ---------- */
function update(dt) {
  if (G.state !== 'flying') return;
  const leg = LEGS[G.leg];
  G.time += dt; G.legTime += dt;
  if (G.msgT > 0) G.msgT -= dt;

  // --- steering ---
  let steer = 0, pitchIn = 0, thrIn = 0;
  if (keys['arrowleft'] || keys['a']) steer -= 1;
  if (keys['arrowright'] || keys['d']) steer += 1;
  if (keys['arrowup'] || keys['w']) pitchIn += 1;
  if (keys['arrowdown'] || keys['s']) pitchIn -= 1;
  if (keys['shift']) thrIn += 1;
  if (keys['control']) thrIn -= 1;
  if (mouseActive && mouseX !== null && !G.autopilot) {
    steer += clamp((mouseX - W / 2) / 260, -1, 1) * 1.4;
  }
  if (G.autopilot) {
    // PD steering: chase the target line and cancel heading error, so the
    // plane does not slalom past the rings. On final, ride a glide slope.
    let target = nextRing();
    if (!target) target = { x: world.runwayX, y: clamp((world.runwayZ - G.z) * 0.10, 25, 120) };
    const dx = target.x - G.x, dy = target.y - G.y;
    steer = clamp(dx / 160 - G.heading * 1.5, -1, 1);
    pitchIn = clamp(dy / 90, -1, 1);
    thrIn = 0;
  }
  steer = clamp(steer, -1.4, 1.4);
  const targetRoll = steer * 0.85;
  G.roll += (targetRoll - G.roll) * Math.min(1, dt * 5);
  G.heading += G.roll * 0.55 * dt * (G.speed / 62);
  G.x += Math.sin(G.heading) * G.speed * dt;
  G.x += leg.wind * 0.35 * dt; // crosswind drift
  G.x = clamp(G.x, -420, 420);

  // --- pitch / altitude ---
  const targetPitch = clamp(pitchIn * 0.5, -0.5, 0.5);
  G.pitch += (targetPitch - G.pitch) * Math.min(1, dt * 3.5);
  G.vspeed = G.pitch * G.speed * 0.9; // pitch up (ArrowUp) = climb
  G.y += G.vspeed * dt;
  G.y = clamp(G.y, 12, 420);

  // --- throttle / speed ---
  G.throttle = clamp(G.throttle + thrIn * dt * 0.4, 0.25, 1);
  const targetSpeed = 34 + G.throttle * 62;
  G.speed += (targetSpeed - G.speed) * Math.min(1, dt * 0.8);
  G.z += G.speed * dt;

  // --- fuel (a clean leg costs ~60%, rings top it back up) ---
  G.fuel -= dt * (0.35 + G.throttle * 0.6);
  if (G.fuel < 25 && Math.floor(G.time * 2) !== Math.floor((G.time - dt) * 2)) sfx('warn');
  if (G.fuel <= 0) { G.fuel = 0; crash('OUT OF FUEL'); return; }

  // --- rings ---
  for (const r of world.rings) {
    if (r.passed) continue;
    if (G.z >= r.z - 6 && G.z <= r.z + 30) {
      const dx = G.x - r.x, dy = G.y - r.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r.r) {
        r.passed = true; G.ringsHit++;
        const perfect = d < r.r * 0.45;
        G.score += perfect ? 150 : 100;
        G.fuel = Math.min(100, G.fuel + 6);
        ringBurst(r);
        sfx(perfect ? 'perfect' : 'ring');
        showMsg(perfect ? 'PERFECT RING  +' + 150 : 'RING ' + G.ringsHit + '/' + G.ringTotal + '  +100', 1.4);
      }
    } else if (G.z > r.z + 30 && !r.passed) {
      r.passed = true; // missed: mark so it is not retried
      showMsg('RING MISSED', 1.2);
    }
  }

  // --- hazards: peaks & balloons ---
  for (const hz of world.hazards) {
    if (Math.abs(G.z - hz.z) < 14 && Math.abs(G.x - hz.x) < hz.w * 0.5 && G.y < hz.h) {
      crash('CLIPPED A PEAK'); return;
    }
  }
  for (const b of world.balloons) {
    if (!b.hit && Math.abs(G.z - b.z) < 16 && Math.abs(G.x - b.x) < 26 && Math.abs(G.y - b.y) < 30) {
      b.hit = true; crash('HIT A BALLOON'); return;
    }
  }
  // terrain floor
  if (G.y <= 12 && G.z < world.runwayZ - 120) { crash('TOO LOW — VALLEY FLOOR'); return; }

  // --- runway / landing ---
  if (G.z >= world.runwayZ - 120) {
    const dx = G.x - world.runwayX;
    if (G.z >= world.runwayZ - 8 && G.z <= world.runwayZ + 90) {
      if (Math.abs(dx) < 60 && G.y < 55 && Math.abs(G.vspeed) < 26) {
        // landed!
        const timeBonus = Math.max(0, Math.round(600 - G.legTime * 2));
        const fuelBonus = Math.round(G.fuel * 3);
        G.score += 500 + timeBonus + fuelBonus;
        G.state = 'legcomplete'; sfx('land');
        G.legScore = { rings: G.ringsHit, time: G.legTime, timeBonus, fuelBonus };
        return;
      }
      if (G.z > world.runwayZ + 90) { crash('OVERSHOT THE AIRSTRIP'); return; }
    }
  }
  if (G.z > world.runwayZ + 90 && G.state === 'flying') { crash('OVERSHOT THE AIRSTRIP'); return; }

  // --- particles & birds ---
  for (const p of G.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const b of G.birds) { b.z -= (G.speed * 0.35) * dt; b.ph += dt * 6; if (b.z < G.z - 100) { b.z = G.z + 2500; b.x = (Math.random() - 0.5) * 500; } }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  updateAudio();
}
function nextRing() {
  for (const r of world.rings) if (!r.passed && r.z > G.z) return r;
  return null;
}

/* ---------- rendering ---------- */
const F = 620; // focal length (px)
function horizonY() { return 305 + G.pitch * 380; }
function proj(x, y, z) {
  const dz = z - G.z;
  if (dz < 8) return null;
  const lx = (x - G.x) - Math.sin(G.heading) * dz;
  return {
    x: W / 2 + lx * F / dz,
    y: horizonY() + (G.y - y) * F / dz,
    s: F / dz, dz,
  };
}
function planeScreen() { return { x: W / 2 - G.roll * 26, y: 556 + G.pitch * 90 }; }

function render() {
  const leg = LEGS[G.leg];
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  /* --- sky --- */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, leg.sky[0]); sky.addColorStop(0.55, leg.sky[1]); sky.addColorStop(0.78, leg.sky[2]); sky.addColorStop(1, '#2a1a2e');
  ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40);
  const hz = horizonY();

  /* --- world layer (rolls with the plane) --- */
  ctx.save();
  ctx.translate(W / 2, H * 0.55); ctx.rotate(-G.roll * 0.22); ctx.translate(-W / 2, -H * 0.55);

  /* far mountains (side ridges, far -> near) */
  const peaks = (world ? world.peaks : []).slice().sort((a, b) => b.z - a.z);
  for (const p of peaks) {
    const base = proj(p.x, 0, p.z); if (!base || base.dz > 5200) continue;
    const apex = proj(p.x, p.h, p.z); if (!apex) continue;
    const hw = p.w * base.s / 2;
    const near = clamp(1 - base.dz / 5200, 0, 1);
    const col = 'rgb(' + Math.round(lerp(96, 52, near)) + ',' + Math.round(lerp(74, 44, near)) + ',' + Math.round(lerp(120, 74, near)) + ')';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(base.x - hw, base.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base.x + hw, base.y); ctx.closePath(); ctx.fill();
    if (p.snow) {
      ctx.fillStyle = 'rgba(255,244,230,0.9)';
      ctx.beginPath(); ctx.moveTo(apex.x - hw * 0.24, apex.y + (base.y - apex.y) * 0.24); ctx.lineTo(apex.x, apex.y); ctx.lineTo(apex.x + hw * 0.24, apex.y + (base.y - apex.y) * 0.24); ctx.closePath(); ctx.fill();
    }
  }

  /* clouds */
  for (const c of (world ? world.clouds : [])) {
    const p = proj(c.x, c.y, c.z); if (!p || p.dz > 6000) continue;
    const w = 150 * c.s * p.s, h = 14 * c.s * p.s;
    ctx.fillStyle = 'rgba(255,214,180,' + (c.a * 0.38) + ')';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, w, h, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,220,' + (c.a * 0.5) + ')';
    ctx.beginPath(); ctx.ellipse(p.x - w * 0.25, p.y - h * 0.4, w * 0.55, h * 0.75, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x + w * 0.3, p.y - h * 0.25, w * 0.45, h * 0.6, 0, 0, 7); ctx.fill();
  }

  /* sun + glow (drawn after clouds so the disc stays visible) */
  const sunX = W * 0.66 - Math.sin(G.heading) * 260, sunY = leg.sunY - G.pitch * 160;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
  glow.addColorStop(0, 'rgba(255,214,120,0.95)'); glow.addColorStop(0.25, 'rgba(255,170,80,0.55)'); glow.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, 260, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, 7); ctx.fill();

  /* ground */
  const gnd = ctx.createLinearGradient(0, hz, 0, H);
  gnd.addColorStop(0, '#4a3a28'); gnd.addColorStop(0.35, '#3d4a26'); gnd.addColorStop(1, '#1e2b18');
  ctx.fillStyle = gnd; ctx.fillRect(-30, hz, W + 60, H - hz + 30);

  /* river (blue fjord water with a warm sun streak, narrower + more winding) */
  if (world) {
    ctx.beginPath();
    let started = false;
    for (let z = Math.max(60, G.z + 40); z < G.z + 3000; z += 110) {
      const cx = riverX(z), wdt = 28;
      const a = proj(cx - wdt, 0, z), b = proj(cx + wdt, 0, z);
      if (!a || !b) continue;
      if (!started) { ctx.moveTo(a.x, a.y); started = true; }
      ctx.lineTo(a.x, a.y);
    }
    for (let z = G.z + 2990; z >= Math.max(60, G.z + 40); z -= 110) {
      const cx = riverX(z), wdt = 28;
      const b = proj(cx + wdt, 0, z); if (!b) continue;
      ctx.lineTo(b.x, b.y);
    }
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, hz, 0, H);
    rg.addColorStop(0, '#4a7d9e'); rg.addColorStop(0.5, '#33648a'); rg.addColorStop(1, '#1e4258');
    ctx.fillStyle = rg; ctx.fill();
    /* sun streak on the river */
    ctx.strokeStyle = 'rgba(255,220,140,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let z = Math.max(60, G.z + 40); z < G.z + 1600; z += 110) {
      const p = proj(riverX(z) + 8, 0, z); if (!p) continue;
      if (z === Math.max(60, G.z + 40)) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    /* road */
    ctx.strokeStyle = 'rgba(46,40,36,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let z = Math.max(60, G.z + 40); z < G.z + 2600; z += 130) {
      const p = proj(riverX(z) + 230, 0, z); if (!p) continue;
      if (z === Math.max(60, G.z + 40)) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /* trees */
  for (const t of (world ? world.trees : [])) {
    const p = proj(t.x, 0, t.z); if (!p || p.dz > 2600 || p.dz < 120) continue;
    const s = 20 * t.s * p.s;
    ctx.fillStyle = '#1e3316';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x - s * 0.45, p.y); ctx.lineTo(p.x + s * 0.45, p.y); ctx.closePath(); ctx.fill();
  }

  /* hazard peaks (rocky, red beacon) — fade out when very close to the camera */
  for (const hz2 of (world ? world.hazards : [])) {
    const base = proj(hz2.x, 0, hz2.z); if (!base || base.dz > 2600 || base.dz < 160) continue;
    const apex = proj(hz2.x, hz2.h, hz2.z); if (!apex) continue;
    const hw = hz2.w * base.s / 2;
    const pg = ctx.createLinearGradient(apex.x, apex.y, base.x, base.y);
    pg.addColorStop(0, '#6b4530'); pg.addColorStop(1, '#2e211a');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(base.x - hw, base.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base.x + hw, base.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a5238';
    ctx.beginPath(); ctx.moveTo(base.x - hw * 0.6, base.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base.x + hw * 0.2, base.y); ctx.closePath(); ctx.fill();
    if (Math.floor(G.time * 2) % 2 === 0) {
      ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(apex.x, apex.y - 4, 5, 0, 7); ctx.fill();
    }
  }

  /* balloons */
  for (const b of (world ? world.balloons : [])) {
    if (b.hit) continue;
    const p = proj(b.x, b.y, b.z); if (!p || p.dz > 2400 || p.dz < 20) continue;
    const r = 26 * p.s;
    ctx.fillStyle = '#e84a5f';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a2a20'; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - r * 0.28, p.y + r * 0.95, r * 0.56, r * 0.5);
  }

  /* birds */
  ctx.strokeStyle = 'rgba(30,20,30,0.8)'; ctx.lineWidth = 2;
  for (const b of G.birds) {
    const p = proj(b.x, b.y, b.z); if (!p || p.dz > 1800 || p.dz < 30) continue;
    const s = 14 * p.s, f2 = Math.sin(b.ph) * 4 * p.s;
    ctx.beginPath();
    ctx.moveTo(p.x - s, p.y - f2); ctx.quadraticCurveTo(p.x, p.y + f2, p.x + s, p.y - f2);
    ctx.stroke();
  }

  /* rings (far -> near); distant rings fade so the next one reads clearly */
  if (world) {
    const rs = world.rings.slice().sort((a, b) => b.z - a.z);
    for (const r of rs) {
      if (r.passed) continue;
      const p = proj(r.x, r.y, r.z); if (!p || p.dz < 24 || p.dz > 2600) continue;
      const rr = r.r * p.s;
      if (rr < 3) continue;
      const col = ['#ffd76a', '#5fe8d8', '#ff7ad9'][r.hue];
      ctx.save();
      ctx.globalAlpha = clamp(1.25 - p.dz / 1400, 0.10, 1);
      ctx.shadowColor = col; ctx.shadowBlur = 22;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2.5, rr * 0.09);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = clamp(1.25 - p.dz / 1400, 0.10, 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.82, 0, 7); ctx.stroke();
      ctx.restore();
      /* chevrons above the next ring */
      if (r === nextRing()) {
        ctx.fillStyle = col;
        const cy = p.y - rr - 26;
        ctx.beginPath(); ctx.moveTo(p.x - 12, cy); ctx.lineTo(p.x + 12, cy); ctx.lineTo(p.x, cy + 12); ctx.closePath(); ctx.fill();
      }
    }
  }

  /* runway */
  if (world) {
    const rz = world.runwayZ, rx = world.runwayX;
    const n1 = proj(rx - 30, 0, rz + 60), n2 = proj(rx + 30, 0, rz + 60);
    const f1 = proj(rx - 30, 0, rz - 300), f2 = proj(rx + 30, 0, rz - 300);
    if (n1 && n2 && f1 && f2) {
      ctx.fillStyle = '#262a33';
      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(f1.x, f1.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(f1.x, f1.y); ctx.moveTo(n2.x, n2.y); ctx.lineTo(f2.x, f2.y); ctx.stroke();
      /* centre dashes */
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 3;
      for (let z = rz - 260; z < rz + 40; z += 60) {
        const a = proj(rx, 0, z), b = proj(rx, 0, z + 26);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      /* edge lights */
      for (let z = rz - 300; z <= rz + 60; z += 45) {
        for (const sx of [-30, 30]) {
          const p = proj(rx + sx, 0, z); if (!p) continue;
          ctx.fillStyle = '#ffb347';
          ctx.save(); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); ctx.restore();
        }
      }
      /* threshold + number (only when close, so it never floats over far shots) */
      const tp = proj(rx, 0, rz - 280);
      if (tp && rz - G.z < 1500) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('27', tp.x, tp.y - 14);
      }
    }
  }

  /* plane (chase view) */
  drawPlane();

  /* particles (screen space) */
  for (const p of G.particles) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* speed streaks */
  if (G.state === 'flying' && G.speed > 78) {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const yy = ((i * 137 + G.time * 900) % 720);
      ctx.beginPath(); ctx.moveTo(8, yy); ctx.lineTo(8 + 46, yy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 8, yy); ctx.lineTo(W - 54, yy + 8); ctx.stroke();
    }
  }
  ctx.restore(); // end roll

  /* vignette */
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,20,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  drawHUD();
  drawOverlays();
  ctx.restore();
}

/* ---------- plane (procedural chase-view bush plane) ---------- */
function drawPlane() {
  const p = planeScreen();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(G.roll * 0.9);
  ctx.scale(1, 1 - Math.abs(G.pitch) * 0.12);
  /* soft shadow glow under plane */
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 64, 120, 16, 0, 0, 7); ctx.fill();
  /* wings */
  const wingGrad = ctx.createLinearGradient(0, -16, 0, 12);
  wingGrad.addColorStop(0, '#ffe9b8'); wingGrad.addColorStop(0.5, '#f2b25c'); wingGrad.addColorStop(1, '#c97a2e');
  ctx.fillStyle = wingGrad;
  ctx.beginPath(); // left wing
  ctx.moveTo(-12, -4); ctx.lineTo(-170, -26); ctx.lineTo(-174, -8); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); // right wing
  ctx.moveTo(12, -4); ctx.lineTo(170, -26); ctx.lineTo(174, -8); ctx.lineTo(12, 10); ctx.closePath(); ctx.fill();
  /* wingtip nav lights */
  ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(-172, -17, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#34e07a'; ctx.beginPath(); ctx.arc(172, -17, 4, 0, 7); ctx.fill();
  /* tailplane (near end, lower on screen) */
  ctx.fillStyle = '#d98a3a';
  ctx.beginPath(); ctx.moveTo(-10, 28); ctx.lineTo(-62, 16); ctx.lineTo(-64, 28); ctx.lineTo(-10, 38); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(62, 16); ctx.lineTo(64, 28); ctx.lineTo(10, 38); ctx.closePath(); ctx.fill();
  /* fuselage: short and foreshortened, nose (top, far) narrow -> tail (bottom, near) wide */
  const fus = ctx.createLinearGradient(-22, 0, 22, 0);
  fus.addColorStop(0, '#c98a3e'); fus.addColorStop(0.35, '#ffe9c0'); fus.addColorStop(0.65, '#f7c877'); fus.addColorStop(1, '#a86428');
  ctx.fillStyle = fus;
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.bezierCurveTo(-11, -48, -13, -28, -16, -4);
  ctx.lineTo(-23, 32);
  ctx.quadraticCurveTo(-24, 46, -12, 48);
  ctx.lineTo(12, 48);
  ctx.quadraticCurveTo(24, 46, 23, 32);
  ctx.lineTo(16, -4);
  ctx.bezierCurveTo(13, -28, 11, -48, 0, -52);
  ctx.closePath(); ctx.fill();
  /* vertical fin: tail fin looms at the top of the chase view */
  ctx.fillStyle = '#e0653a';
  ctx.beginPath(); ctx.moveTo(-6, -50); ctx.lineTo(-9, -84); ctx.lineTo(9, -84); ctx.lineTo(6, -50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.moveTo(-8, -70); ctx.lineTo(8, -70); ctx.lineTo(9, -78); ctx.lineTo(-9, -78); ctx.closePath(); ctx.fill();
  /* cockpit windows (rear glint, just below the nose) */
  ctx.fillStyle = '#1d2b45';
  ctx.beginPath(); ctx.roundRect(-11, -40, 9, 13, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(2, -40, 9, 13, 4); ctx.fill();
  /* exhaust glow at the tail */
  ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffb347';
  ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(-9, 50, 3.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(9, 50, 3.5, 0, 7); ctx.fill(); ctx.restore();
  /* tail strobe */
  if (Math.floor(G.time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, -84, 3.5, 0, 7); ctx.fill(); ctx.restore();
  }
  /* registration stripe */
  ctx.fillStyle = '#5a2a12';
  ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('MAIL 07', 0, 18);
  ctx.restore();
}

/* ---------- HUD ---------- */
function chip(x, y, w, h) {
  ctx.fillStyle = 'rgba(10,12,28,0.62)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawHUD() {
  if (G.state === 'title') return;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  /* top-left: ALT / SPD / HDG */
  chip(16, 14, 300, 84);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 26px monospace';
  ctx.fillText('ALT ' + fmt(G.y * 10.5) + ' FT', 30, 44);
  ctx.fillText('SPD ' + fmt(G.speed * 1.95) + ' KT', 30, 74);
  ctx.fillStyle = '#9fe8ff'; ctx.font = 'bold 22px monospace';
  ctx.fillText('HDG ' + String(Math.round(((G.heading * 57.3) % 360 + 360) % 360)).padStart(3, '0') + '°', 30, 96);
  /* compass strip */
  ctx.save();
  ctx.translate(W / 2, 52);
  chip(-190, -26, 380, 44);
  ctx.beginPath(); ctx.rect(-190, -26, 380, 44); ctx.clip();
  const hdg = ((G.heading * 57.3) % 360 + 360) % 360;
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
  for (let d = -120; d <= 120; d += 15) {
    let a = Math.round(hdg + d); a = ((a % 360) + 360) % 360;
    const x = d * 1.5;
    const label = a % 90 === 0 ? ['N', 'E', 'S', 'W'][Math.round(a / 90) % 4] : (a % 30 === 0 ? String(a) : '');
    ctx.fillStyle = a % 90 === 0 ? '#ffd76a' : 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - 1, -8, 2, 10);
    if (label) ctx.fillText(label, x, 14);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.moveTo(W / 2 - 7, 18); ctx.lineTo(W / 2 + 7, 18); ctx.lineTo(W / 2, 30); ctx.closePath(); ctx.fill();
  /* top-right: score / rings / time / fuel */
  chip(W - 316, 14, 300, 84);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 24px monospace';
  ctx.fillText('SCORE ' + G.score, W - 30, 42);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
  ctx.fillText('RING ' + G.ringsHit + '/' + G.ringTotal + '   ' + fmtTime(G.legTime), W - 30, 70);
  ctx.fillStyle = G.fuel < 25 ? (Math.floor(G.time * 3) % 2 ? '#ff5555' : '#ffd76a') : '#9fe8ff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('FUEL ' + fmt(G.fuel) + '%', W - 30, 94);
  ctx.textAlign = 'left';
  /* fuel bar */
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(W - 300, 102, 200, 8);
  ctx.fillStyle = G.fuel < 25 ? '#ff5555' : '#7ee787';
  ctx.fillRect(W - 300, 102, 200 * (G.fuel / 100), 8);
  /* next-ring guide (or runway guide once the rings are done) */
  const nr = nextRing();
  if (G.state === 'flying') {
    let label, d, dx;
    if (nr) { label = 'NEXT RING'; d = Math.max(0, Math.round(nr.z - G.z)); dx = nr.x - G.x; }
    else if (world) { label = 'RUNWAY 27'; d = Math.max(0, Math.round(world.runwayZ - G.z)); dx = world.runwayX - G.x; }
    if (label) {
      ctx.fillStyle = 'rgba(10,12,28,0.55)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 120, 108, 240, 30, 8); ctx.fill();
      ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText((dx > 30 ? '◀ ' : dx < -30 ? ' ▶' : '● ') + ' ' + label + ' ' + d + 'm ' + (dx > 30 ? '◀' : dx < -30 ? '▶' : ''), W / 2, 129);
      ctx.textAlign = 'left';
    }
  }
  /* centre message */
  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = clamp(G.msgT, 0, 1);
    ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,12,28,0.6)';
    const tw = ctx.measureText(G.msg).width;
    ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2 - 22, 168, tw + 44, 52, 10); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(G.msg, W / 2, 204);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  /* instrument panel */
  drawPanel();
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function drawPanel() {
  const y0 = H - 106;
  ctx.fillStyle = 'rgba(8,10,24,0.78)';
  ctx.beginPath(); ctx.roundRect(16, y0, W - 32, 92, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  /* attitude indicator */
  const ax = 92, ay = y0 + 46, ar = 34;
  ctx.save();
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.clip();
  ctx.translate(ax, ay); ctx.rotate(-G.roll);
  ctx.translate(0, clamp(G.pitch * 120, -34, 34));
  ctx.fillStyle = '#2a6db0'; ctx.fillRect(-40, -40, 80, 40);
  ctx.fillStyle = '#7a4a26'; ctx.fillRect(-40, 0, 80, 40);
  ctx.fillStyle = '#fff'; ctx.fillRect(-40, -1, 80, 2);
  ctx.restore();
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax - 2, ay); ctx.lineTo(ax, ay - 4); ctx.lineTo(ax + 2, ay); ctx.lineTo(ax + 14, ay); ctx.stroke();
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', ax, y0 + 88);
  /* airspeed dial */
  gauge(210, ay, ar, G.speed, 40, 130, 'KNOTS', 'AIRSPEED');
  /* altimeter dial */
  gauge(330, ay, ar, G.y * 10.5, 0, 5000, 'FEET', 'ALTIMETER');
  /* vertical speed */
  gauge(450, ay, ar, G.vspeed * 1.95 * 10, -2000, 2000, 'FPM', 'VERT SPEED');
  /* throttle + fuel bars */
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 12px monospace';
  ctx.fillText('THROTTLE', 560, y0 + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(560, y0 + 26, 180, 12);
  ctx.fillStyle = '#ffb347'; ctx.fillRect(560, y0 + 26, 180 * G.throttle, 12);
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('FUEL', 560, y0 + 58);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(560, y0 + 66, 180, 12);
  ctx.fillStyle = G.fuel < 25 ? '#ff5555' : '#7ee787';
  ctx.fillRect(560, y0 + 66, 180 * (G.fuel / 100), 12);
  /* leg + lives */
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace';
  ctx.fillText(LEGS[G.leg].name, 780, y0 + 30);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 14px monospace';
  ctx.fillText('LIVES ' + '◆'.repeat(Math.max(0, G.lives)) + '   WIND ' + (LEGS[G.leg].wind > 0 ? '+' : '') + LEGS[G.leg].wind + 'kt', 780, y0 + 56);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px monospace';
  ctx.fillText('ARROWS/WASD FLY · SHIFT/CTRL THROTTLE · P PAUSE · M MUTE', 780, y0 + 80);
  ctx.textAlign = 'left';
}
function gauge(cx, cy, r, val, min, max, unit, label) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#10142a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255,215,106,0.5)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 30) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
    ctx.stroke();
  }
  ctx.restore();
  const t = clamp((val - min) / (max - min), 0, 1);
  const a = (-210 + t * 300) * Math.PI / 180;
  ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8)); ctx.stroke();
  ctx.fillStyle = '#ffd76a'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
  ctx.fillText(fmt(val), cx, cy + r * 0.55);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 10px monospace';
  ctx.fillText(label, cx, cy + r + 13);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '9px monospace';
  ctx.fillText(unit, cx, cy - r + 12);
  ctx.textAlign = 'left';
}

/* ---------- overlays (menus) ---------- */
function panelBox(x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,26,0.82)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.6)'; ctx.lineWidth = 2; ctx.stroke();
}
function drawOverlays() {
  ctx.textAlign = 'center';
  if (G.state === 'title') {
    const tg = ctx.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, 'rgba(10,8,28,0.62)'); tg.addColorStop(0.6, 'rgba(10,8,28,0.10)'); tg.addColorStop(1, 'rgba(10,8,28,0.72)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
    /* soft dark panel behind the title block so rings never fight the text */
    ctx.fillStyle = 'rgba(10,8,28,0.38)';
    ctx.beginPath(); ctx.roundRect(W / 2 - 380, 96, 760, 268, 18); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText('GOLDEN HOUR', W / 2, 168);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('— FJORD MAIL RUN —', W / 2, 216);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '20px monospace';
    ctx.fillText('The last mail plane of the day. Thread the glowing rings,', W / 2, 262);
    ctx.fillText('mind the peaks, and land on the mountain airstrip before dark.', W / 2, 290);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 22px monospace';
    ctx.fillText('3 LEGS  ·  36 RINGS  ·  FUEL  ·  CROSSWIND  ·  DUSK', W / 2, 336);
    const blink = Math.floor(G.time * 1.5) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px monospace';
      ctx.fillText('PRESS ENTER TO FLY', W / 2, 408);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '16px monospace';
    ctx.fillText('ARROWS / WASD — STEER    SHIFT / CTRL — THROTTLE    MOUSE — STEER    P — PAUSE    M — MUTE', W / 2, 668);
  }
  if (G.state === 'paused') {
    panelBox(W / 2 - 220, H / 2 - 80, 440, 140);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 40px monospace';
    ctx.fillText('PAUSED', W / 2, H / 2 - 18);
    ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
    ctx.fillText('PRESS P TO RESUME', W / 2, H / 2 + 26);
  }
  if (G.state === 'crashed') {
    ctx.fillStyle = 'rgba(200,30,20,0.16)'; ctx.fillRect(0, 0, W, H);
  }
  if (G.state === 'legcomplete' && G.legScore) {
    panelBox(W / 2 - 300, 150, 600, 330);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 40px monospace';
    ctx.fillText('LEG COMPLETE!', W / 2, 210);
    ctx.fillStyle = '#fff'; ctx.font = '22px monospace';
    ctx.fillText('RINGS FLOWN   ' + G.legScore.rings + ' / ' + G.ringTotal, W / 2, 262);
    ctx.fillText('TIME BONUS    +' + G.legScore.timeBonus, W / 2, 298);
    ctx.fillText('FUEL BONUS    +' + G.legScore.fuelBonus, W / 2, 334);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 26px monospace';
    ctx.fillText('SCORE  ' + G.score, W / 2, 382);
    const blink = Math.floor(G.time * 1.5) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
      ctx.fillText(G.leg + 1 >= LEGS.length ? 'PRESS ENTER — SEE THE FINAL TALLY' : 'PRESS ENTER — NEXT LEG', W / 2, 440);
    }
  }
  if (G.state === 'gameover') {
    panelBox(W / 2 - 300, 190, 600, 260);
    ctx.fillStyle = '#ff6a5e'; ctx.font = 'bold 40px monospace';
    ctx.fillText('OUT OF PLANES', W / 2, 252);
    ctx.fillStyle = '#fff'; ctx.font = '22px monospace';
    ctx.fillText('THE MAIL WILL HAVE TO WAIT UNTIL TOMORROW.', W / 2, 300);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 26px monospace';
    ctx.fillText('FINAL SCORE  ' + G.score, W / 2, 350);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESS ENTER — FLY AGAIN', W / 2, 410);
  }
  if (G.state === 'complete') {
    panelBox(W / 2 - 320, 160, 640, 320);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 40px monospace';
    ctx.fillText('ALL MAIL DELIVERED!', W / 2, 222);
    ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
    ctx.fillText('Three legs, three sunsets, one very tired mail plane.', W / 2, 268);
    ctx.fillText('Every ring flown. Every letter home.', W / 2, 298);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 28px monospace';
    ctx.fillText('FINAL SCORE  ' + G.score, W / 2, 352);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESS ENTER — FLY AGAIN', W / 2, 420);
  }
  ctx.textAlign = 'left';
}

/* ---------- title autopilot ---------- */
function titleUpdate(dt) {
  G.time += dt;
  G.autopilot = true;
  const target = nextRing() || { x: world.runwayX, y: 60 };
  const dx = target.x - G.x, dy = target.y - G.y;
  const steer = clamp(dx / 160, -1, 1);
  G.roll += (steer * 0.85 - G.roll) * Math.min(1, dt * 5);
  G.heading += G.roll * 0.4 * dt;
  G.x += Math.sin(G.heading) * G.speed * dt;
  G.x = clamp(G.x, -380, 380);
  G.pitch += (clamp(dy / 90, -0.4, 0.4) - G.pitch) * Math.min(1, dt * 3);
  G.y += G.pitch * G.speed * 0.9 * dt;
  G.y = clamp(G.y, 60, 300);
  G.z += G.speed * dt;
  if (G.z > LEGS[G.leg].length + 400) loadLeg(G.leg);
  for (const b of G.birds) { b.z -= (G.speed * 0.35) * dt; b.ph += dt * 6; if (b.z < G.z - 100) { b.z = G.z + 2500; } }
  if (G.msgT > 0) G.msgT -= dt;
}

/* ---------- deterministic demo shots (for screenshots) ---------- */
function setupShot(shot) {
  G.demoShot = shot;
  if (shot === 'title') {
    loadLeg(0); G.state = 'title'; G.autopilot = true;
    for (let i = 0; i < 90; i++) titleUpdate(0.1); // fly 9s in
    G.time = 4.2;
  } else if (shot === 'ring') {
    loadLeg(0); G.state = 'flying'; G.autopilot = false;
    const r = world.rings[2];
    G.z = r.z - 380; G.x = r.x - 22; G.y = r.y; G.heading = 0.02; G.roll = 0.1;
    G.speed = 72; G.throttle = 0.7; G.ringsHit = 5; G.score = 1250; G.legTime = 65; G.time = 65; G.fuel = 82;
    showMsg('RING 6/12  +100', 5);
  } else if (shot === 'runway') {
    loadLeg(1); G.state = 'flying'; G.autopilot = false;
    G.z = world.runwayZ - 330; G.x = world.runwayX; G.y = 42; G.heading = 0; G.roll = 0;
    G.speed = 58; G.throttle = 0.45; G.ringsHit = 12; G.score = 2400; G.legTime = 142; G.time = 142; G.fuel = 46;
    showMsg('FINAL APPROACH — RUNWAY 27', 5);
  } else if (shot === 'complete') {
    loadLeg(0); G.state = 'legcomplete'; G.autopilot = false;
    G.z = world.runwayZ; G.x = world.runwayX; G.y = 60;
    G.score = 3450; G.ringsHit = 12; G.legTime = 148; G.time = 148; G.fuel = 61;
    G.legScore = { rings: 12, time: 148, timeBonus: 304, fuelBonus: 183 };
  }
  render();
}

/* ---------- main loop & boot ---------- */
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (G.state === 'title') titleUpdate(dt);
  else update(dt);
  render();
  requestAnimationFrame(loop);
}
function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = (W * s) + 'px';
  canvas.style.height = (H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
(function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  fitCanvas();
  // debug/test hooks (harmless in play; used by the automated play-test)
  window.__game = { G, nextRing, startGame, update, loadLeg, get world() { return world; } };
  if (shot) { setupShot(shot); return; }
  loadLeg(0);
  G.state = 'title';
  G.autopilot = true;
  requestAnimationFrame(loop);
})();
