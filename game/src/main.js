/* GOLDEN HOUR — Fjord Mail Run · main.js
 * The main loop and boot.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
 */
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
