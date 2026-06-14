# Worlds Expansion — 10 Worlds, Gradual Scaling, Original Brainrots

Date: 2026-06-14
Status: approved (build)

## Vision
Grow the game from 2 worlds toward a **50–100 world** progression. This spec defines
the **first 10 worlds** as the foundation: a gradual difficulty ramp (today's hardest
content lands at **World 10**, not World 2), a coin/gear economy where **items are
needed** to push forward, **new cards every world**, **unique map shapes per world**,
and a roster of **original, copyright-free brainrot mascots** (ownable IP) — ~8 enemies
per world plus original, never-repeating bosses.

Target audience skews **younger**: enemies stay readable and "not too hard"; **bullet-hell
is reserved for end-bosses of Worlds 7–10**. Earlier bosses are telegraphed melee/zone
fights.

Decisions locked with the user:
- **20 waves per world**, boss every 5th wave (waves 5/10/15/20). 4 boss fights/world.
- **Reuse + recolor existing art now**, build dedicated original sprites gradually.
- **Rarity-banded gear gate**: commons carry to ~W5, then uncommons, then rares, etc.
- **Distinct per-world map shapes/sizes, no interior obstacles yet.**
- **New cards unlock every world.**
- **World-preview emblem** replaces the player sprite on the Battle-tab stage.
- Every boss has its **own original attack set** — no two feel the same.
- **Research real reference imagery** before drawing any new creature sprite.

---

## 1. World data model
`WORLDS[]` grows 2 → 10. Each entry gains fields:

```
{ id, name, theme, foes, bosses, waveTarget:20,
  band:<0..9>,                 // difficulty band index (drives scaling)
  map:{ w, h },                // per-world field dimensions (shape)
  enemyTint:'#rrggbb'|null,    // recolor applied to this world's enemy sprites
  emblem:'world_<id>'          // Battle-stage preview sprite name
}
```

`WORLD` (in core.js) becomes **mutable**: `loadWorld()` sets `WORLD.w/h` from `world.map`.
Camera, ground pre-render, minimap, spawn-ring and clamps already read `WORLD.w/h`, so
they adapt. `band` replaces ad-hoc `hpMul/dmgMul/enemyMul` as the single scaling knob
(those remain available as per-world fine-tune overrides).

### The 10 worlds
| # | band | Name | Theme tint | Map shape (w×h) | Roster source | Boss style |
|---|------|------|-----------|-----------------|---------------|-----------|
| 1 | 0 | Grasslands | green | 2600×2600 square | grass T1–2 | telegraph melee |
| 2 | 1 | Dirt Depths | brown | 3200×2000 wide | grass T1–3 | telegraph melee |
| 3 | 2 | Sunny Sands | gold | 3400×3400 big open | grass T2–3 | summon/zone |
| 4 | 3 | Frostbite | ice blue | 1100×3800 thin tall corridor | grass T2–4 | leap/slow-zones |
| 5 | 4 | Autumn Woods | orange | 3000×3000 large | grass T3–5 + grass bosses | dash/decoy |
| 6 | 5 | Swamp | murky green | 3800×1600 short & very wide | dirt T1–2 | lunge/spit |
| 7 | 6 | Skyland | cloud blue | 3600×3600 huge open | dirt T2–3 | **bullet-hell** |
| 8 | 7 | Crystal Caves | violet | 1300×3600 narrow long | dirt T2–4 | **bullet-hell** |
| 9 | 8 | Volcano | red/black | 2800×2800 medium | dirt T3–4 | **bullet-hell** |
| 10 | 9 | The Underground | deep purple | 1200×4000 tall corridor | **full dirt roster (unchanged)** | **bullet-hell finale** |

World 10 keeps the current `FOES_DIRT` + `BOSSES_DIRT` exactly. The dirt **theme/map**
is reused early (W2) per the user's note; W10 gets the darker purple "underground" tint.

---

## 2. Difficulty curve
Macro ramp moves from per-wave to per-world so it's gentle inside a world and steady
across the ten.

- **Per-wave HP growth softened**: `(1+(wave-1)*0.16)` → **`(1+(wave-1)*0.07)`**
  (a 20-wave world ≈ ×2.3 internally vs ×4 today).
