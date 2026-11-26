/* GOLDEN HOUR — Fjord Mail Run · core.js
 * Canvas, helpers, keyboard/mouse input, the leg table and the shared game state.
 * Part of one self-contained game: plain classic scripts, no build
 * step, no network, no external assets. Loaded by game/index.html.
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


/* ---------- game state ---------- */
const LEGS = [
  { name: 'LEG 1 — RIVER VALLEY', sky: ['#1b2350', '#e8734a', '#f7b733'], sunY: 300, wind: 0,  rings: 12, length: 5600, weather: 'clear' },
  { name: 'LEG 2 — CROSSWIND PASS', sky: ['#241a4d', '#d95b43', '#f08a2e'], sunY: 330, wind: 6,  rings: 12, length: 6200, weather: 'gusts' },
  { name: 'LEG 3 — DUSK RIDGE', sky: ['#120f33', '#8f3d5e', '#e0653a'], sunY: 355, wind: -8, rings: 12, length: 6800, weather: 'rain' },
];
/* star field (fixed pseudo-random positions, drawn in the upper sky) */
const STARS = (() => { const r = mulberry32(777); const a = []; for (let i = 0; i < 110; i++) a.push({ x: r() * 1280, y: r() * 300, s: r() }); return a; })();
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
  windNow: 0, combo: 0, bestCombo: 0, legCrashes: 0, thermalsUsed: 0, featsTotal: 0,
};
/* live wind: the leg's base crosswind plus, on the gusts front, a slow
   swell and a faster chop that the pilot (and the panel) can feel */
function liveWind() {
  const leg = LEGS[G.leg];
  if (leg.weather !== 'gusts') return leg.wind;
  return leg.wind + Math.sin(G.time * 0.45) * 3.4 + Math.sin(G.time * 1.31) * 1.7;
}
let world = null; // { rings, peaks, trees, clouds, runwayZ, balloons, riverPts }
