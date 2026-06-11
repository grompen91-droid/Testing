# World 2 — DIRT DEPTHS: Enemy Roster + Boss Ability Design

**Date:** 2026-06-11
**Scope:** A full new enemy section (~24 foes, 5 tiers) and 6 unique multi-phase bosses for
World 2 (`DIRT DEPTHS`, `waveTarget:30`). Boss waves land at **5 / 10 / 15 / 20 / 25 / 30**.
**Status:** Design only. Names are placeholders — user supplies Italian Brainrot character
names per slot, then art (sprites in `js/sprites.js`) gets made to match.

> Names are now FINAL (user-supplied). The `spr:` id is the sprite key in `sprites.js`.
> **Reused characters:** where a World-2 entry is a World-1 character, we **reuse the existing
> sprite as-is** (no dirt redraw) and display the name with a **"2.0"** suffix to mark the
> harder variant. Tagged **[reuse W1 sprite]**. Only genuinely-new characters get new art.

---

## 1. Theme

Underground dirt biome (`theme.tint:'#8a5a2c'`, brown palette, `wall`/`post` present). Enemy
fantasy = things that live in/under dirt: burrowers, rock things, magma, fungus, fossils,
crystal, worms, miners. Bullets and zones lean warm (amber / rust / ember) with cool accents
for crystal/ice variants so telegraphs stay readable against brown ground.

Where Grasslands enemies were mostly **chasers + shooters**, World 2's identity is
**positional pressure**: enemies that come from *below* (burrow), *deny ground* (zones), and
*reposition you* (knockback / pull), so the player can't just kite in a circle.

---

## 2. New shared ability primitives (NEW CODE)

These back several enemies AND bosses. Build once, reuse everywhere. Tagged by cost.

| Key | What it does | Cost | Notes |
|-----|--------------|------|-------|
| **burrow/resurface** | Actor dives underground: becomes untargetable + bullet-immune, a telegraph mound (`addZone`-style ring) tracks toward the player, then it resurfaces with a slam zone. | Med | New actor state `e.dig` (`down`→`travel`→`up`). Reuses `addZone` for the surfacing tell. Signature dirt mechanic. |
| **summonAdds(e,sprId,n)** | Spawn `n` minor foes around an actor (boss phase changes, "nest" enemies). | Low | Just calls `spawnEnemy` with a forced def + position ring. Cap total adds. |
| **debris / stalactite** | Overhead drop: `addZone` with longer `tele` (~0.9s) and a falling-rock draw. Aimed or random. | Low | Pure `addZone` reskin + a falling sprite in the draw layer. |
| **geyser line** | A sequential row of zones marching from source toward the player (eruption wave). | Low | Loop of `addZone` with staggered `tele` along an angle. |
| **homing bullet** | Enemy bullet flag `b.homing` + turn rate; curves toward player for a lifetime then flies straight. | Low | One clause in the ebullet update. Use sparingly — readable only at low counts/slow speed. |
| **knockback hit** | On contact, shove the player radially (set a short `P.kbT`/`P.kbVx`). | Low | Mirrors existing `e.pull` math, opposite sign. |
| **expand-implode ring** | A bullet ring fired outward that, after a beat, reverses inward (or pairs with a `pull`). | Low | `mRing` then a second inverted-velocity pass, or `mRing` + `e.pull`. |
| **sweep beam** | A slowly rotating spoke of bullets (denser `e.spin`, single arm, faster rotation). | Low | Variant of existing `e.spin`. |

Everything else reuses the current toolkit: `mAimed`, `mRing`, `fireEB`, `addZone`
(`slow`/`dps`/`tele`/`life`), `e.pull`/`e.pullStr`, `e.spin`/`e.spinCol`, dash
(`e.dst`/`e.dwin`/`e.da`), `warp` (`e.warpT`), `enrage` (auto at 40% HP), `bigText`,
`shake`, `sfx`.

---

