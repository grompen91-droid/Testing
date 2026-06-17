# Character System — Agent Guide

Everything you need to create, modify, and wire up a character correctly.

---

## Files

| File | Role |
|---|---|
| `js/characters.js` | All draw functions + `CHARACTERS` array + utility functions. **This is the only file you normally touch.** |
| `js/game.js` | `resetPlayer()` — default P stats. Add new P flags here if your character needs them. Also houses `openLevelUp()` — the card pool where `P.bannedCards` is filtered. |
| `js/recruit.js` | Shop logic. `rare`/`epic` chars show in the daily shop; `legendary` in the weekly shop; `world` chars are never sold. |

---

## Character Object Structure

```js
{
  id: 'my_char',           // unique snake_case string — used everywhere as the key
  name: 'My Char',         // display name
  desc: 'One line shown in shop/select screen.',
  rarity: 'rare',          // 'world' | 'rare' | 'epic' | 'legendary'
  worldUnlock: null,       // only for rarity:'world' — int world index (0-based). null = shop-only
  baseStats: {             // applied on top of resetPlayer() defaults
    maxHp: 80,
    dmg: 14,
    fireRate: 0.28,
    speed: 220,
    range: 400,
    // any P.* key that exists in resetPlayer()
  },
  register() {
    // Called once at game start. Set P flags + attach hooks here.
  },
  draw(ctx, size, t) {
    // Called every frame to render the character sprite.
    // ctx is already translated to (x, y). size ≈ 46. t = elapsed seconds.
  }
}
```

---

## Rarity & Unlock Rules

| Rarity | How player gets it | Shop pool |
|---|---|---|
| `world` | Auto-unlocked when `br_unlocked >= worldUnlock` | Never appears in shop |
| `rare` | Buy with gems (50 gems) | Daily shop (3 random rare/epic each day) |
| `epic` | Buy with gems (100 gems) | Daily shop |
| `legendary` | Buy with gems (150 gems) | Weekly shop (1 per week) |

For `world` characters set `worldUnlock` to the world index (0 = Grasslands unlocked from start).
For shop characters set `worldUnlock: null`.

---

## baseStats Reference

These are the defaults from `resetPlayer()`. Only override what you need:

```
maxHp:    100     hp:       100
dmg:      10      fireRate:  0.32   (seconds between shots — lower = faster)
speed:    200     range:     330
shots:    1       pierce:    0
crit:     0.05    critMul:   3
armor:    1       regen:     0
magnet:   90      bulletR:   1      bulletSpd: 1
dashMax:  2.2     spread:    1
```

**fireRate** is a cooldown in seconds. `0.32` = ~3 shots/sec. `1.6` = very slow sniper. `0.18` = very fast.

---

## Available Hooks

Register hooks inside `register()` using `onHook(name, fn)`. All hooks are cleared between runs automatically.

| Hook | When it fires | Payload |
|---|---|---|
| `waveStart` | Start of each wave | — |
| `waveEnd` | End of each wave | — |
| `onKill` | Enemy dies | `e` (enemy object) |
| `onBossKill` | Boss dies | — |
| `onDash` | Player dashes | — |
| `onLevelUp` | Player levels up (before cards shown) | — |
| `onCardPick` | Player picks a level-up card | — |
| `onEnemyShoot` | Enemy fires a bullet | — |
| `onLuckySpawn` | Lucky block spawns | `lb` (block object) |
| `getLuckyCap` | Queries max lucky blocks on screen | return a number |
| `petTick` | Every frame during gameplay | `dt` |
| `playerShoot` | Player fires a shot | `best` (target enemy) |
| `onHpZero` | Player HP reaches 0 | — |

Use `queryHook(name)` for hooks that return values (like `getLuckyCap`).

---

## Useful P Flags

Set these directly in `register()` or via `baseStats`:

```js
P.bannedCards = ['shots']     // array of upgrade IDs to hide from card pool
P.luckyBullets = true         // bullets are lucky blocks
P.noCrit = true               // disable crits
P.luckyBlockDmgMul = 2.5      // multiplier for lucky block damage
P.gearDmgMul = 0.4            // fraction of gear damage this char receives
P.phaseShift = true           // use phase shift instead of normal dash
P.noSplitShots = true         // (custom — add your own check in openLevelUp if needed)
```

---

## Banning Cards

To prevent a character from getting specific upgrade cards, set `P.bannedCards` in `register()`:

```js
register() {
  P.bannedCards = ['shots', 'radial'];  // 'shots' = multi-shot card; 'radial' = Omni-Barrage
}
```

`openLevelUp()` in `game.js` filters these out. Also add an `onLevelUp` hook as a safety net if the stat could leak from another source:

```js
onHook('onLevelUp', () => { P.shots = 1; });
```

If you add a brand new flag to `P`, also add it to `resetPlayer()` in `game.js` so it resets cleanly between runs.

---

## Drawing Characters

Draw functions run every frame. All drawing happens in a local coordinate space centered on the character — you don't need to translate to `(x, y)` yourself, it's done before the call.

**Coordinate system:** origin `(0, 0)` is the character's center. Y increases downward. `size` ≈ 46px at normal zoom.

**Shared helpers (all in `characters.js`):**

```js
_humanBase(ctx, size, legCol, bodyCol, armCol, skinCol)
// Draws two legs, torso, two arms, round head

_stdHead(ctx, size, color)
_stdBody(ctx, size, color, wFrac, hFrac, yFrac)

_fillR(ctx, size, col, x, y, w, h, r)   // rounded rect, auto-outlined
_fillE(ctx, size, col, x, y, rx, ry)    // ellipse, auto-outlined
_eyes(ctx, size, yFrac, spread, hollow)  // dot eyes; hollow=true for ghost-style

_stroke(ctx, size)  // apply the standard dark outline to whatever path is open
```

**Fractions:** all sizes are expressed as multiples of `size` so the character scales correctly. Example: `size*0.16` for a head radius, `size*0.24` for head Y offset.

**Animation:** `t` is elapsed game time in seconds. Use `Math.sin(t * speed)` for bobbing, pulsing, or rotating accents.

**Always `ctx.save()` / `ctx.restore()`** when using transforms like `ctx.rotate`, `ctx.scale`, or `ctx.translate` inside a draw function.

**Load order:** define `_drawMyChar` *before* the `CHARACTERS` array (follow the pattern of all existing characters).

---

## Adding a New Character — Checklist

1. Add `_drawMyChar(ctx, size, t)` above the `CHARACTERS` array in `characters.js`
2. Add the character object to the `CHARACTERS` array
3. If you need a new P flag, add it with a default value in `resetPlayer()` in `game.js`
4. If you ban cards, verify the card `id` matches the id in the `UPGRADES` array in `game.js` (line ~504)
5. Choose the right `rarity` — it controls where/how the player unlocks it
6. Test that switching away from the character and back resets all flags cleanly

---

## Existing Characters (quick reference)

| id | Name | Rarity | Key mechanic |
|---|---|---|---|
| `gianni` | Gianni | world (0) | Balanced default |
| `fortunato` | Fortunato | world (3) | Lucky bullets, no crits |
| `bombardella` | Bombardella | rare | +40% dmg, gains temp shots per 10 kills/wave |
| `sorella_veloce` | Sorella Veloce | rare | +35% speed, double dash |
| `zio_schermo` | Zio Schermo | epic | Wave-start shield, +15% armor |
| `doppione` | Doppione | epic | 40% ghost copy of every card pick |
| `il_professore` | Il Professore | world (7) | 2× XP range, 20% XP pre-fill per wave |
| `fantasma` | Fantasma | legendary (shop only) | Infinite piercing, translucent shots, stealth aggro |
| `il_cecchino` | Il Cecchino | world (3) | 3× dmg, 5× fire delay, 60 HP, 1.5× gear dmg, no split shots |
| `il_campione` | Il Campione | world (10) | 12% kills → mini lucky block, boss kills → +2 dmg |
| `engineer` | Engineer | world (1) | No player bullets; 2 turrets share all his stats; dash places a stationary turret; exclusive Minigun/Flamethrower turret cards |

