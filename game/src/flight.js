/* GOLDEN HOUR — Fjord Mail Run · flight.js
 * The flight model: steering, gusts, thermals, combo streaks, hazards, landing and feats.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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
    /* obstacle awareness: climb over (and edge away from) a peak that is
       dead ahead and taller than the plane */
    for (const hz of world.hazards) {
      const dz = hz.z - G.z;
      if (dz > 0 && dz < 300 && Math.abs(hz.x - G.x) < hz.w * 0.55 && G.y < hz.h + 26) {
        pitchIn = 1;
        steer = clamp(steer + (G.x < hz.x ? -0.45 : 0.45), -1, 1);
      }
    }
  }
  steer = clamp(steer, -1.4, 1.4);
  const targetRoll = steer * 0.85;
  G.roll += (targetRoll - G.roll) * Math.min(1, dt * 5);
  G.heading += G.roll * 0.55 * dt * (G.speed / 62);
  G.x += Math.sin(G.heading) * G.speed * dt;
  G.windNow = liveWind();
  G.x += G.windNow * 0.35 * dt; // crosswind drift (gusting on leg 2)
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

  // --- thermals: ride a rising column for free altitude and a bonus ---
  for (const t of world.thermals) {
    if (Math.abs(G.z - t.z) < 75 && Math.abs(G.x - t.x) < 75 && G.y < 320) {
      G.y += 26 * dt;
      if (!t.scored) {
        t.scored = true; G.thermalsUsed++; G.score += 50;
        showMsg('THERMAL RIDE  +50', 1.4); sfx('ring');
      }
    }
  }

  // --- rings ---
  for (const r of world.rings) {
    if (r.passed) continue;
    if (G.z >= r.z - 6 && G.z <= r.z + 30) {
      const dx = G.x - r.x, dy = G.y - r.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r.r) {
        r.passed = true; G.ringsHit++;
        const perfect = d < r.r * 0.45;
        /* combo streak: consecutive rings multiply the take, up to ×3 */
        G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
        const mult = 1 + Math.min(G.combo - 1, 4) * 0.5;
        const pts = Math.round((perfect ? 150 : 100) * mult / 10) * 10;
        G.score += pts;
        G.fuel = Math.min(100, G.fuel + 6);
        ringBurst(r);
        sfx(perfect ? 'perfect' : 'ring');
        showMsg((perfect ? 'PERFECT RING' : 'RING ' + G.ringsHit + '/' + G.ringTotal) + '  +' + pts + (mult > 1 ? '  STREAK ×' + mult.toFixed(1).replace('.0', '') : ''), 1.4);
      }
    } else if (G.z > r.z + 30 && !r.passed) {
      r.passed = true; // missed: mark so it is not retried
      G.combo = 0;
      showMsg('RING MISSED — STREAK LOST', 1.2);
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
        /* feats: named achievements judged from how the leg was flown */
        const feats = [];
        if (G.ringsHit === G.ringTotal) feats.push('FULL HOUSE — EVERY RING FLOWN');
        if (G.legCrashes === 0) feats.push('CLEAN SHEET — NO SCRATCHES');
        if (G.bestCombo >= 5) feats.push('ON FIRE — STREAK ×' + (1 + Math.min(G.bestCombo - 1, 4) * 0.5).toFixed(1).replace('.0', ''));
        if (G.fuel >= 50) feats.push('FUEL MISER — HALF A TANK LEFT');
        if (G.thermalsUsed >= 2) feats.push('THERMAL RIDER — TWO FREE LIFTS');
        if (G.legTime < 140) feats.push('DEADLINE BEATER — UNDER 2:20');
        G.featsTotal += feats.length;
        G.state = 'legcomplete'; sfx('land');
        G.legScore = { rings: G.ringsHit, time: G.legTime, timeBonus, fuelBonus, feats };
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