- **Per-world HP band**: enemy HP `× (1 + band*0.42)` → W1 ×1.0 … W10 ×4.78.
- **Enemy damage band**: contact/projectile dmg `× (1 + band*0.12)`.
- **Boss HP band**: `× (1 + band*0.55)` (boss finales scale a touch faster than fodder).
- `coinMult()` (wave-based) is kept; world coin multiplier added in §4.

Helper: `worldBand()` returns `curWorld().band||0`. `spawnEnemy`/`spawnBoss` multiply by
the band factors above instead of the old per-world `hpMul`. Existing per-world
`hpMul/dmgMul/enemyMul` still apply as optional multipliers on top for fine-tuning.

Goal: W1→W2 stops being a cliff; the hardest content today sits at W10, 2–9 fill the gap.

---

## 3. Per-world maps (tech)
- `WORLD.w/h` set per world in `loadWorld()`. Constrain by **total area, not per-side**
  (thin corridors are intentionally long): keep `w*h ≤ ~13M px` (e.g. 3600×3600, or
  1200×4000 = 4.8M — fine) so the pre-rendered `groundCanvas` stays memory-safe
  (13M ×4B ≈ 52MB worst case). All ten maps in §1 satisfy this.
- **Boss arena** must fit thin corridors: `ARENA_SIZE` clamps to
  `min(ARENA_SIZE, mapW-2*WALL, mapH-2*WALL)`; arena rect re-centered within bounds.
- Minimap aspect already derives from `WORLD.w/h` — verify non-square renders correctly
  (frame uses `ms` square; scale x/y independently, which it already does via `sxk/syk`).
- `ringPos()` spawns relative to player, clamped to world — works for any shape.
- Zoom: thin corridors will show walls at `ZMIN`; acceptable (walls are themed).

---