---

## Cutscenes — Agent Guide

The game has two distinct cutscene mechanisms. Use the right one — they are not interchangeable.

| | **In-run cutscene** (`ST.CUTSCENE`) | **Full-screen cutscene** (`ST.INTRO`-style) |
|---|---|---|
| Use for | Boss death / world-cleared / level-end transitions | Pre-level story beats, one-time intros, anything that needs its own stage timeline with captions |
| Reference impl | `worldCleared()`, `cutsceneUpdate()` in `js/game.js` (~line 462) | `startIntro()`, `introUpdate()`, `introRender()` in `js/game.js` (~line 534) |
| Camera/world | Still uses the real camera + world (`computeCamera()`); enemies/particles are real game entities | Pure screen-space (`W`/`H` only) — no camera, no world coordinates, fixed background drawn by hand |
| Driven by | A single `cut = {t, boss, alpha, fade, name}` object, advanced every frame in `cutsceneUpdate(dt)` | A flat elapsed-time counter (`introT`) plus a fixed timeline of `if(t>a && t<b)` stage blocks |
| Rendered via | Folded into the normal `render()` pipeline (boss draws itself, scaled/faded) | Its own `introRender()`, called **instead of** `render()` for that state |
| Exit | After a fixed duration, sets `state` back and calls a continuation function (`toMenuFromClear()`) which shows an HTML overlay (`#world-cleared`) | Calls `finishIntro()` → a `onDone` callback passed in at `startIntro(onDone)`, plus sets a `localStorage` flag so it never replays |

### Implementing an in-run cutscene (boss death / level clear style)

Follow `worldCleared()` exactly:

1. Stop normal gameplay: clear `enemies`/`bullets`/`ebullets`/`petBullets`/`zones` arrays except the one entity you want to keep on screen (e.g. `enemies.length=0; enemies.push(boss);`).
2. Set `boss.cut = true` and any `deathScale`/animation field the boss's own draw code already reads — you are reusing its existing draw function, not writing a new one.
3. Set `state = ST.CUTSCENE` and populate the shared `cut` object: `{t:0, ...whatever your update fn needs, alpha:1, fade:0}`.
4. Call `stopMusic()` + the relevant one-shot `sfx.*()` **once**, at trigger time — never inside the per-frame update.
5. `hitstop` + `shake` give the moment weight for free — reuse them (`hitstop=0.25; shake=Math.max(shake,16);`) instead of inventing a new effect.
6. Write the per-frame advance in a `*Update(dt)` function dispatched from `loop()` when `state===ST.CUTSCENE` (see line ~4075). Keep it cheap: a few scalar lerps/fades, no allocations per frame.
7. When the timer crosses its end threshold, null out the cutscene state and call a continuation function that shows the HTML overlay (follow `toMenuFromClear()` — populate text/icons from a small plain-data object you stashed earlier, e.g. `_clearData`, rather than recomputing on the fly).
8. If you need a second variant (e.g. challenger-mode clear), don't fork the state machine — reuse `ST.CUTSCENE`/`cut`, just stash a different payload (see the challenger clear path ~line 1112, which reuses the exact same `cut` object shape with a different `name`).

### Implementing a full-screen / pre-level cutscene (intro style)

Follow `startIntro()` / `introUpdate()` / `introRender()` exactly:

1. Add a dedicated state to the `ST` enum in `js/core.js` only if this is a genuinely new full-screen takeover (don't add a new state for something `ST.CUTSCENE` already covers).
2. Write the whole thing as **one flat timeline function** keyed off a single elapsed-time counter, using `if(t>a && t<b){...}` stage blocks in one function (`introRender`). Don't split stages into separate functions/objects — the flat version is what makes the timeline easy to scrub and re-time.
3. Never touch `computeCamera()` or world coordinates — position everything as fractions of `W`/`H` (e.g. `h.x*W, h.y*H`) so it's resolution-independent.
4. Reuse `easeOut(t)` for any movement that should decelerate into place — don't write a new easing curve per cutscene.
5. Captions: reuse the `introCaptionAlpha(t,t0,t1)` + `introCaption(str,t,t0,t1,y)` pair verbatim for any timed on-screen text — they already handle fade-in/hold/fade-out and auto-shrink text that's too wide. Don't hand-roll new caption logic.
6. Always guard local screen-shake with a **local** variable (`introShakeAmt`), never write to the shared `shake` global from inside a screen-space cutscene — `shake` is decayed by `update()`, which doesn't run during these states, so a write here leaks a stuck shake into real gameplay afterward.
7. Wire it into `loop()`: when your state is active, call your `*Update(dt)` then your `*Render()` **instead of** `update(dt)`/`render()` (see line ~4076 — `if(state===ST.INTRO) introRender(); else render();`).
8. Gate one-time cutscenes behind a `localStorage` flag (`br_seen_intro` pattern) and call the finish/continuation callback (`onDone`) rather than hardcoding what happens next — let the caller decide (see `wantsIntro ? startIntro(()=>startGame(0)) : startGame(0)`).
9. Always provide a skip path (`#introskip` button) that calls the same finish function the natural timeout would — don't make skip a separate code path with different cleanup.

### Optimization rules for any cutscene

- **No per-frame allocations.** Update functions run every frame for the cutscene's duration — mutate existing fields (`cut.t += dt`), don't create new objects/arrays each tick.
- **Precompute anything expensive once.** If a cutscene needs a rendered emblem/portrait, build it to an offscreen canvas once and cache the `toDataURL()` result (see `worldEmblemURL`/`_emblemURL` cache) — never re-render to a canvas every frame.
- **Reuse existing particle/text systems** (`parts`, `texts`, `burst()`, `bigText()`) instead of inventing new effect arrays — they're already pooled/cleaned up by the existing update loops.
- **One-shot audio/state changes belong at trigger time**, not inside `*Update(dt)` — calling `stopMusic()`/`sfx.win()` every frame is both wasteful and audibly broken.
- **Keep screen-space cutscenes resolution-independent.** Every position/size should derive from `W`/`H` fractions, not hardcoded pixels — this game's canvas is resized per device.
- **Don't block input handling design on the cutscene.** Both existing cutscenes are non-interactive by design (aside from a skip button) — if a new cutscene needs player input mid-cutscene, that's a sign it should probably just be regular gameplay with restricted controls, not a cutscene state.

---

## Update Log & Versioning (read this on every push)

The game has an in-game Update Log: Settings → "Update Log" (`#changelogdrop` in `index.html`, wired in `js/game.js`). Its data lives in `js/changelog.js` (`CURRENT_VERSION` + `CHANGELOG` array, newest entry first).

**Every push that changes the game must:**
1. Add a new entry to the top of `CHANGELOG` in `js/changelog.js` — one short, player-facing line describing what changed.
2. Bump `CURRENT_VERSION` using this rule:
   - **Patch / small update / bugfix** → `+0.01` (e.g. `1.02` → `1.03`)
   - **Big update / rework** → `+0.1` (e.g. `1.03` → `1.13`)
   - **Major release** → `+1.0` (e.g. `1.13` → `2.13`)
3. Set the new entry's `v` to the new `CURRENT_VERSION`.

This applies to every push that changes gameplay, UI, balance, or fixes a bug — not doc-only or comment-only changes.
