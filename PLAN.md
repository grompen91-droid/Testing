# EMBERHOLD — Game Rework Plan

A full design plan to rework the current game (*Brainrot Survivors*) into a new
theme with a deeper enemy roster, real bosses, new abilities, and a Survivor.io-style
**card leveling + evolution** system.

> Status: **design only** — nothing here is implemented yet. Built to drop into the
> existing engine (`index.html` + `styles.css` + `js/{core,audio,sprites,input,game}.js`).

---

## 1. Theme: **Emberhold — The Last Siege**

A dark-fantasy **fortress-siege bullet hell**. You're a lone champion holding a ruined
castle courtyard while waves of undead, goblinoids, and demons pour in. Keeps the
engine's flat, no-glow cartoon look but swaps the cheerful garden for a moody-but-grounded
medieval battlefield — a totally different game without breaking the established art rules.

### World & vibe
- **Palette:** muted stone greys, dirt brown, iron, oxblood-red banners, **ember-orange**
  as the single hot accent. Flat cel-shading, dark outlines, **no glow** (torches/embers
  are flat shapes + particles, not bloom).
- **Ground:** cobblestone + cracked-dirt checker tiles (reskin of the grass tiles).
- **Border:** a **castle battlement wall** with crenellations + iron portcullis corners
  (reskin of the wooden fence).
- **Atmosphere:** drifting ember/ash particles, banners, scattered bones/rubble props.
- **Player:** a hooded **ranger/knight** (cape that flips with facing; the shades become a visored helm).
- **Audio:** deeper synth hits, sword *clang* on impact, choir stab on boss spawn.

### Enemy design = roles, not just skins
Every enemy fills one **bullet-hell role** so fights stay readable:
**Swarm** (pressure) · **Chaser** (force movement) · **Shooter** (bullets) ·
**Heavy** (telegraphed big hits) · **Elite** (one special rule). Tiers unlock as waves climb.

---

## 2. Enemy roster (25)

### Tier I — Fodder *(fast, weak, swarm)*
1. **Cave Rat** — tiny, jittery zig-zag chaser. *Attack:* none, pure swarm pressure.
2. **Carrion Bat** — fast sine-wave flight, dive-bombs in a straight lunge. *Attack:* contact only, unpredictable arcs.
3. **Green Slime** — slow blob; **splits into 2 mini-slimes on death**. *Attack:* none — the split is the threat.
4. **Goblin Sapper** — sprints at you and **detonates** on contact/death. *Attack:* dies into a **6-bullet ring**.

### Tier II — Infantry *(steady chasers, light ranged)*
5. **Skeleton Warrior** — standard chaser; occasionally **lobs a single aimed bone**.
6. **Goblin Archer** — kites; fires an **aimed 3-arrow fan**, flees when you close.
7. **Rotting Zombie** — slow, tanky; **spits a glob that leaves a poison puddle** (lingering AoE zone).
8. **Giant Spider** — scuttles sideways; **sticky web-bolt that slows your move speed** ~1.5s on hit.
9. **Kobold Slinger** — fast; **arcing rock** that lands and **shatters into 4 shards**.

### Tier III — Casters *(the bullet-hell core)*
10. **Dark Acolyte** — hovers; fires a **slow homing soul-bolt** (one at a time).
11. **Hex Witch** — **short-range teleports**; fires a **spiral stream of 3-round bursts**.
12. **Will-o'-Wisp** — weaves erratically; periodically **emits a radial ring of 8 sparks**.
13. **Gargoyle** — **perches as invulnerable stone**, then swoops; airborne fires a **tight 5-bolt fan**.
14. **Bone Conjurer** — **summoner**: raises 2 Skeletons every few seconds + a **bone-fan**.
15. **Plague Doctor** — drops **expanding poison-gas clouds** that grow then fade (move-or-die zones).

### Tier IV — Heavies *(tanky, telegraphed)*
16. **Armored Footman** — **front shield blocks your bullets from the front** — you must **flank** it.
17. **Ogre Brute** — winds up (telegraph) and **hurls a giant slow boulder** that **bursts into a 12-shard ring**.
18. **Stone Sentinel** — very slow tank; **ground-stomp = one expanding shockwave ring** you dash/gap through.
19. **Cursed Treant** — roots in place and **rains falling-acorn AoE markers around you** (targeted drops).

