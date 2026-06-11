# Multi-World System — Phase 1: Framework, Progression, Boss Overhaul & Enemy Range AI

Date: 2026-06-11
Status: draft, awaiting review

## Overview

The game is currently one endless green arena with one enemy roster and 6 bosses
that **repeat** after wave 20. This introduces a **multi-world** structure: a
themed sequence of worlds, each with its own roster, bosses, theme, and wave
target. Beating a world plays a slain-boss cutscene, returns to the menu, unlocks
the next world, and auto-selects it for the player to enter.

Worlds (vertical descent, all Brainrot-themed):
- **World 1 — Grasslands** (surface). Existing roster. Target wave **20**.
- **World 2 — Dirt**. Target wave **30**.
- **World 3 — Underground**. **Endless** finale.

This is delivered in **phases**:
- **Phase 1 (this spec):** the whole framework + World 1 retheme on it + boss
  moveset overhaul + enemy shooting-range AI + a **dirt-tinted placeholder World 2**
  so the full unlock loop is playable end-to-end.
- **Phase 2:** real Dirt characters (bespoke sprites + unique behaviors).
- **Phase 3:** Underground characters.

### Decisions locked (from brainstorming)
- Bespoke rosters per world; **user supplies** the Brainrot characters for Worlds 2 & 3.
- **Full survivor reset each world** (Lv 1, no cards).
- 3 worlds; World 3 endless.
- ~10–12 enemies + **6 bosses** per world (boss every 5 waves → 6 covers wave 30; World 3 cycles its 6).
- World-complete routes **through the main menu** (cutscene → menu → unlock animation → default-select → player presses PLAY). NOT seamless mid-run transport.
- World 2 in Phase 1 = brown-tinted placeholder reusing World 1 sprites/bosses, swapped in Phase 2.
- Persist highest unlocked world in `localStorage`.

---

## Part 1 — World data model

A `WORLDS` array is the single source of truth. Each entry:

```js
{
  id:'grass',
  name:'Grasslands',
  waveTarget:20,        // boss wave that completes the world; null/0 when endless
  endless:false,
  theme:{
    ground1:'#7fb84e', ground2:'#76ae47',   // checker tiles
    void:'#3f6a2b',                           // outside-world fill
    wall:'#5b8a39', post:'#4a7330',           // border band + posts
    bg:'#6fae3d',                             // canvas/body background
    tint:null,                                // optional sprite tint (placeholder worlds)
    music:'game'                              // base track key
  },
  foes:FOES_GRASS,      // array, same shape as today's FOES
  bosses:BOSSES_GRASS   // array, same shape as today's BOSSES
}
```

**Refactor:** today's global `const FOES` / `const BOSSES` become the World-1
arrays (`FOES_GRASS`, `BOSSES_GRASS`). The *active* roster is referenced through
mutable bindings set on world load:

```js
let curFoes = WORLDS[0].foes;
let curBosses = WORLDS[0].bosses;
let curTheme = WORLDS[0].theme;
```

`spawnEnemy()` reads `curFoes`; `spawnBoss()` reads `curBosses`. Minimal change to
those functions (swap `FOES`→`curFoes`, `BOSSES`→`curBosses`).

World 1's `foes`/`bosses` are exactly today's arrays and its `theme` is today's
exact colors → **no visible change to World 1** except the boss overhaul and the
enemy-range AI below.

---

## Part 2 — Progression, save & world loading

### New state
```js
let worldIdx = 0;                                  // active world
let unlockedMax = +(localStorage.getItem('br_unlocked')||0);  // highest unlocked index
let selWorld = unlockedMax;                         // world chosen in the menu carousel
function curWorld(){ return WORLDS[worldIdx]; }     // active-world accessor
```

### `loadWorld(idx)`
Sets `worldIdx=idx`; points `curFoes/curBosses/curTheme` at `WORLDS[idx]`. Does
**not** itself reset the player — callers (`startGame`) handle the full reset.

