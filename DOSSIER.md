# Dossier — GOLDEN HOUR: Fjord Mail Run

**One line:** fly the last mail plane of the day down a sunset fjord
valley — 3 legs, 36 glowing delivery rings, 3 weather fronts (clear,
gusting crosswind, dusk rain), 9 thermals to ride, combo streaks up to
×3, 6 feats to earn, and a mountain airstrip to land on before dark.

## What it is

A complete, original arcade flight game that runs offline from static
files (`game/index.html` + eight plain scripts under `game/src/`, zero
dependencies, zero network). Chase view over a procedural fjord valley
at sunset; keyboard and mouse; synthesized sound; menus, lives,
scoring, feats, and a finish.

## Source layout (one clear job per file)

- `game/src/core.js` — canvas, helpers, keyboard/mouse input, the leg
  table and the shared game state.
- `game/src/audio.js` — WebAudio synthesis: engine, wind, chimes, fanfare.
- `game/src/world.js` — seeded world generation (rings, peaks, hazards,
  thermals, balloons, river, ground patches) and game flow.
- `game/src/flight.js` — the flight model: steering, gusts, thermals,
  combo streaks, hazards, the landing window and feat judging.
- `game/src/render.js` — the pseudo-3D chase renderer: sky, terrain,
  rings, runway, weather and the plane.
- `game/src/hud.js` — HUD and the lit instrument panel.
- `game/src/screens.js` — title/tally screens, title autopilot and the
  deterministic screenshot states.
- `game/src/main.js` — the main loop and boot.

## Systems (all real, all in the code)

- **Pseudo-3D chase renderer** — perspective projection of a seeded
  world: 90 ridge peaks with snow caps, a hazy mid-ground ridge, 160
  two-tone pines, 46 ground patches (forest, meadow, ploughed fields),
  26 three-tone cumulus clouds, a star field that deepens as dusk
  falls, a winding blue river with sandy banks and animated sparkle,
  and 3 sky palettes that slide from golden hour into dusk.
- **Flight model** — bank-to-turn, pitch-to-climb, throttle, crosswind
  drift, fuel burn tied to throttle, and an obstacle-aware autopilot
  (PD steering, glide-slope final, peak avoidance) that flies the
  title attract mode and proves every leg is completable.
- **Weather fronts, one per leg** — leg 1 clear; leg 2 a gusting
  crosswind (base +6 kt with a slow swell and a faster chop, shown live
  on the panel and streamed by the runway windsock); leg 3 a dusk rain
  front (−8 kt, horizon fog band, 120 rain streaks, reduced light).
- **36 delivery rings** (12 per leg, seeded winding path, gold/teal/
  pink) with rotating dashed halos, light orbs on the next ring, a
  next-ring guide and chevron, perfect-centre bonus (+150 vs +100),
  and a fuel top-up per ring.
- **Combo streaks** — consecutive rings multiply the take by up to ×3;
  a miss or a crash breaks the streak. Shown live beside the score.
- **9 thermals** (3 per leg) — rising-air columns parked between rings,
  each marked by a circling hawk and a shimmer of rising light: ride
  one for free altitude and +50.
- **Hazards** — 7 beacon-topped rocky peaks and 5 striped hot-air
  balloons per leg, the valley floor, and fuel exhaustion; world
  generation guarantees no peak camps on a ring centre or the spawn
  corridor. 3 lives, respawn at the last ring, screen shake and a
  debris burst on impact.
- **Landing** — a lit airstrip (threshold piano keys, touchdown marks,
  centreline dashes, amber edge lights, live PAPI glide-slope lights,
  windsock, runway number 27) with a real landing window: alignment,
  altitude and sink rate all checked; +500 plus time and fuel bonuses.
- **6 feats per leg, judged at the tally** — FULL HOUSE (every ring),
  CLEAN SHEET (no crashes), ON FIRE (streak ×3), FUEL MISER (half a
  tank left), THERMAL RIDER (two lifts), DEADLINE BEATER (under 2:20).
- **HUD** — altitude / speed / heading in large numerals, a scrolling
  compass strip, score with live streak multiplier, rings, leg time,
  fuel bar, and a next-ring distance readout.
- **Lit instrument panel** — attitude indicator (bank + pitch),
  airspeed dial, altimeter dial, vertical-speed dial, throttle and
  fuel bars, lives, live wind and weather, and a control reminder.
- **The plane** — a procedural bush mail plane: gradient wings with
  struts, fixed landing gear, cockpit glass glint, mail hatch,
  throttle-flickered exhausts, wingtip nav lights and vortex trails.
- **Sound** — WebAudio synthesis only: engine drone that follows the
  throttle, wind noise that follows speed, ring chimes, a landing
  fanfare, crash and low-fuel warnings. Mute with M.
- **Game flow** — title screen with an autopilot attract mode, pause,
  leg-complete tally (rings, bonuses, feats), game over, and an
  all-mail-delivered finale. Deterministic seeded worlds, so every
  run of a leg is the same valley.
- **Screenshots** — 4 real renders via deterministic `?shot=` states
  (hero / runway / title / complete) using the same render code path.

## Controls

Arrows/WASD steer and climb/descend · Shift/Ctrl throttle · mouse
steers · P pause · M mute · R restart · Enter start/continue.

## Originality

Own idea, art, sounds and names. No assets, music or characters from
any commercial game. The plane, valley, rings and instruments are all
drawn procedurally in code.