### Tier V — Elites *(one special rule each, rarer)*
20. **Necromancer** — **reanimates corpses of enemies you've killed** + fires a slow ring. Kill-this-NOW target.
21. **Banshee** — telegraphed **scream**: expanding ring **+ brief screen-shake/disorient**.
22. **Wraith** — **phases between intangible (invuln) and solid**; when solid fires a **4-way cross of bolts**.
23. **Templar Zealot** — **telegraphed charge-dash** along a line, **leaving a fire trail**.
24. **Flame Imp** — darts around **dropping fireball mines** that detonate into a small **+ pattern**.
25. **Frost Revenant** — **aura that slows you and your bullets** nearby; fires a **slow wide ice-wall**.

---

## 3. Bosses (5) — unique gimmick + attack phases

### B1 · **Mortenn, the Lich King** — *wave 5* (caster)
- **Gimmick:** raises **Graveyard Fields** — DoT zones bloom on random tiles you must avoid.
- **P1:** continuous **rotating bone-spiral** + aimed 3-fan.
- **P2 (<60%):** **teleports** around the arena, drops a **ring-of-12** on each arrival.
- **P3 (<30%):** summons 4 skeletons + a **counter-rotating double spiral**; graveyard fields multiply.

### B2 · **Cinderwing, the Ash Dragon** — *wave 10* (aerial)
- **Gimmick:** alternates **flying** (hard to hit, raining attacks) and **grounded** (vulnerable, melee-dangerous).
- **Attacks:** sweeping **flame-breath laser** (telegraphed line), **falling-ember circles** that bloom, **16-fireball radial** on landing.
- **Enrage:** breath sweeps faster and **leaves lingering fire walls**.

### B3 · **Gravewarden, the Stone Titan** — *wave 15* (tank/puzzle)
- **Gimmick:** armored core is **invulnerable** — destroy **3 glowing weak-runes** to open a damage window.
- **Attacks:** **ground-pound shockwave rings** (dash the gaps), **boulders that shatter into shrapnel cones**, floor-crack **radial line-bullets**.

### B4 · **Mephistros, the Demon Lord** — *wave 20* (pure bullet hell)
- **Gimmick:** **burning walls divide the arena**, steadily shrinking your safe space.
- **Attacks:** **two rotating laser beams**, **concentric expanding hex rings**, **3 homing soul-orbs**, **aimed bolt rain**.
- **Enrage:** adds a **second beam set spinning the opposite way** (weaving curtains).

### B5 · **The Coven — Three Witch Sisters** — *wave 25, true final* (multi-target)
- **Gimmick:** 3 sisters; **each alive buffs the others** → **kill order matters**.
  - **Ember** → fire spirals · **Hex** → curse fields that **briefly reverse your movement** · **Brew** → cauldron bombs + poison clouds.
- **On each death** survivors **enrage and fuse patterns**; finale = **all-screen poison + converging triple-spiral**.

---

## 4. New engine mechanics needed (for real bullet-hell)
The current engine only has chase / aimed-shot / 3 boss patterns. To support the above, add:
- **Telegraphs** — warning shape (ring/line) that flashes ~0.6s before AoE/laser.
- **Lasers / beams** — swept line hazards (rotating angle + width).
- **Homing bullets** — a `homing` flag that curves toward the player.
- **Ground zones** — timed AoE tiles (poison/fire/graveyard) with damage-over-time.
- **Shields / weak points** — directional block + destructible sub-targets.
- **Splitters & summoners** — on-death spawn (Slime) and timed spawn (Conjurer/Necromancer).
- **Player status effects** — slow, brief control-reverse, screen-shake — used *sparingly* for fairness.
- **Shrinking-arena hazards** — moving/expanding walls (Demon Lord).

---

## 5. Abilities

Built for survivors-style auto-combat **plus** dense bullet hell — several interact with
*enemy bullets*, not just enemies. Themed for Emberhold; mechanics are theme-agnostic.