### World completion
`waveTarget` is always a boss wave (20, 30). The world completes when that wave's
boss dies. In the boss-death branch (game.js ~663), detect:
```js
if(e.isBoss && !curWorld().endless && wave >= curWorld().waveTarget){
  worldCleared();   // cutscene path (Part 4), suppress the normal "BOSS DOWN" + reopen
} else { /* existing boss-down behavior */ }
```
Endless World 3 never triggers completion — waves keep climbing.

### Unlock persistence
`worldCleared()` sets `unlockedMax = max(unlockedMax, worldIdx+1)` (clamped to
`WORLDS.length-1`) and writes `br_unlocked`. `selWorld` is set to the newly
unlocked index so the menu defaults to it.

---

## Part 3 — Theme system

The ground, void, wall band, posts, and background are currently hardcoded greens
in `render()` (ground ~919-930), `drawBorder()` (~1103-1116), and the page
background. Pull each color from `curTheme`:
- `render()` ground checker → `curTheme.ground1/ground2`, void → `curTheme.void`.
- `drawBorder()` band/posts → `curTheme.wall/post`.
- Canvas clear / body bg → `curTheme.bg`.

**Sprite tint:** `drawSprite` (sprites are pre-rendered canvases) gets an optional
tint pass — when `curTheme.tint` is set, draw the sprite then composite a
`source-atop` translucent fill of `tint` over enemies/bosses. World 1 `tint:null`
= untouched. World 2 placeholder uses a brown tint so reused sprites read as "dirt".

(Phase 2/3 real rosters set `tint:null` and ship their own colored sprites.)

---

## Part 4 — World-cleared cutscene & menu unlock animation

### Slain-boss cutscene (`worldCleared()`)
Stylized using existing FX — **no hand-drawn frames**:
1. Enter a `ST.CUTSCENE` state (freezes normal update; a dedicated `cutsceneUpdate`
   runs). Strong `hitstop`/slow-mo, `shake`.
2. The boss plays a death animation: scale-up + flash, repeated particle bursts
   (`burst`), then fade its alpha to 0 over ~1.5s. Enemy bullets cleared.
3. Big banner: **"WORLD CLEARED"** (world name beneath), `sfx.win()`, victory music.
4. Screen fades to the theme color, then routes to the menu (`toMenuFromClear()`).

### Menu unlock animation
On arriving at the menu after a clear:
- Show the menu overlay; set the carousel `selWorld` to the newly unlocked world.
- Play a **"NEW WORLD UNLOCKED"** reveal: the carousel name/icon for the new world
  animates in (slide/scale + glow pulse, CSS class toggled for ~1.5s).
- The player presses **PLAY** to enter the new world (fresh Lv 1 run).

This reuses the normal menu; it is not a separate screen.

---

## Part 5 — World-select carousel (menu)

A compact selector above/around the PLAY button:

```
   ◀   WORLD 2 · DIRT   ▶
          [ PLAY ]
```

- `◀ ▶` cycle through **unlocked** worlds only (`0..unlockedMax`).
- Locked worlds are not reachable by the arrows; if shown at the edge they render
  greyed as `WORLD 3 · ??? 🔒`.
- Carousel **defaults to `selWorld`** (= best unlocked, or the just-unlocked world).
- **PLAY** launches `startGame(selWorld)`.
- New DOM: a `#worldsel` row (prev btn, label, next btn) inside `#menumid`/above
  `#menubot`. Styled to match `.curpill`/`.bigbtn` aesthetics.

### `startGame(idx)`
Extends the current `startGame`: `loadWorld(idx)`, full `resetPlayer()`, `wave=1`,
clear entities, set music to `curTheme.music`, then `startWave()` as today.

---

## Part 6 — Boss moveset overhaul

Fixes the "bad late game": every World-1 boss gets a **distinct identity**;
`trippi` and `gorillo` currently reuse generic `spiral`/`ring16`/`aimed5`.

