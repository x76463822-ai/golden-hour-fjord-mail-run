# GOLDEN HOUR — Fjord Mail Run

Entry for the make.fun bounty
[Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057).

Fly the last mail plane of the day down a sunset fjord valley: thread the
glowing delivery rings, mind the peaks, the balloons and your fuel, and land
on the mountain airstrip before dark. 3 legs, 36 rings, crosswinds, and a
sky that slides from golden hour into dusk.

## Play it

Open `game/index.html` in a desktop browser (Chrome recommended), or serve
the folder:

```sh
cd game && python3 -m http.server 8000
# then open http://localhost:8000/
```

No network, no external files: all art is procedural canvas drawing and all
sound is synthesized with WebAudio.

## Controls

- **Arrows / WASD** — steer (bank & turn) and climb / descend
- **Shift / Ctrl** — throttle up / down
- **Mouse** — steer by position
- **P** — pause, **M** — mute, **R** — restart, **Enter** — start / continue

## The game

- **3 legs**: River Valley, Crosswind Pass (+6 kt wind), Dusk Ridge (−8 kt).
  Each leg has 12 glowing delivery rings along a winding valley, then a lit
  mountain airstrip (runway 27) to land on.
- **Rings**: +100 each (+150 for a perfect centre pass), +6% fuel each.
- **Hazards**: rocky peaks with red beacons, hot-air balloons, the valley
  floor, and an empty tank. 3 lives; you respawn at your last ring.
- **Landing**: line up on the runway, come in low and gentle — a good
  landing pays +500 plus time and fuel bonuses.
- **HUD**: altitude, speed and heading, a compass strip, score, rings,
  time, fuel, and a next-ring guide.
- **Instruments** (lit panel): attitude indicator, airspeed, altimeter,
  vertical speed, throttle and fuel.
- **Sound**: synthesized engine drone, wind, ring chimes, landing fanfare —
  no audio files.

## Screenshots

`screenshots/` holds 4 real renders (JPEG, each under 256 KiB) of the
game's own code, taken in deterministic staged states
(`?shot=title|ring|runway|complete` — the same code path, autopilot-flown,
frozen for the shot; see `shots.json`):

1. `1-title.jpg` — title screen over the valley at golden hour
2. `2-ring.jpg` — mid-flight, threading a glowing ring
3. `3-runway.jpg` — final approach to runway 27
4. `4-complete.jpg` — leg-complete tally

## Files

- `main.ts` — Node 22 entry point: verifies the game bundle and writes it
  to `out/` (see `DOSSIER.md` for the outline)
- `vendor/makefun-game.ts` — copied from the competition kit, unchanged
- `game/` — the playable game as static files (`index.html`, `game.js`)
- `screenshots/` — 4 real renders
- `DOSSIER.md` — outline of the game and its source, for the judge

## License

MIT — see `LICENSE`.