## 3. Enemy roster — `FOES_DIRT` (~24 foes, 5 tiers)

Stat columns mirror `FOES_GRASS`: `hp, sp(speed), r(radius), xp, score`, plus optional
`range/shoot`, `aoe`, and new flags. Scale waves with the existing
`maxIdx = min(len-1, floor(wave/2))` reveal and `hpMult = 1+(wave-1)*0.16`.

### Tier I — fodder (waves 1–4)
| # | Name | spr | HP/sp | Mechanic |
|---|------|-----|-------|----------|
| 1 | **Spijuniro Golubiro** | `golubiro` | 3 / 84 | **burrow-and-pop** — spawns underground, surfaces near player once, then chases. |
| 2 | **Chimpanzini Bananini** | `bananini` | 3 / 86 | basic chaser. |
| 3 | **Bananita Dolfinita** | `dolfinita` | 4 / 56 | dashes (reuse Penguino dash). |
| 4 | **Fruli Frula** | `frula` | 3 / 50 | **split-on-death** → 2 mini blobs (`death:{type:'split',n:2}`). |
| 5 | **Tric Trac Baraboom** | `baraboom` | 3 / 72 | death: 4-bullet ring (reuse Quacodillo). |

### Tier II — infantry (waves ~3–8)
| # | Name | spr | HP/sp | Mechanic |
|---|------|-----|-------|----------|
| 6 | **Cappuccino Assassino 2.0** | `cappuccino` **[reuse W1 sprite]** | 5 / 70 | **flank-only front armor** (`front:true` — blocks bullets to its front arc). |
| 7 | **Ballerina Cappuccina 2.0** | `ballerina` **[reuse W1 sprite]** | 5 / 64 | **arc/lob shots** (`arc:true` — telegraphed landing zone). |
| 8 | **Bobrito Bandito** | `bobrito` | 6 / 62 | aim×3 (reuse Castori shoot). |
| 9 | **Trulimero Trulichina** | `trulimero` | 7 / 64 | ring×6, moves while firing. |
| 10 | **Lirili Larila 2.0** | `lirili` **[reuse W1 sprite]** | 13 / 40 | aim×3, tanky. |
| 11 | **Brr Brr Patapim 2.0** | `patapim` **[reuse W1 sprite]** | 12 / 44 | aim×2, tanky. |

### Tier III — casters (waves ~6–14)
| # | Name | spr | HP/sp | Mechanic |
|---|------|-----|-------|----------|
| 12 | **Orangutini Ananasini** | `ananasini` | 8 / 54 | **arc/lob shots** that ignore obstacles (over-the-top). |
| 13 | **Glorbo Fruttodrillo** | `glorbo` | 8 / 50 | **geyser line** when player in range (distance check). |
| 14 | **Blueberrinni Octopussini 2.0** | `octopus` **[reuse W1 sprite]** | 9 / 50 | **debris drops** on player. |
| 15 | **Graipussi Medussi 2.0** | `jelly` **[reuse W1 sprite]** | 8 / 46 | **sweep-beam** (rotating spoke). |
| 16 | **Espressona Signora 2.0** | `espresso` **[reuse W1 sprite]** | 9 / 58 | ring×5. |
| 17 | **Zibra Zubra Zibralini** | `zibra` | 10 / 54 | **mid-flight splitting shards** (`b.split`). |

### Tier IV — heavies (waves ~10–20)
| # | Name | spr | HP/sp | Mechanic |
|---|------|-----|-------|----------|
| 18 | **Rhino Toasterino 2.0** | `rhino` **[reuse W1 sprite]** | 18 / 42 | tanky + **split-on-death**. |
| 19 | **Burbaloni Luliloli** | `burbaloni` | 20 / 36 | **AoE slow stomp** (distance check; reuse Frigo Camelo `aoe.slow`). |
| 20 | **Cocofanto Elefanto** | `cocofanto` | 22 / 32 | **massive sinkhole pull** (`e.pull` while alive, high `pullStr`). |
| 21 | **Girafa Celeste** | `girafa` | 26 / 30 | **charging boulder** dash + **knockback hit**. |