Two **new move primitives** added to `execMove`/`bossMoves`/`MOVE_COL`:
- **`roll`** (Gorillo) — telegraphed rolling-melon charge: a wind-up line tell,
  then the boss barrels in a straight line (like the dash primitive) while
  spraying seed bullets sideways; leaves 1–2 short ground zones along the path.
- **`warp`** (Trippi) — blink-teleport: boss vanishes (particle implosion),
  reappears near the player after a short tell, immediately fires a disorienting
  double-spiral burst. Optional brief `P.slowT` nudge for the "trippy" feel.

Revised per-boss pools:
| Boss | Pool | Signature |
|------|------|-----------|
| Tralalero | `dash, spiral, aimed3` | fast dasher (tightened) |
| Bombardiro Crocodilo | `carpet, ring16` | carpet bombing |
| Tung Sahur | `slam, aimed5, dblslam` | rhythmic slams |
| La Vaca Saturno | HP-phased `ring/pull/spiral` | gravity phases (unchanged) |
| Gorillo Watermellondrillo | `roll, seedsmash, ring12` | **rolling melon** |
| Trippi Troppi | `warp, spiral, ring16` | **warp/illusion** |

`spawnBoss` inits any new fields the moves need (`roll` reuses dash fields `da/dwin/ddur`;
`warp` needs a short `warpT`).

---

## Part 7 — Enemy shooting-range AI (all worlds)

**Problem:** enemies walk straight into the player and shooters fire from any
distance (game.js 620-639).

**New behavior** in the non-boss movement block:
- Add `range` to shooting foe defs (default ~320 if a shooter omits it). Melee
  foes have no `range` and chase as today.
- Movement decision per shooter:
  - `dist > range` → walk toward player (approach).
  - `dist <= range` → **stop** (stationary shooter) and fire when `shootCd` ready.
    If `dist < range*0.55` → step away from the player (kite) so melee pressure
    still matters.
  - Foes flagged `move:true` (in `shoot`) → **strafe/orbit**: when in range, move
    perpendicular to the player line (with the existing wobble) instead of standing
    still, firing as they go.
- **Fire gate:** the shoot block only fires when `dist <= range` (and `wave>=3` as
  today). AoE/support behaviors are unchanged.

Tag a subset of existing World-1 shooters `move:true` (e.g. tiger, ballerina) so
the field isn't all statues; the rest become stand-and-shoot.

---

## Files touched (Phase 1)

- `js/game.js` — `WORLDS` data, `curFoes/curBosses/curTheme`, `loadWorld`,
  `worldCleared`/cutscene, world-select wiring, `startGame(idx)`, boss overhaul
  (new moves), enemy range AI, theme-driven render colors.
- `js/sprites.js` — optional tint compositing in `drawSprite` (or a tint helper).
- `js/core.js` — add `ST.CUTSCENE`; theme-driven bg if bg lives here.
- `index.html` — `#worldsel` carousel DOM; unlock-animation hooks.
- `styles.css` — carousel + unlock-animation + cutscene banner styling.

## Out of scope (Phase 1)
- Real Dirt / Underground characters & their unique behaviors (Phases 2 & 3).
- Per-world music composition (placeholder reuses existing tracks).
- Hand-drawn cutscene art (cutscene is FX-driven).

## Verification (Phase 1)
Headless harness driving `update()`:
- World data: `WORLDS.length===3`, world-1 colors equal today's.
- Progression: clearing wave-20 boss → `ST.CUTSCENE` → menu, `br_unlocked` becomes 1,
  carousel defaults to World 2.
- World select: arrows clamp to `unlockedMax`; `startGame(1)` loads dirt theme + tint.
- Boss overhaul: each boss pool distinct; `roll`/`warp` execute without errors.
- Range AI: a shooter beyond `range` approaches and does NOT fire; within `range`
  stops and fires; `move:true` shooter strafes.
- Full-load smoke test via the real menu + a paused render frame screenshot.
