# Dossier — GOLDEN HOUR: Fjord Mail Run

**One line:** fly the last mail plane of the day down a sunset fjord
valley — 3 legs, 36 glowing delivery rings, crosswinds, balloons and peaks
to dodge, fuel to mind, and a mountain airstrip to land on before dark.

## What it is

A complete, original arcade flight game in a single self-contained page
(`game/index.html` + `game/game.js`, ~1,000 lines, zero dependencies, zero
network). Chase view over a procedural fjord valley at sunset; keyboard and
mouse; synthesized sound; menus, lives, scoring, and a finish.

## Systems (all real, all in the code)

- **Pseudo-3D chase renderer** — perspective projection of a seeded world:
  90 ridge peaks with snow caps, 160 pines, 26 clouds, a winding blue river
  with a sun streak, a valley road, 3 sky palettes that slide from golden
  hour into dusk across the legs.
- **Flight model** — bank-to-turn, pitch-to-climb, throttle, crosswind
  drift (+6 kt leg 2, −8 kt leg 3), fuel burn tied to throttle.
- **36 delivery rings** (12 per leg, seeded winding path, gold/teal/pink)
  with a next-ring guide, chevron, perfect-centre bonus (+150 vs +100),
  and a fuel top-up per ring.
- **Hazards** — 7 beacon-topped rocky peaks and 5 hot-air balloons per
  leg, the valley floor, and fuel exhaustion; 3 lives, respawn at the last
  ring, screen shake and a debris burst on impact.
- **Landing** — a lit airstrip (threshold, centreline dashes, amber edge
  lights, runway number 27) with a real landing window: alignment,
  altitude and sink rate all checked; +500 plus time and fuel bonuses.
- **HUD** — altitude / speed / heading in large numerals, a scrolling
  compass strip, score, rings, leg time, fuel bar, and a next-ring
  distance readout.
- **Lit instrument panel** — attitude indicator (bank + pitch), airspeed
  dial, altimeter dial, vertical-speed dial, throttle and fuel bars,
  lives, wind, and a control reminder.
- **Sound** — WebAudio synthesis only: engine drone that follows the
  throttle, wind noise that follows speed, ring chimes, a landing
  fanfare, crash and low-fuel warnings. Mute with M.
- **Game flow** — title screen with an autopilot attract mode, pause,
  leg-complete tally (rings, time bonus, fuel bonus), game over, and an
  all-mail-delivered finale. Deterministic seeded worlds, so every run of
  a leg is the same valley.
- **Screenshots** — 4 real renders via deterministic `?shot=` states
  (title / ring / runway / complete) using the same render code path.

## Controls

Arrows/WASD steer and climb/descend · Shift/Ctrl throttle · mouse steers ·
P pause · M mute · R restart · Enter start/continue.

## Originality

Own idea, art, sounds and names. No assets, music or characters from any
commercial game. The plane, valley, rings and instruments are all drawn
procedurally in code.
