/* GOLDEN HOUR — Fjord Mail Run · render.js
 * Pseudo-3D chase renderer: sky, fjord terrain, rings, runway and the plane.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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

  /* stars: strongest high in the sky, gone near the sunset band; the
     later legs sit deeper into dusk, so more stars show */
  const starBase = 0.25 + G.leg * 0.3;
  for (const st of STARS) {
    const fade = clamp(1 - st.y / 320, 0, 1) * starBase;
    if (fade <= 0.02) continue;
    const tw = 0.75 + 0.25 * Math.sin(G.time * 1.7 + st.s * 40);
    ctx.fillStyle = 'rgba(255,246,220,' + (fade * tw).toFixed(3) + ')';
    ctx.fillRect(st.x, st.y, st.s > 0.8 ? 2.4 : 1.4, st.s > 0.8 ? 2.4 : 1.4);
  }

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

  /* clouds: puffy three-tone cumulus — shadowed base, warm body, lit crest —
     plus a thin warm stratus band hugging the horizon */
  if (world) {
    ctx.fillStyle = 'rgba(255,196,150,0.10)';
    for (let i = 0; i < 4; i++) {
      const by = hz - 26 - i * 17 - Math.sin(G.heading * 2 + i) * 3;
      ctx.beginPath(); ctx.ellipse(W * (0.22 + i * 0.19) - Math.sin(G.heading) * 120, by, 300, 4, 0, 0, 7); ctx.fill();
    }
  }
  (world ? world.clouds : []).forEach((c, ci) => {
    const p = proj(c.x, c.y, c.z); if (!p || p.dz > 6000 || p.dz < 700) return;
    const w = Math.min(150 * c.s * p.s, 300), h = 30 * c.s * p.s;
    const ph = ci * 2.39; // per-cloud deterministic puff offsets
    const puff = (ox, oy, ow, oh, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x + ox, p.y + oy, ow, oh, 0, 0, 7); ctx.fill(); };
    puff(0, h * 0.30, w * 0.52, h * 0.62, 'rgba(146,84,104,' + (c.a * 0.5) + ')');            // shadow base
    puff(-w * 0.20, h * 0.05, w * 0.34, h * 0.72, 'rgba(255,178,138,' + (c.a * 0.62) + ')');  // warm body
    puff(w * 0.18, h * 0.02, w * 0.32, h * 0.78, 'rgba(255,190,150,' + (c.a * 0.62) + ')');
    puff(w * (0.02 + 0.06 * Math.sin(ph)), -h * 0.34, w * 0.26, h * 0.62, 'rgba(255,236,205,' + (c.a * 0.8) + ')'); // lit crest
    puff(-w * 0.34, -h * 0.14, w * 0.2, h * 0.45, 'rgba(255,226,190,' + (c.a * 0.5) + ')');
  });

  /* sun + glow (drawn after clouds so the disc stays visible) */
  const sunX = W * 0.66 - Math.sin(G.heading) * 260, sunY = leg.sunY - G.pitch * 160;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 330);
  glow.addColorStop(0, 'rgba(255,214,120,0.95)'); glow.addColorStop(0.25, 'rgba(255,170,80,0.55)'); glow.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, 330, 0, 7); ctx.fill();
  const sunG = ctx.createRadialGradient(sunX, sunY - 8, 4, sunX, sunY, 46);
  sunG.addColorStop(0, '#fffbe8'); sunG.addColorStop(0.7, '#fff3c4'); sunG.addColorStop(1, '#ffd76a');
  ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(sunX, sunY, 44, 0, 7); ctx.fill();
  /* lens flare ghosts along the sun-to-centre axis */
  for (const [fx, fr, fc] of [[0.32, 15, 'rgba(255,190,120,0.16)'], [0.55, 8, 'rgba(160,220,255,0.14)'], [0.78, 22, 'rgba(255,150,190,0.10)']]) {
    ctx.fillStyle = fc;
    ctx.beginPath(); ctx.arc(lerp(sunX, W / 2, fx), lerp(sunY, H / 2, fx), fr, 0, 7); ctx.fill();
  }

  /* ground */
  const gnd = ctx.createLinearGradient(0, hz, 0, H);
  gnd.addColorStop(0, '#4a3a28'); gnd.addColorStop(0.35, '#3d4a26'); gnd.addColorStop(1, '#1e2b18');
  ctx.fillStyle = gnd; ctx.fillRect(-30, hz, W + 60, H - hz + 30);

  /* mid-ground ridge: a hazy silhouette range sitting on the horizon,
     between the far peaks and the valley floor (parallax with heading) */
  ctx.fillStyle = G.leg === 2 ? 'rgba(74,44,74,0.85)' : 'rgba(96,58,74,0.8)';
  ctx.beginPath(); ctx.moveTo(-30, hz + 6);
  for (let x = -30; x <= W + 30; x += 38) {
    const n = Math.sin((x + G.x * 0.05 + Math.sin(G.heading) * 300) * 0.011) * 0.5
            + Math.sin((x + G.x * 0.05) * 0.027 + 1.7) * 0.32
            + Math.sin(x * 0.11 + 0.5) * 0.18;
    ctx.lineTo(x, hz - 8 - (n * 0.5 + 0.5) * 44);
  }
  ctx.lineTo(W + 30, hz + 6); ctx.closePath(); ctx.fill();

  /* ground patches (forest / meadow / field blobs streaming past) */
  if (world) {
    for (const pa of world.patches) {
      const p = proj(pa.x, 0, pa.z); if (!p || p.dz > 3000 || p.dz < 60) continue;
      const rw = pa.r * p.s, rh = rw * 0.30;
      if (p.x < -rw || p.x > W + rw) continue;
      ctx.fillStyle = pa.col; ctx.globalAlpha = clamp(1.15 - p.dz / 2800, 0.15, 0.9);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rw, rh, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* river (blue fjord water with sandy banks, a warm sun streak and
     animated sparkle, narrower + more winding) */
  if (world) {
    const riverPath = (wdt) => {
      ctx.beginPath();
      let started = false;
      for (let z = Math.max(60, G.z + 40); z < G.z + 3000; z += 110) {
        const cx = riverX(z);
        const a = proj(cx - wdt, 0, z); if (!a) continue;
        if (!started) { ctx.moveTo(a.x, a.y); started = true; }
        ctx.lineTo(a.x, a.y);
      }
      for (let z = G.z + 2990; z >= Math.max(60, G.z + 40); z -= 110) {
        const cx = riverX(z);
        const b = proj(cx + wdt, 0, z); if (!b) continue;
        ctx.lineTo(b.x, b.y);
      }
      ctx.closePath();
    };
    riverPath(41);
    ctx.fillStyle = 'rgba(208,172,112,0.34)'; ctx.fill();   // sandy banks
    riverPath(28);
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
    /* sparkle dashes that shimmer as the water streams past */
    ctx.strokeStyle = 'rgba(255,240,200,0.65)'; ctx.lineWidth = 2;
    for (let z = Math.max(60, G.z + 90); z < G.z + 1500; z += 150) {
      const tw = 0.5 + 0.5 * Math.sin(z * 0.05 + G.time * 3);
      if (tw < 0.55) continue;
      const p = proj(riverX(z) + Math.sin(z * 0.02) * 12, 0, z); if (!p) continue;
      const len = clamp(26 * p.s, 2, 22);
      ctx.globalAlpha = (tw - 0.4) * 0.9;
      ctx.beginPath(); ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* road */
    ctx.strokeStyle = 'rgba(46,40,36,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let z = Math.max(60, G.z + 40); z < G.z + 2600; z += 130) {
      const p = proj(riverX(z) + 230, 0, z); if (!p) continue;
      if (z === Math.max(60, G.z + 40)) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /* trees: two-tone pines (sunlit face + shadow face) with a trunk */
  for (const t of (world ? world.trees : [])) {
    const p = proj(t.x, 0, t.z); if (!p || p.dz > 2600 || p.dz < 120) continue;
    const s = 21 * t.s * p.s;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(p.x - s * 0.05, p.y - s * 0.22, s * 0.1, s * 0.22);
    ctx.fillStyle = '#16290f';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x - s * 0.48, p.y - s * 0.14); ctx.lineTo(p.x + s * 0.48, p.y - s * 0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c4d1e';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y - s * 0.14); ctx.lineTo(p.x + s * 0.48, p.y - s * 0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d6330';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - s * 0.72); ctx.lineTo(p.x - s * 0.34, p.y - s * 0.3); ctx.lineTo(p.x + s * 0.34, p.y - s * 0.3); ctx.closePath(); ctx.fill();
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

  /* balloons: striped envelope, rigging lines and a basket */
  for (const b of (world ? world.balloons : [])) {
    if (b.hit) continue;
    const p = proj(b.x, b.y, b.z); if (!p || p.dz > 2400 || p.dz < 20) continue;
    const r = 27 * p.s;
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.clip();
    const stripes = ['#e84a5f', '#ffd76a', '#e84a5f', '#5fe8d8', '#e84a5f', '#ffd76a', '#e84a5f'];
    const sw = (r * 2) / stripes.length;
    stripes.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(p.x - r + i * sw, p.y - r, sw + 1, r * 2); });
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath(); ctx.ellipse(p.x - r * 0.34, p.y - r * 0.38, r * 0.3, r * 0.2, -0.5, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,22,16,0.85)'; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(p.x - r * 0.4, p.y + r * 0.75); ctx.lineTo(p.x - r * 0.2, p.y + r * 1.25);
    ctx.moveTo(p.x + r * 0.4, p.y + r * 0.75); ctx.lineTo(p.x + r * 0.2, p.y + r * 1.25);
    ctx.stroke();
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(p.x - r * 0.26, p.y + r * 1.22, r * 0.52, r * 0.42);
  }

  /* thermals: a shimmering column of rising air with a hawk circling it */
  for (const t of (world ? world.thermals : [])) {
    const base = proj(t.x, 0, t.z); if (!base || base.dz > 2200 || base.dz < 60) continue;
    const top = proj(t.x, t.y + 60, t.z);
    for (let k = 0; k < 7; k++) {
      const rise = ((G.time * 0.35 + k / 7) % 1);
      const py = top ? lerp(base.y, top.y, rise) : base.y - 100 * rise;
      const px = base.x + Math.sin(G.time * 2 + k * 2.4) * 14 * base.s * (1 - rise * 0.4);
      ctx.fillStyle = 'rgba(255,236,180,' + (0.35 * (1 - rise) + 0.08).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 3.2 * base.s * (1 - rise * 0.5)), 0, 7); ctx.fill();
    }
    /* the hawk riding the top of the column */
    const hp = proj(t.x + Math.cos(G.time * 0.9) * 34, t.y + 60 + Math.sin(G.time * 1.7) * 5, t.z + Math.sin(G.time * 0.9) * 34);
    if (hp) {
      const s = 17 * hp.s, f2 = Math.sin(G.time * 5) * 3 * hp.s;
      ctx.strokeStyle = 'rgba(24,16,20,0.9)'; ctx.lineWidth = Math.max(1.4, 2 * hp.s);
      ctx.beginPath();
      ctx.moveTo(hp.x - s, hp.y - f2); ctx.quadraticCurveTo(hp.x, hp.y + f2, hp.x + s, hp.y - f2);
      ctx.stroke();
    }
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
      const alpha = clamp(1.25 - p.dz / 1400, 0.10, 1);
      const isNext = r === nextRing();
      if (isNext) {
        /* soft beacon disc inside the next ring so the target glows */
        const disc = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, rr);
        disc.addColorStop(0, 'rgba(255,240,190,0.20)'); disc.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = disc;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = col; ctx.shadowBlur = 22;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2.5, rr * 0.09);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.82, 0, 7); ctx.stroke();
      /* rotating dashed halo */
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, rr * 0.045);
      ctx.setLineDash([rr * 0.34, rr * 0.24]);
      ctx.lineDashOffset = -G.time * 40 - r.z;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.14, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (isNext) {
        /* four light orbs riding the next ring */
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = '#fff7dd';
        for (let k = 0; k < 4; k++) {
          const a = G.time * 1.4 + k * Math.PI / 2;
          ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, Math.max(2, rr * 0.07), 0, 7); ctx.fill();
        }
        ctx.restore();
      }
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
      /* threshold piano keys + touchdown marks (close range only) */
      if (rz - G.z < 1700) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let k = -3; k <= 3; k++) {
          if (k === 0) continue;
          const a = proj(rx + k * 7.5, 0, rz - 296), b = proj(rx + k * 7.5, 0, rz - 252);
          if (a && b) { ctx.beginPath(); ctx.moveTo(a.x - 2 * a.s, a.y); ctx.lineTo(a.x + 2 * a.s, a.y); ctx.lineTo(b.x + 2 * b.s, b.y); ctx.lineTo(b.x - 2 * b.s, b.y); ctx.closePath(); ctx.fill(); }
        }
        for (const dzm of [-190, -130]) {
          for (const sx of [-13, 13]) {
            const a = proj(rx + sx, 0, rz + dzm), b = proj(rx + sx, 0, rz + dzm + 34);
            if (a && b) { ctx.beginPath(); ctx.moveTo(a.x - 2.4 * a.s, a.y); ctx.lineTo(a.x + 2.4 * a.s, a.y); ctx.lineTo(b.x + 2.4 * b.s, b.y); ctx.lineTo(b.x - 2.4 * b.s, b.y); ctx.closePath(); ctx.fill(); }
          }
        }
      }
      /* PAPI glide-slope lights: white over red as the approach steepens */
      for (let k = 0; k < 4; k++) {
        const p = proj(rx - 44, 2, rz - 268 + k * 7); if (!p || p.dz < 150) continue;
        const glide = clamp((G.y - 8) / Math.max(30, (rz - 268 - G.z)) * 9.4, 0, 1); // ~1 on a 3° slope
        const white = k < Math.round(glide * 4);
        ctx.save(); ctx.shadowColor = white ? '#ffffff' : '#ff3b30'; ctx.shadowBlur = 12;
        ctx.fillStyle = white ? '#ffffff' : '#ff3b30';
        ctx.beginPath(); ctx.arc(p.x, p.y, clamp(3.2 * p.s, 1.8, 5), 0, 7); ctx.fill(); ctx.restore();
      }
      /* windsock beside the threshold, streaming with the leg's wind */
      const ws = proj(rx + 52, 0, rz - 240);
      if (ws && rz - G.z < 2200) {
        const poleH = 26 * ws.s;
        ctx.strokeStyle = '#cfd6dd'; ctx.lineWidth = Math.max(1, 2 * ws.s);
        ctx.beginPath(); ctx.moveTo(ws.x, ws.y); ctx.lineTo(ws.x, ws.y - poleH); ctx.stroke();
        const wdir = LEGS[G.leg].wind >= 0 ? 1 : -1;
        const wlen = (10 + Math.abs(LEGS[G.leg].wind) * 1.6) * ws.s;
        const droop = clamp(1 - Math.abs(LEGS[G.leg].wind) / 9, 0.15, 1) * 8 * ws.s;
        ctx.fillStyle = '#ff7a2e';
        ctx.beginPath();
        ctx.moveTo(ws.x, ws.y - poleH);
        ctx.lineTo(ws.x + wdir * wlen, ws.y - poleH + droop);
        ctx.lineTo(ws.x + wdir * wlen, ws.y - poleH + droop + 4 * ws.s);
        ctx.lineTo(ws.x, ws.y - poleH + 4 * ws.s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(ws.x + wdir * wlen * 0.45, ws.y - poleH + droop * 0.45, wdir * wlen * 0.16, 4 * ws.s);
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

  /* golden motes: dust and pollen drifting through the sunset light */
  if (G.state === 'flying' || G.state === 'title') {
    for (let i = 0; i < 34; i++) {
      const mx = ((i * 389 + G.z * (0.35 + (i % 4) * 0.13) + G.time * (6 + (i % 3) * 3)) % (W + 60)) - 30;
      const my = 120 + ((i * 197 + G.z * 0.22) % 480) + Math.sin(G.time * 0.9 + i * 1.7) * 9;
      const tw = 0.5 + 0.5 * Math.sin(G.time * 2.2 + i * 2.3);
      ctx.fillStyle = 'rgba(255,220,150,' + (0.10 + tw * 0.16).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(mx, my, 1.3 + (i % 3) * 0.7, 0, 7); ctx.fill();
    }
  }

  /* speed streaks */
  if (G.state === 'flying' && G.speed > 78) {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const yy = ((i * 137 + G.time * 900) % 720);
      ctx.beginPath(); ctx.moveTo(8, yy); ctx.lineTo(8 + 46, yy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 8, yy); ctx.lineTo(W - 54, yy + 8); ctx.stroke();
    }
  }
  /* dusk-rain front (leg 3): a fog band on the horizon and slanted rain
     streaks cycling through the frame */
  if (leg.weather === 'rain') {
    const fog = ctx.createLinearGradient(0, hz - 60, 0, hz + 130);
    fog.addColorStop(0, 'rgba(168,164,190,0)');
    fog.addColorStop(0.45, 'rgba(168,164,190,0.30)');
    fog.addColorStop(1, 'rgba(168,164,190,0)');
    ctx.fillStyle = fog; ctx.fillRect(0, hz - 60, W, 190);
    ctx.strokeStyle = 'rgba(200,216,255,0.34)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 120; i++) {
      const rx2 = ((i * 173 + G.time * 620) % (W + 120)) - 60;
      const ry2 = ((i * 289 + G.time * 880) % (H + 80)) - 40;
      ctx.moveTo(rx2, ry2); ctx.lineTo(rx2 - 7, ry2 + 21);
    }
    ctx.stroke();
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
  /* wingtip vortex trails: ribbons that grow with speed and bank */
  const trail = clamp((G.speed - 45) / 60, 0, 1) * (0.5 + Math.abs(G.roll));
  if (trail > 0.05 && G.state !== 'title') {
    for (const sgn of [-1, 1]) {
      const tg = ctx.createLinearGradient(0, -18, 0, 90);
      tg.addColorStop(0, 'rgba(255,244,220,' + (0.34 * trail).toFixed(3) + ')');
      tg.addColorStop(1, 'rgba(255,244,220,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(sgn * 168, -20);
      ctx.quadraticCurveTo(sgn * (178 + G.roll * 30), 30, sgn * (150 + G.roll * 60), 96);
      ctx.quadraticCurveTo(sgn * (160 + G.roll * 30), 30, sgn * 176, -14);
      ctx.closePath(); ctx.fill();
    }
  }
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
  /* wing struts down to the fuselage */
  ctx.strokeStyle = '#8a5426'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-104, -13); ctx.lineTo(-13, 22);
  ctx.moveTo(104, -13); ctx.lineTo(13, 22);
  ctx.moveTo(-120, -11); ctx.lineTo(-14, 30);
  ctx.moveTo(120, -11); ctx.lineTo(14, 30);
  ctx.stroke();
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
  ctx.fillStyle = 'rgba(190,230,255,0.75)';
  ctx.beginPath(); ctx.roundRect(-9, -39, 3.4, 11, 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(4, -39, 3.4, 11, 2); ctx.fill();
  /* mail hatch outline + handle on the fuselage flank */
  ctx.strokeStyle = 'rgba(90,42,18,0.65)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.roundRect(-13, -16, 26, 24, 3); ctx.stroke();
  ctx.fillStyle = 'rgba(90,42,18,0.8)';
  ctx.fillRect(-2, -6, 4, 2.4);
  /* fixed landing gear: struts, wheels and a tail wheel */
  ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, 40); ctx.lineTo(-21, 62);
  ctx.moveTo(12, 40); ctx.lineTo(21, 62);
  ctx.moveTo(-21, 62); ctx.lineTo(21, 62);
  ctx.stroke();
  ctx.fillStyle = '#1c1c22';
  ctx.beginPath(); ctx.ellipse(-22, 66, 7.5, 9.5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(22, 66, 7.5, 9.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#cfd6dd';
  ctx.beginPath(); ctx.arc(-22, 66, 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(22, 66, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#1c1c22';
  ctx.beginPath(); ctx.ellipse(0, 56, 3.6, 4.6, 0, 0, 7); ctx.fill();
  /* exhaust glow at the tail, flickering with the throttle */
  const flick = 3 + G.throttle * 2.2 + Math.sin(G.time * 31) * 0.7;
  ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffb347';
  ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(-9, 50, flick, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(9, 50, flick, 0, 7); ctx.fill(); ctx.restore();
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