### Tier V — elites (waves ~14–30)
| # | Name | spr | HP/sp | Mechanic |
|---|------|-----|-------|----------|
| 22 | **Brri Brri Bicus Dicus Bombicus** | `bicus` | 14 / 50 | **add-summoning hive mother** (`summonAdds` Golubiros, cap 4). |
| 23 | **Boneca Ambalabu** | `ambalabu` | 14 / 44 | **multi-geyser lines** (distance check). |
| 24 | **U Din Din Din Din Dun Ma Din Din Din Dun** | `dindin` | 16 / 38 | **split-on-death heavy tank**. |

> **New enemy code needed:** `burrow:'pop'`, `death:{type:'split'}`, `arc` lob,
> `front` directional block, `b.split` mid-flight, enemy `charge`/dash, **knockback hit**,
> enemy-cast **geyser line** + **debris** + **sweep** + `summonAdds`, enemy `e.pull`. Most
> entries are config on existing systems; the helpers are shared with bosses (§2).
> **Note:** several "geyser/lava" enemies use a *distance-based* hazard check (fires only when
> player is within range), per the roster notes.

---

## 4. Bosses — 6 unique, 3 phases each

Pattern follows La Vaca Saturno: phase climbs via `e.vph` and `bossMoves(e)` returns a
different pool per phase. Add `case` entries in `bossMoves()`, `execMove()`, and the
`MOVE_COL` map, and init any new fields in `spawnBoss()`. Bosses 1–5 phase on HP
(66% → 33%). **Boss 6 is special — two healthbars, see §4.6.**

Each boss below lists: **HP/size**, **Phase 1/2/3 move pools**, and the **signature new
ability** that defines each phase. Move keys in `CAPS` = new `execMove` cases; lowercase =
reuse existing.

### 4.1 Wave 5 — **TA TA TA TA SAHUR** (`spr:tatasahur`) *(intro: teaches "watch the ground")*
- **HP 150, r54.** Theme: burrowing drummer. Lowest HP, readable.
- **P1 (100–66%):** `aimed3`, `ring16`, `BURROW_SLAM` — digs and resurfaces under the player
  with a slam zone (**burrow/resurface**). One telegraph at a time.
- **P2 (66–33%):** `aimed5`, `ring2`, `BURROW_SLAM`, `DEBRIS3` — adds a 3-drop overhead shower.
- **P3 (<33%):** `BURROW_DOUBLE` (two quick surfacing slams), `ring2`, `DEBRIS3`, `aimed5`.
  Enrage tightens recovery.
- **Signature:** burrow becomes the spine of the fight — by P3 you're dodging two slams + debris.

### 4.2 Wave 10 — **POT HOTSPOT** (`spr:hotspot`) *(positioning / obstacles)*
- **HP 230, r60.** Theme: cracked-earth hot spring / geyser pot.
- **P1:** `slam`, `ring16`, `QUAKE_LINE` — a **geyser line** erupting outward toward the player.
- **P2:** `dblslam`, `QUAKE_CROSS` (two perpendicular geyser lines), `aimed5`.
- **P3:** `QUAKE_RADIAL` — geyser lines erupt outward in all directions (4–6 spokes) at once,
  leaving narrow safe gaps, then `dblslam` + `aimed5`. (Replaced the cut `PILLARS` obstacle
  idea — same "no safe ground" pressure, no new collision system.)
- **Signature:** ground-denial — P3 fills the arena with erupting lines you thread between.

