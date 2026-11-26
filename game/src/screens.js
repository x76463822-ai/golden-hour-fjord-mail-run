/* GOLDEN HOUR — Fjord Mail Run · screens.js
 * Menu and tally screens, the title autopilot and the deterministic screenshot states.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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
    ctx.fillText('3 LEGS  ·  36 RINGS  ·  GUSTS  ·  RAIN  ·  THERMALS  ·  DUSK', W / 2, 336);
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
    panelBox(W / 2 - 300, 138, 600, 364);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 40px monospace';
    ctx.fillText('LEG COMPLETE!', W / 2, 198);
    ctx.fillStyle = '#fff'; ctx.font = '22px monospace';
    ctx.fillText('RINGS FLOWN   ' + G.legScore.rings + ' / ' + G.ringTotal, W / 2, 248);
    ctx.fillText('TIME BONUS    +' + G.legScore.timeBonus, W / 2, 282);
    ctx.fillText('FUEL BONUS    +' + G.legScore.fuelBonus, W / 2, 316);
    ctx.fillStyle = '#7ee787'; ctx.font = 'bold 17px monospace';
    (G.legScore.feats || []).slice(0, 3).forEach((f, i) => ctx.fillText('★ ' + f, W / 2, 346 + i * 24));
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 26px monospace';
    ctx.fillText('SCORE  ' + G.score, W / 2, 434);
    const blink = Math.floor(G.time * 1.5) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
      ctx.fillText(G.leg + 1 >= LEGS.length ? 'PRESS ENTER — SEE THE FINAL TALLY' : 'PRESS ENTER — NEXT LEG', W / 2, 476);
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
    ctx.fillStyle = '#7ee787'; ctx.font = 'bold 18px monospace';
    ctx.fillText('FEATS EARNED  ×' + G.featsTotal, W / 2, 326);
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
  if (shot === 'hero') {
    /* the cover: chase view, a big glowing ring dead ahead, sun and river
       in frame, full HUD and lit panel — the whole brief in one glance */
    loadLeg(0); G.state = 'flying'; G.autopilot = false;
    const r = world.rings[4];
    for (let i = 0; i < 4; i++) world.rings[i].passed = true;
    G.z = r.z - 330; G.x = r.x - 26; G.y = r.y + 4; G.heading = 0.03; G.roll = 0.16; G.pitch = 0.03;
    G.speed = 84; G.throttle = 0.78; G.ringsHit = 4; G.score = 1150; G.legTime = 74; G.time = 74; G.fuel = 78;
  } else if (shot === 'title') {
    /* composed title backdrop: gentle bank over the river, a ring ahead,
       no hazard peak swallowing the plane (the old autopilot frame did) */
    loadLeg(0); G.state = 'title'; G.autopilot = true;
    const r = world.rings[3];
    for (let i = 0; i < 3; i++) world.rings[i].passed = true;
    G.z = r.z - 700; G.x = r.x * 0.4; G.y = 190; G.heading = 0.03; G.roll = 0.10; G.pitch = 0.02;
    G.speed = 62; G.throttle = 0.62;
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
    /* keep balloons fully inside the frame on this composed shot */
    for (const b of world.balloons) if (b.z > G.z - 100 && b.z < G.z + 1600 && Math.abs(b.x - world.runwayX) < 220) b.x += 300;
    showMsg('FINAL APPROACH — RUNWAY 27', 5);
  } else if (shot === 'complete') {
    loadLeg(0); G.state = 'legcomplete'; G.autopilot = false;
    G.z = world.runwayZ - 60; G.x = world.runwayX; G.y = 30; G.roll = 0; G.pitch = 0;
    /* keep the backdrop clean behind the tally panel */
    for (const hz of world.hazards) if (hz.z > G.z - 100 && hz.z < G.z + 1300) hz.x += (hz.x < G.x ? -460 : 460);
    G.score = 3450; G.ringsHit = 12; G.legTime = 148; G.time = 148; G.fuel = 61;
    G.legScore = { rings: 12, time: 148, timeBonus: 304, fuelBonus: 183, feats: ['FULL HOUSE — EVERY RING FLOWN', 'CLEAN SHEET — NO SCRATCHES', 'FUEL MISER — HALF A TANK LEFT'] };
  }
  render();
}