## 4. Economy & gear gate (rarity-banded)
Items are **needed**, gated by rarity tier per world band (user's rule).

| Worlds | Needed to clear comfortably | Aspirational |
|--------|-----------------------------|--------------|
| 1–2 | none (beatable bare) | commons |
| 3–5 | **Common** set | uncommons |
| 5–7 | **Uncommon** set | rares |
| 7–9 | **Rare** set | epics |
| 10 / endless | **Epic+** set | legendary |

**Mechanism = soft DPS wall.** Each band's enemy HP is tuned so time-to-kill stays
acceptable only if your equipped flat damage roughly matches the band. One tier behind =
sluggish but survivable; two tiers behind = a wall. Numbers (base player dmg 10):

- **Gear flat damage, full 4-slot set**: common **+8**, uncommon **+16**, rare **+28**,
  epic **+48**, legendary **+80**. (Per-piece `STAT.dmg.vals` = 2/4/7/12/20, unchanged
  from the flat-gear PR; revisit during playtest.)
- **Fodder HP** (tier-I base 3 ×HP_MULT 10 = 30) × band → ~30 (W1) … ~144 (W10),
  × softened per-wave growth.
- **Coins scale per world**: new `worldCoinMul = 1 + band*0.6` folded into coin pickups
  (`gold += round(5 * goldMul * coinMult() * worldCoinMul)`). W10 pays ~5.4× W1, so
  grinding W7–9 funds the rares/epics W8–10 demand.
- **Prices rescaled** so the next tier ≈ "one world of grinding": common ~30, uncommon
  ~120, rare ~450, epic ~1500, legendary ~4500 (each ~3–4× the last). Crate prices
  scale similarly.

Final tuning happens in playtest; this spec fixes the **model + gating intent**.

---

## 5. Cards / abilities — new every world
Level-up pool uses the existing `minWorld` field (0-indexed), expanded so **each world
introduces 1–2 new cards**. Early worlds = core passives/abilities; synergy + heavy
hitters unlock in the back half. Schedule (existing cards reassigned + new ones marked ★):

| World (minWorld) | Newly unlocked cards |
|------------------|----------------------|
| 1 (0) | dmg, rate, speed, hp, magnet, armor (core passives) |
| 2 (1) | multi (Splinter Shot), range (Focal Lens) |
| 3 (2) | crit, heavy, regen |
| 4 (3) | pierce, slow (Stasis), ★ **Ricochet** (bullets bounce to a 2nd target) |
| 5 (4) | orbit (Orbiting Barrier), vamp (Soul Harvest) |
| 6 (5) | nova (Pulse Wave), thick, ★ **Lifesteal Aura** (HP regen scales w/ nearby kills) |
| 7 (6) | aegis (Aegis Bubble), tremor, ★ **Chain Lightning** (hits arc between enemies) |
| 8 (7) | blackhole, aftershock, ★ **Shrapnel** (kills burst small shards) |
| 9 (8) | phoenix, gravcrush, ★ **Overload** (every Nth shot is a big slug) |
| 10 (9) | abyssal, ★ **Meteor Mark** (mark a foe → delayed strike) |
| synergy | frostfire/eventhz/bloodcrit/glassphx/orbstorm/overdrive/aegisnova (unlock when prereqs owned, as today) |

New card ideas (★) reuse existing systems where possible (forEnemiesNear splash, holes[],
bullet spawn) to keep implementation cheap. Final card stats tuned in playtest.

---

## 6. World-preview emblem (Battle stage)
- The Battle-tab `#charimg` (player sprite) is replaced by a **per-world emblem**:
  `refreshWorldSel()` sets the stage image to `SP[world.emblem].toDataURL()`.
- One themed emblem sprite per world (icon-style: a tile swatch + a signature silhouette).
  Locked worlds show a `?` emblem.
- Player + gear preview remains on the **Inventory** tab (unchanged).

---

## 7. Content bible — original brainrots
Genre: absurd **animal × object** hybrids, melodic nonsense names, kid-friendly, ownable.
All names below are **original** (no existing meme names). Behavior maps to current engine
flags: *chaser* (default), `dash`, `shoot{type,n,cd,spd,col,move,arc,split}`,
`death{ring|split}`, `shell`, `support`, `aoe`, `cast{geyser|debris|sweep|summon}`,
`front`, `kb`, `pullAura`, `trail`. Early worlds = mostly chasers; specials grow with band.

### Enemies — 8 per world (80 total)
**W1 Grasslands** — all gentle:
1. Hoppolino Grassini (grasshopper on skates) — fast chaser
2. Mootini Bellini (pogo cow) — hopping chaser
3. Florpo Daisini (googly-eye daisy) — slow chaser
4. Beebo Buzzini (bumblebee) — weaving chaser
5. Snailo Slimoso (snail) — slow tank (+HP)
6. Crickini Choppo (cricket) — short-hop `dash`
7. Ladybugo Spottini (ladybug) — chaser
8. Mantini Prayoso (mantis) — melee, `death{ring,n:3}`

**W2 Dirt Depths-lite** — earthy:
1. Wormolino Spaghetti (worm) — slow chaser
2. Molini Diggalo (mole, drill mitts) — `dash`
3. Rockolino Pebblini (angry rock) — `front` armor tank
4. Antini Marchoso (ant) — fast swarm chaser
5. Beetlo Hornini (rhino beetle) — `kb` charge (light)
6. Grubbo Squirmini (grub) — very slow (+HP)
7. Centipedo Leggini (centipede) — `dash`
8. Sporeo Mushroomini (mushroom) — `death{ring}` spore puff

**W3 Sunny Sands** — desert/beach:
1. Scorpini Tacosso (scorpion in a taco) — chaser, pincer
2. Camelini HumpoZo (baby camel) — chaser (+HP)
3. Cactolino Pokini (cactus) — stationary-ish, `shoot{n:1,arc}` spine lob
4. Geckini Sandoso (gecko) — fast `dash`
5. Vultureo Circloso (vulture) — circling `shoot.move`
6. Crabbo Pinchini (crab) — `shell` (burrow into sand → invuln)
7. Snakini Sidewindo (sidewinder) — weaving chaser
8. Beetlo Scaraboso (scarab) — chaser, `death{split}`

**W4 Frostbite** — ice (thin corridor):
1. Pinguino Frescolino (popsicle penguin) — slide `dash`
2. Snowlino Ballino (snowball with arms) — rolls, `kb`
3. Iciclo Pointini (icicle imp) — `shoot{n:1}` shard
4. Frostini Foxxo (arctic fox) — fast chaser
5. Walruso Tuskini (walrus) — slow tank, `front`
6. Yetilino Babyoso (baby yeti) — chaser
7. Sealini Floppo (seal) — chaser (+HP)
8. Blizzardo Wispini (snow wisp) — `shoot{ring,n:6}` slow flurry

**W5 Autumn Woods** — fall forest:
1. Squirrelini Acornato (squirrel) — fast chaser, `shoot{arc}` acorn
2. Leafolino Driftoso (leaf sprite) — weaving chaser
3. Hedgehogo Spikoso (hedgehog) — `shell` curl
4. Owlini Hootini (owl) — circling `shoot.move`
5. Mushola Toadstoolo (toadstool) — `death{ring}`
6. Boaro Tuskolino (boar) — `kb` charge
7. Foxxini Cubbino (fox kit) — `dash`
8. Acorno Bouncini (living acorn) — bouncing chaser, `death{split}`

**W6 Swamp** — murky (wide):
1. Frogolino Burpini (frog) — leap `dash`, `shoot{arc}` tongue-glob
2. Tadpolo Wiggini (tadpole) — fast swarm
3. Mosquito Stingoso (mosquito) — weaving `shoot{n:1}`
4. Gatorlino Snappini (baby gator) — chaser, `front` jaw
5. Lilypado Floatini (lilypad turtle) — `shell`
6. Slugmo Toxoso (toxic slug) — `trail` poison
7. Heronio Beakini (heron) — `dash` stab
8. Fireflyo Glowini (firefly) — `shoot{ring,n:5}`

**W7 Skyland** — clouds (huge open); shooters increase:
1. Cloudini Puffolo (cloud-sheep) — slow float chaser (+HP)
2. Birdini Tweetoso (songbird) — `shoot.move` peck-bolts
3. Balloono Driftini (balloon critter) — bobbing chaser, `death{ring}`
4. Kitelino Tailoso (kite-bird) — fast `dash`
5. Windino Gustoso (wind sprite) — `pullAura` (gentle)
6. Thunderlino Sparko (mini storm cloud) — `shoot{n:2}` bolts
7. Angelino Featherini (cherub bird) — `support` (heals nearby)
8. Glidero Soaroso (flying squirrel) — diving `dash`

**W8 Crystal Caves** — gems (narrow long):
1. Batolino Crystallini (crystal bat) — fast weaving `dash`
2. Geodino Rockoso (geode) — `front` armor tank
3. Shardini Pokoso (crystal shard imp) — `shoot{n:3}` fan
4. Glowwormo Lumini (glowworm) — `trail` light
5. Spiderini Webboso (cave spider) — `shoot{arc}` web-zone (slow)
6. Crystalbo Golemini (small golem) — `shell` + `kb`
7. Mothlino Dustoso (cave moth) — circling `shoot.move`
8. Drilluro Minerino (mining bot critter) — `dash` + `death{split}`

**W9 Volcano** — lava; danger ramps:
1. Emberini Hotato (ember potato) — chaser, `trail` fire
2. Magmo Bloboso (magma blob) — slow tank, `death{ring}`
3. Salamandro Flickini (fire salamander) — fast `dash`
4. Ashbirdo Phoenixini (ash chick) — `shoot.move` fire-bolts
5. Rockgolino Moltoso (lava golem) — `front` + `kb`
6. Smokeo Wisposo (smoke wisp) — `shoot{ring,n:8}`
7. Bouldero Rollini (rolling boulder) — `kb` charge, hard-hit
8. Sparkini Poposo (lava spark) — `death{split}` + fast

**W10 The Underground** — **existing `FOES_DIRT` (24)** retained unchanged; pick its
hardest 8 for the tier-gated spawn. No new enemies here.

### Bosses — original, never-repeating
Each world has **4 boss fights** (waves 5/10/15/20). Wave-20 = the world's **headliner**
end-boss with a unique 4-move set; waves 5/15 = **mini-bosses** drawn from a per-world
pool of *distinct* patterns so no two encounters in a world repeat; wave-10 = a tougher
"act break" mini-boss. Bosses keyed by `moveKey` so reused sprites get new pools (existing
mechanism).

**End-bosses (wave 20) — original movesets** (W1–6 telegraphed, W7–10 bullet-hell):
- **W1 Bullzini Tractoroni** (bull-tractor): GORE_CHARGE (telegraphed dash), PLOW_PUSH
  (shove wave), HAY_TOSS (3 lobbed zones), STAMPEDE (summons 3 calves).
- **W2 Mollodrillo Diggadigga** (mole-drill): DRILL_DIVE (burrow → resurface slam),
  DIRT_SPRAY (cone of debris zones), BOULDER_LOB (arc zones), QUAKE_STOMP (ring shock).
- **W3 Camelo Sphinxorino** (camel-sphinx): SAND_SUMMON (adds), DUST_DEVIL (rotating slow
  zone), SPIT_VOLLEY (3 aimed lobs), RIDDLE_GAZE (brief player-slow beam telegraph).
- **W4 Yetini Frostoso** (yeti): LEAP_SLAM (jump → AoE), FROST_BREATH (cone slow-zone),
  ICICLE_DROP (debris of ice), SNOW_ROLL (charging snowball, `kb`).
- **W5 Foxxini Lanternoso** (lantern fox): PHANTOM_DASH (decoy clones + real dash),
  WILL_O_WISP (slow homing zones), POUNCE (telegraph leap), FOG_VEIL (briefly hides adds).
- **W6 Gatorini Bayouoso** (bayou gator): TAIL_SWEEP (arc melee telegraph), GATOR_LUNGE
  (long dash), SWAMP_SPIT (poison trail zones), GATOR_BROOD (summons tadpoles).
- **W7 Birbini Thunderoso** (thunderbird) — **bullet-hell**: LIGHTNING_RING (expanding
  bullet ring), FORK_BOLTS (3-way splitting bolts), STORM_SPIRAL (rotating spiral),
  CLOUD_DASH (reposition + ring).
- **W8 Golemoso Gemmino** (crystal golem) — **bullet-hell**: SHARD_FAN (wide aimed fan),
  PRISM_CROSS (4-way cross sweeps), GEM_NOVA (dense ring), SHELL_GUARD (invuln + summon).
- **W9 Dragonzini Lavoso** (lava dragon) — **bullet-hell**: FIRE_FAN (sweeping flame
  cone of bullets), LAVA_POOLS (telegraphed floor pools), METEOR_RAIN (debris barrage),
  WING_GUST (radial knockback ring).
- **W10** — **existing dirt bosses** (`BOSSES_DIRT`, incl. MADUDUNGDUNG duo finale),
  unchanged bullet-hell.

**Mini-boss pattern pool** (waves 5/10/15; assign 3 distinct per world, themed-recolored):
CHARGER (telegraphed dashes), SUMMONER (adds + heal), ZONE_CASTER (geyser/debris),
SPINNER (sweep arms), LOBBER (arc volleys), SHELLER (invuln cycles + charge). Pool entries
get a world tint + suffix name so each appearance feels distinct; later worlds bias toward
the bullet-hell-flavored entries (SPINNER/LOBBER with denser volleys).

---

## 8. Sprite & research workflow
For every **new** creature/boss/emblem sprite (not a recolor):
1. **Research first** — `WebSearch`/`WebFetch` for reference of the real animal/object
   ("grasshopper side view", "mole digging", "scorpion top-down") to get proportions,
   silhouette, and signature features right **before** drawing.
2. Draw in the house vector style (`makeSprite`, `OUT` outline `#33272a`, `sh/dot/eyes`
   helpers), matching the existing roster's chunky cartoon look.
3. Verify headlessly (sprite builds without error; screenshot) per the project's Edge
   workflow.
Until a dedicated sprite exists, the enemy uses a **recolored existing sprite**
(`enemyTint` + closest-archetype base) so the world is fully playable immediately.

---

## 9. Implementation phasing
Built in milestones; each is independently shippable (PR → merge) and verified headlessly.

- **Phase 1 — Backbone (no new art).** Mutable `WORLD`, per-world `map`/`band`/`tint`,
  the 10 `WORLDS[]` entries (recolored existing rosters mapped to the new names/archetypes),
  difficulty-band scaling, arena-clamp for corridors, world coin multiplier, price/stat
  rescale, world-preview emblems (simple placeholder emblems), card-unlock schedule.
  → Game is playable end-to-end across 10 worlds with reused art.
- **Phase 2 — Economy/cards polish.** Price/coins/gear-stat tuning pass; implement the
  ★ new cards; playtest the gear gate per band.
- **Phase 3+ — Content drops (one world or two per PR).** Replace recolored placeholders
  with **researched original sprites**; implement each world's unique enemy behaviors and
  **original boss movesets** (new `execMove` cases); bespoke emblem art.
- **Ongoing — expansion** beyond W10 toward the 50–100 vision reuses this data model.

## 10. Risks / watch-items
- Large/tall ground canvases — enforce the 3600 dim cap.
- Boss arena in 1100–1300-wide corridors — verify the clamp keeps fights fair.
- Difficulty/economy are interdependent — tune them together in Phase 2 with the headless
  DPS/economy probe, not in isolation.
- Keep enemies readable for younger players — resist adding shooters to W1–4.
