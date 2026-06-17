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
| `la_strega` | La Strega | legendary | 10% bullets → XP, nearby dmg reduction |
| `il_professore` | Il Professore | world (7) | 2× XP range, 20% XP pre-fill per wave |
| `fantasma` | Fantasma | world (9) | Phase shift dash (invincible, slows time) |
| `il_cecchino` | Il Cecchino | world (3) | 3× dmg, 5× fire delay, 60 HP, 1.5× gear dmg, no split shots |
| `il_campione` | Il Campione | world (10) | 12% kills → mini lucky block, boss kills → +2 dmg |

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