### 🗡️ Weapons (change *how* auto-attack works)
1. **Cinder Bolt** *(default+)* — every 5th shot is a **charged bolt** that pierces all + leaves a fire trail.
2. **Twin Daggers** — fire **2 bolts in opposite directions** (forward + behind).
3. **Chain Spark** — hits **arc to 3 nearby enemies**.
4. **Boomerang Axe** — flies out, **returns through enemies** (hits twice).
5. **Hunter's Volley** — a **5-arrow spread** that fires when you stand still ~0.5s.
6. **Holy Lance** — a **piercing beam** in your facing direction (aim by moving).
7. **Mortar Toss** — **arcing AoE shell** at the densest cluster.
8. **Frostbrand** — less damage but **slows** enemies hit (stacking → freeze).

### ⚡ Actives (cooldown button / auto-cast)
9. **Blink Step** — short **teleport-dash through bullets** (i-frames); explosive after-image at origin.
10. **Aegis Bubble** — **dome that deletes enemy bullets** for 2s + blocks contact.
11. **Bullet Parry** — dash into fire to **reflect those bullets back** as your damage.
12. **War Cry** — **knockback shockwave + 30% damage** for 3s.
13. **Hexbreaker** — cone that **converts enemy bullets into XP shards**.
14. **Lightning Rod** — plant a stake that **chain-zaps** everything in range for 4s.
15. **Shadowstep Decoy** — drop a **decoy that draws enemy fire/aggro** for 3s.

### 🛡️ Defensive / survival
16. **Guardian Wisps** — orbiting orbs that **each eat one enemy bullet** before vanishing, then recharge.
17. **Second Wind** — on lethal hit, **survive at 1 HP + 1s invuln + bullet clear** (~45s cd).
18. **Graze Ward** — **near-misses build a meter** → free shield charge.
19. **Ember Cloak** — taking damage **leaves a fire ring** where you stood.
20. **Bloodpact** — **lifesteal on kill**, but +10% damage taken.

### 🌀 Passives & meta
21. **Overcharge** — every 6s your **next shot is a shotgun blast**.
22. **Ricochet** — non-piercing bolts **bounce once** to a new target.
23. **Executioner** — enemies **below 15% HP die instantly** to your hits.
24. **Greed Engine** — picking up gold/souls **briefly boosts fire rate**.
25. **Slow Field** — **passive aura slows enemy bullets** in range.
26. **Time Dilation** — when **3+ bullets are near you**, time slows ~25% for a beat.

### 💥 Ultimates / Evolutions *(charge a meter by killing)*
27. **Meteor** — delayed AoE telegraph nukes a big circle + leaves lava.
28. **Black Hole** — **pulls all enemies + their bullets** to a point, then detonates.
29. **Holy Nova** *(evolve Shockwave)* — repeating ring that **clears bullets + damages**.
30. **Phoenix** — full heal, **3s invuln + flight**, become a fire trail that ignites everything.

### Synergy evolutions (weapon + passive)
- **Chain Spark + Lightning Rod → Storm Sigil** (permanent arcing field follows you).
- **Frostbrand + Slow Field → Absolute Zero** (frozen enemies shatter into shrapnel).
- **Boomerang Axe + Ricochet → Cyclone** (axe orbits you, infinite returns).
- **Aegis Bubble + Graze Ward → Mirror Dome** (bubble *reflects* the bullets it eats).

---

## 6. Card Leveling & Evolution (Survivor.io-style)

Cards now have **levels**. Picking the same card again **levels it up** instead of giving a duplicate.

| Class | Levels | Behavior |
|---|---|---|
| **Passive** (stat boosts) | Lv 1 → 5 | Each pick stacks the same stat; caps at Lv 5, then leaves the pool. |
| **Ability** (active/weapon) | Lv 1 → Lv 2 → **EVOLVE** | 1st & 2nd pick strengthen it; the **3rd pick evolves** it into a new card. |

> Your rule = **"get 3 → evolution"** applies to Ability cards: Lv1, Lv2, then the 3rd pick transforms it.

### Card data shape
```
{
  id, name, icon, class: 'passive' | 'ability', rare?,
  levels: [ {desc, effect}, {desc, effect}, ... ],   // one entry per level
  evolve: { name, icon, desc, effect }               // abilities only; granted after max level
}
```
Player tracks `P.cardLevel[id]` (0 = not owned). Picking applies that level's `effect` and
increments. When an Ability is at its last base level, the next offer shows the **EVOLVE**
card; taking it grants the evolution and removes the card from the pool.