### 4.3 Wave 15 — **LA VACA SATURNO SATURNITA** (`spr:saturnita`) *(ground-denial / DoT)*
- **HP 300, r58.** Theme: molten cosmic cow (sequel to W1's La Vaca Saturno).
- **P1:** `ring16`, `aimed3`, `LAVA_POOL` — drops a lingering fire `addZone` (high `dps`,
  long `life`) the player must leave.
- **P2:** `spiral`, `LAVA_POOL`, `EMBER_RAIN` (**debris** but fire-colored, 4 drops), `aimed5`.
- **P3:** `MELTDOWN` — boss seeds 3–4 lava pools across the arena, then a fast `ring2x`; floor
  becomes a shrinking safe-zone puzzle. + `spiral`.
- **Signature:** the arena slowly fills with fire; P3 is a survive-the-floor check.

### 4.4 Wave 20 — **TRALALERO TRALALA 2.0** (`spr:tralalero` **[reuse W1 sprite]**) *(bullet-pattern)*
- **HP 380, r56.** Same sprite as W1's Tralalero, harder fight.
- **P1:** `ring16`, `SWEEP` — a rotating **sweep beam** spoke, `aimed3`.
- **P2:** `SWEEP_DUAL` (two opposing spokes), `PRISM_SPLIT` — aimed shards that **split** into
  3 each mid-flight (`b.split`), `ring2`.
- **P3:** `EXPAND_IMPLODE` — a wide ring blooms out then reverses inward (**expand-implode**)
  while `SWEEP_DUAL` keeps rotating. Dense but fully telegraphed.
- **Signature:** geometry — reading rotation + split timing instead of raw dodging.

### 4.5 Wave 25 — **BOMBARDIRO CROCODILO 2.0** (`spr:crocodilo` **[reuse W1 sprite]**) *(adds)*
- **HP 460, r58.** Same sprite as W1's Bombardiro, brood-nesting fight.
- **P1:** `ring16`, `SUMMON` — `summonAdds` 3 Burrowlings (cap 6 on field), `aimed5`.
- **P2:** `SPORE_FIELD` — several lingering **slow** poison zones, `SUMMON` (cap 8), `spiral`.
- **P3:** `BROOD_BURST` — summons 4 adds AND fires a `ring2x`; the arena is a swarm + bullets.
  Killing adds drops minor XP, so it's a risk/greed check. + `SPORE_FIELD`.
- **Signature:** the only add-heavy fight; tests AoE builds and target priority.

### 4.6 Wave 30 — **MADUDUNGDUNG & GARAMARAMAN** (`spr:madudung` + `spr:garamaraman`) *(TWO HEALTHBARS)*
- **Two separate bosses, two distinct sprites, one linked HP pool.** Both drawn fresh.
- **HP: bar 1 = 560, bar 2 = ~400. r62 each.** They share the two-bar HP but are two actors on
  screen, so the encounter literally looks like two titans.
- **Two-healthbar structure (per your spec):**
  - **Healthbar 1, top half (100–50% of bar 1) = PHASE 1.**
  - **Healthbar 1, bottom half (50–0% of bar 1) = PHASE 2.** Crossing 50% triggers a phase
    cinematic (`bigText('PHASE 2!')`, `shake`, clear bullets, brief `iv`).
  - **Healthbar 2 (full second bar) = PHASE 3.** When bar 1 empties, bar 2 reveals and a bigger
    cinematic plays (`'FINAL PHASE!'`, screen flash, adds wiped, music swap).
- **Implementation:** designate one actor the "lead" that owns the shared HP/phase state and the
  `#bossbar`; the partner reads the lead's phase and runs its own move cycle. Track
  `e.maxHp = bar1+bar2` on the lead with `e.bars=2` + `e.barSplit` so the HUD draws two
  segments. Phase math: `phase = hp > bar2+bar1*0.5 ? 1 : hp > bar2 ? 2 : 3` (generalize the
  vaca `vph` block to read a per-boss phase fn). `#bossbar` needs a 2-segment render mode.
  Damage to **either** actor drains the shared pool. (Open Q in §7 on whether they have separate
  bodies to hit or one shared hurtbox.)
- **P1 (bar 1, top):** the two split duties — MADUDUNGDUNG runs `BURROW_SLAM` + `ring16`,
  GARAMARAMAN runs `QUAKE_LINE` + `aimed5`. Moderate tempo, attacks alternate so tells stay
  readable.
- **P2 (bar 1, bottom):** both escalate — `LAVA_POOL`, `SWEEP_DUAL`, `BURROW_DOUBLE`, `ring2`
  split across the pair; enrage-tier tempo, occasional simultaneous casts.
- **P3 (bar 2):** `DEVOUR` — a strong arena-wide **pull** (`e.pull`, high `pullStr`) into a
  `ring2x`, plus `MELTDOWN` lava seeding, plus `SUMMON` adds, on a tight cycle. The climax —
  both titans firing at once, each attack still individually telegraphed.
- **Signature:** a true final gauntlet; the second healthbar makes the kill feel earned.

---

## 5. Boss move keys → build list

New `execMove` cases to author (with `MOVE_COL` entries + tells):

`BURROW_SLAM`, `BURROW_DOUBLE`, `DEBRIS3`, `QUAKE_LINE`, `QUAKE_CROSS`, `QUAKE_RADIAL`,
`LAVA_POOL`, `EMBER_RAIN`, `MELTDOWN`, `SWEEP`, `SWEEP_DUAL`, `PRISM_SPLIT`,
`EXPAND_IMPLODE`, `SUMMON`, `SPORE_FIELD`, `BROOD_BURST`, `DEVOUR`. *(`PILLARS` cut.)*

Reused as-is: `aimed3`, `aimed5`, `ring16`, `ring2`, `ring2x`, `spiral`, `slam`, `dblslam`.

---

## 6. Art / reference workflow

Names are final and many map to well-known Italian Brainrot memes. The house style (the existing
30 sprites in `js/sprites.js`) is an **original vector recreation** — flat shapes, the shared
`OUT='#33272a'` outline, dot eyes — *not* a pixel copy of any creator's image. We keep that:

**Per character, before drawing:** I research the character's canonical look (`WebSearch` for its
defining traits — silhouette, signature colors, key props: e.g. Bombardiro = bomber/crocodile,
Tralalero = three-legged shark in sneakers) and capture a short **trait list** (3–5 bullet
points). The sprite is then built in our vector factory to be *instantly recognizable* from those
traits — same approach that produced the World-1 roster. This makes each one a faithful,
recognizable rendition in our own art, which is what "1:1" means here in practice (and keeps us
clear of copying specific artists' assets). Reused-character sprites (**[reuse W1 sprite]**) need
no new art unless you want a dirt-tinted variant.

## 7. Decisions (resolved 2026-06-11)

1. **Reused-name sprites — RESOLVED:** reuse the existing W1 sprite as-is, no dirt redraw; mark the
   harder variant with a **"2.0"** name suffix. Applies to 8 enemies + bosses Tralalero & Bombardiro.
2. **Final boss — RESOLVED:** **two different bosses**, two distinct new sprites
   (`madudung` + `garamaraman`), one linked two-bar HP pool. Both fought on screen at once.
3. **PILLARS — RESOLVED:** **cut.** POT HOTSPOT P3 uses `QUAKE_RADIAL` instead (no new collision
   system).
4. **Two-bar HUD — RESOLVED:** **final boss only.** All other bosses keep the single `#bossbar`.

**Still open (small):** for the final duo, do the two actors have **separate hurtboxes** (you can
focus one down, but the shared bar drains either way) or **one shared hurtbox**? Separate bodies
feel better; trivially more code. Defaulting to **separate bodies** unless you say otherwise.

---

*Next step after you fill in names + confirm §6: turn this into a phased implementation plan
(`writing-plans`) — likely Phase A: shared primitives (§2) + `FOES_DIRT`; Phase B: bosses 1–5;
Phase C: final boss + two-bar HUD.*
