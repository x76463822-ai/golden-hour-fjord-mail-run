/* GOLDEN HOUR — Fjord Mail Run · world.js
 * Seeded world generation (rings, peaks, thermals, weather) and game flow.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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
  // fairness: no hazard may camp on the racing line — nudge any peak that
  // blocks a ring's centre or the spawn corridor sideways, so every ring
  // stays flyable at its own altitude (peaks beside the line still bite)
  for (const hz of hazards) {
    const clearOf = (rz, rx) => {
      if (Math.abs(hz.z - rz) < 170 && Math.abs(hz.x - rx) < hz.w * 0.5 + 55) {
        hz.x = clamp(rx + (hz.x >= rx ? 1 : -1) * (hz.w * 0.5 + 135), -560, 560);
      }
    };
    for (const r of rings) clearOf(r.z, r.x);
    if (hz.z < 1200) clearOf(600, 0); // spawn corridor
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
  // thermals: rising-air columns parked BETWEEN rings (never on the ring
  // line, so they reward a detour instead of punishing the racing line),
  // each marked by a circling hawk
  const thermals = [];
  for (let i = 0; i < 3; i++) {
    const anchor = rings[2 + i * 3];
    thermals.push({
      z: anchor.z + 210, x: clamp(anchor.x + (rnd() > 0.5 ? 250 : -250), -360, 360),
      y: 170 + rnd() * 60, scored: false,
    });
  }
  // ground patches: forest, meadow and ploughed-field blobs that give the
  // valley floor texture and depth cues as they stream past
  const patches = [];
  const patchCols = ['#2c4420', '#3a4a22', '#54452a', '#42512a', '#31482a'];
  for (let i = 0; i < 46; i++) {
    patches.push({ z: 150 + rnd() * (leg.length + 600), x: (rnd() - 0.5) * 900, r: 90 + rnd() * 190, col: patchCols[i % patchCols.length] });
  }
  // river centre line (winding sine, so it reads as a river, not a road)
  const river = [];
  for (let z = 0; z <= leg.length + 1500; z += 150) river.push({ z, x: Math.sin(z * 0.0006) * 210 });
  return {
    rings, peaks, hazards, trees, clouds, balloons, river, patches, thermals,
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
  G.combo = 0; G.bestCombo = 0; G.legCrashes = 0; G.thermalsUsed = 0; G.windNow = LEGS[i].wind;
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
  G.legCrashes++; G.combo = 0;
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