### Passive cards (Lv 1–5, no evolve)
| Card | Per-level effect |
|---|---|
| **Power Up** | +25% damage |
| **Quick Hands** | +18% fire rate |
| **Fleet Foot** | +12% move speed |
| **Big Heart** | +25 max HP + heal |
| **Magnet** | +40% pickup range |
| **Sharpshooter** | +10% crit chance |
| **Quick Dash** | -20% dash cooldown |

### Ability cards → Evolutions ("3 = evolve")
| Card | Lv 1 | Lv 2 | **Lv 3 = EVOLVE →** | Evolved effect |
|---|---|---|---|---|
| **Split Shot** | +1 projectile | +1 projectile | **Storm of Blades** | fire a full **ring** of blades around you |
| **Drill Rounds** | pierce +1 | pierce +1 | **Railgun** | bullets pierce **everything** + fly faster/bigger |
| **Long Shot** | +25% range | +25% range | **Deadeye** | huge range **+50% damage** |
| **Support Orb** ✦ | +1 orbiting orb | +1 orb | **Guardian Halo** | extra orb that also **deletes enemy bullets** |
| **Shockwave** ✦ | blast every 5s | faster + stronger | **Holy Nova** | huge frequent blast that **wipes nearby bullets** |
| **Lifesteal** ✦ | heal 1/kill | heal 2/kill | **Sanguine Crown** | heal a big chunk per kill |
| **Frost Field** ✦ | bullets 15% slower | 15% slower | **Absolute Zero** | enemies you hit **freeze solid** |

✦ = rare (shows up less often).

### Level-up screen behavior
On level-up, draw **3 cards** from a candidate list:
1. For each card, compute its **next move**: next level, the **evolve** card (if a maxed ability),
   or *nothing* (maxed passive / already evolved → excluded).
2. Weight the draw: **Evolve = highest weight**, normal medium, rares lower — evolutions reliably
   appear once unlocked but aren't guaranteed.
3. Card shows its state: new → name only · owned → **"Lv 2"** tag · ready → gold **"EVOLVE!"**
   ribbon + gold border (reuses existing rare styling).
4. If fewer than 3 candidates remain, backfill with still-levelable passives or a small filler.

### Optional: gated evolutions (Vampire-Survivors style)
Default is simple **"3 stacks = evolve."** For more build depth, evolutions can instead require
**max base ability + a partner passive at some level**, e.g.:
- **Storm of Blades** = Split Shot Lv2 **+ Quick Hands Lv3**
- **Deadeye** = Long Shot Lv2 **+ Sharpshooter Lv3**

Recommendation: ship the simple version first, layer gating on later if desired.

### Balance notes
- Passives cap at Lv 5 so damage can't stack infinitely; pushes you toward abilities.
- Evolutions are strong on purpose — getting one should feel like a power spike.
- Rare abilities appearing less keeps evolutions feeling earned.
- Maxed/evolved cards leave the pool so later level-ups stay meaningful.

---

## 7. Upgrade & pickup re-skin (same effects, Emberhold names)
Whetstone (+dmg) · Adrenaline (+fire rate) · Boots of Haste (+speed) · Twin Daggers (+projectile) ·
Armor-Piercing (pierce) · **Longbow (+range)** · Iron Heart (+HP) · Loot Charm (magnet) ·
Eagle Eye (crit) · Blink Step (dash cd) · Guardian Wisp (orb) · **Holy Nova** (shockwave) ·
Vampiric Edge (lifesteal) · Frost Ward (slow). Pickups: crystals → **soul shards**,
coin → **gold**, heart → **health potion**.

---

## 8. Suggested build order
1. **Reskin pass** (cheap, big impact): palette, map tiles, wall border, player + ~8 sprites,
   upgrade names — runs on the *existing* mechanics (chase/shoot + spiral/rings/chaos bosses).
2. **Card leveling + evolution system** (contained change to `js/game.js` + a little CSS for badges).
3. **Core new mechanics:** telegraphs, ground zones, lasers, splitters/summoners.
4. **Elites + bosses 3–5** using those mechanics.

---

## 9. Alternative themes (swap-in if you'd rather)
- 🌊 **Abyssal Tide** — deep-sea: pufferfish radial-spikes, jellyfish drifting curtains,
  electric eels (lasers), Kraken/Leviathan bosses.
- ✨ **Fall of the Constellations** — celestial: zodiac star-beasts firing constellation
  patterns; Sun / Black Hole / Comet / Moon bosses.
