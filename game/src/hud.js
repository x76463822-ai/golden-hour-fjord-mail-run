/* GOLDEN HOUR — Fjord Mail Run · hud.js
 * HUD and the lit instrument panel: ALT/SPD/HDG, compass, gauges, bars.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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
  ctx.fillText('SCORE ' + G.score + (G.combo >= 2 ? '  STREAK ×' + (1 + Math.min(G.combo - 1, 4) * 0.5).toFixed(1).replace('.0', '') : ''), W - 30, 42);
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
  const wNow = Math.round(G.windNow);
  ctx.fillText('LIVES ' + '◆'.repeat(Math.max(0, G.lives)) + '   WIND ' + (wNow > 0 ? '+' : '') + wNow + 'kt' + (LEGS[G.leg].weather === 'gusts' ? ' GUSTING' : LEGS[G.leg].weather === 'rain' ? ' · RAIN' : ''), 780, y0 + 56);
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
