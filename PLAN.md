# BRAINROT RUMBLE — Game Rework Plan
### *(rebrand of "Brainrot Survivors" — the Italian Invasion)*

A full design plan to **rebrand and upgrade the existing brainrot game**: keep the
survivor / bullet-hell loop and the **grassy daylight cartoon world**, but give the whole
cast **better, accurate art**, add the full **Italian Brainrot** roster (30 characters),
new **cards + evolutions**, and planned **abilities**.

> Status: **design only** — nothing here is implemented yet. Drops into the existing engine
> (`index.html` + `styles.css` + `js/{core,audio,sprites,input,game}.js`).

> ⚖️ **Legal note:** the Italian Brainrot / AI-Brainrot-Animals characters are **AI-generated**,
> so they lack human authorship and are effectively **public domain** — free to recreate.
> **Do NOT copy specific human creators' assets/models** (e.g. a particular Roblox dev's mesh).
> We recreate each character **from the concept** as our own original vector sprite.

---

## 1. Rebrand & world

- **Working title:** **BRAINROT RUMBLE** (subtitle: *Italian Invasion*). Keeps the brainrot
  identity but signals a fresh, bigger version. (Name is swappable.)
- **World stays the same:** the existing **grass checkerboard field + wooden fence + daylight
  palette**, flat cel-shading, **no glow**. We are *not* changing the map — only what fights on it.
- **Tone:** the meme energy stays (sigma/rizz/Ohio/fanum-tax flavor in the UI & card names),
  just polished.

## 2. Art direction — "better art"
This is the headline upgrade. The current sprites are simple; the rebrand makes each character
**recognizable at a glance**.

- **One detailed vector sprite per character**, pre-rendered to an offscreen canvas (as now),
  but with more shapes, shading planes, and signature props (Nike sneakers, bomber wings,
  cappuccino foam, Saturn rings, etc.).
- 🔎 **Reference-check each character with an image search BEFORE drawing it** — match the
  silhouette, colors, and iconic details people expect, then stylize to our flat cartoon look.
- Consistent rules: dark outline, 1–2 flat shade tones, readable silhouette, idle wobble +
  squash-on-hit + white hit-flash (already supported).
- Bosses get **larger, multi-part sprites** + a name banner.

---

## 3. Enemy roster (24) — tiered, with attack examples
All 24 are drawn from the 30-character cast (the other 6 are bosses, §4).

### Tier I — Fodder *(fast, weak, swarm)*
1. **Spijuniro Golubiro** *(spy pigeon, shades + earpiece)* — fast erratic flyer; swarms. *Attack:* occasional single "recon" bolt.
2. **Quacodillo Bombardiro** *(rubber-duck bomber jet)* — dive-bombs; **drops a small bomb that bursts into 4** (kamikaze).
3. **Chimpanzini Bananini** *(chimp-banana)* — fast straight-line charger; peels off and re-charges.
4. **Penguino Cocosino** *(coconut-shell penguin)* — waddles, then **belly-slide dash** at you.
5. **Flamingulli-gulli-gulli** *(loopy-neck flamingo)* — weaves unpredictably; **neck-whip** melee.

### Tier II — Infantry *(chasers, light ranged)*
6. **Cappuccino Assassino** *(coffee-mug ninja, knife limbs)* — quick; **throws an aimed knife**, dashes through.
7. **Ballerina Cappuccina** *(cappuccino-head ballerina)* — pirouettes; **spin release = radial ring of 6**.
8. **Lirili Larila** *(cactus elephant in slippers)* — slow, tanky; **trunk-sprays a 3-needle spread**.
9. **Brr Brr Patapim** *(proboscis-monkey tree)* — medium; **ground-stomp lobs 2 arcing acorns**.
10. **Svinino Bombondino** *(hard-candy pig)* — bounces; **lobs a candy that shatters into 4 shards**.
11. **Castori Gangsteri** *(fedora mobster beaver)* — keeps distance; **tommy-gun burst (aimed 4-round stream)**.

### Tier III — Casters *(the bullet-hell core)*
12. **Crocodillo Ananasinno** *(pineapple croc)* — **spits a 3-chunk pineapple spread**.
13. **Blueberrinni Octopussini** *(blueberry octopus)* — **radial ring of 8 blueberries** on a timer.
14. **Graipussi Medussi** *(grapefruit jellyfish)* — drifts; **drops slow descending bullet "curtains"**.
15. **Bombombini Gusini** *(bomber-goose)* — flies overhead; **drops a line of 3 delayed bombs**.
16. **Espressona Signora** *(tall espresso-cup ballerina)* — **continuous spiral of espresso shots**.
17. **Orangutini Ananasini** *(pineapple orangutan)* — **hurls arcing pineapples that burst into a small ring**.

### Tier IV — Heavies *(tanky, telegraphed)*
18. **Rhino Toasterino** *(rhino w/ chrome toaster torso)* — charges, then **"pops toast"**: 2 toast projectiles launch up and fall as AoE markers.
19. **Il Cacto Hipopotamo** *(cactus-needle hippo)* — slow tank; **body-slam shockwave ring + outward needle burst**.
20. **Frigo Camelo** *(camel w/ fridge humps)* — tanky; **opens the fridge = a cold cone that slows you**, then a 5-ice-shard spread.
21. **Torrtuginni Dragonfrutinni** *(dragonfruit-shell turtle)* — very slow tank; **retracts into shell (invulnerable) and spin-charges in a line**.

### Tier V — Elites *(one special rule, rarer)*
22. **Pandaccini Bananini** *(panda w/ banana-peel limbs)* — **drops banana peels that make you slip** (brief control-loss patch).
23. **Tigrrullini Watermellini** *(watermelon-skin tiger)* — **telegraphed pounce-dash along a line + watermelon-seed spit (5-spread)**.
24. **Capybarelli Bananalelli** *(chill capybara w/ back-bananas)* — **support: heals & hastes nearby enemies → priority kill**; lazily lobs bananas.

---

## 4. Bosses (6) — each with a unique gimmick + phases

### B1 · **Tralalero Tralala** — *wave 5* (speed bruiser)
*Three-legged blue shark in Nike sneakers.*
- **Gimmick:** the **fastest** boss — sprints constantly, forcing you to keep moving.
- **Attacks:** telegraphed **charge-dash** across the arena (leaves a sand-spray bullet trail), **shoe-stomp shockwave ring** on stop, spits a **5-fan of bites**.
- **Enrage:** chains **two dashes** back-to-back.

### B2 · **Bombardiro Crocodilo** — *wave 10* (aerial bomber)
*Half-crocodile, half-B-29 bomber.*
- **Gimmick:** alternates **strafing flight** (hard to hit) and **bombing passes**.
- **Attacks:** **carpet-bomb lines** (telegraphed AoE circles), **radial 16-bomb burst** on a pass, summons a **Quacodillo escort**.
- **Enrage:** bombs get denser; calls a **Bombombini Gusini** wingman.

### B3 · **Tung Tung Tung Sahur** — *wave 15* (rhythm titan)
*Ominous wooden mallet / bat creature.*
- **Gimmick:** attacks on a readable **"tung… tung… tung" beat** (the sound telegraphs the timing).
- **Attacks:** overhead **mallet SLAM → expanding shockwave ring**, sweeping **bat-swing arc of bullets**, ground-pound **radial cracks** (line bullets).
- **Enrage:** the **rhythm speeds up**.

### B4 · **La Vaca Saturno Saturnita** — *wave 20* (pure bullet hell)
*Cosmic cow in a space helmet, orbiting Saturn's rings.*
- **Gimmick:** the arena-defining bullet-hell boss — spins **Saturn-ring** patterns.
- **Attacks:** **concentric expanding rings** (weave the gaps), **two counter-rotating spirals**, **homing "milky-way" orbs**, and **gravity pulses** that tug you toward it.
- **Enrage:** adds a **second ring set spinning the opposite way** (weaving curtains).

### B5 · **Gorillo Watermellondrillo** — *wave 25* (heavy bruiser)
*Silverback gorilla fused with a watermelon.*
- **Gimmick:** massive HP; **smashes the arena**.
- **Attacks:** **chest-pound shockwave**, **hurls watermelons that burst into a 12-seed spread**, ground-slam radial, **rolls across as a watermelon** (line hazard).
- **Enrage:** seed-spreads become **seed-spirals**.

### B6 · **Trippi Troppi** — *wave 30, true final* (chaos / glitch)
*Glitched cat-head on a shrimp body.*
- **Gimmick:** **GLITCH** — randomly borrows the *other bosses'* patterns; "datamosh" screen telegraphs; **briefly inverts your controls** (used sparingly + fairly).
- **Attacks:** steals **La Vaca rings**, **Bombardiro bombs**, **Sahur slams** at random; **glitch bullet-walls**; **teleport-blinks**.
- **Enrage:** cycles patterns faster + spawns **mini glitch-clones**.

---

## 5. New engine mechanics needed (for real bullet-hell)
The current engine has chase / aimed-shot / 3 boss patterns. Add:
- **Telegraphs** (warning ring/line before AoE/laser) · **AoE ground zones** (poison/cold/slip/lava, timed)
- **Homing bullets** · **Shockwave rings** · **Shields / invuln states** (turtle, gargoyle-style perch)
- **Splitters & summoners** (escorts, mini-clones) · **Player status** (slow, slip, brief control-invert — sparing)
- **Boss phases / enrage** · **Charge-dash line hazards**

---

## 6. Cards — leveling + evolution (Survivor.io-style, brainrot-flavored)

Cards have **levels**. Re-picking a card **levels it up**. Two classes:

| Class | Levels | Behavior |
|---|---|---|
| **Passive** (stat) | Lv 1 → 5 | stacks the same boost; caps at Lv 5, then leaves the pool |
| **Ability** | Lv 1 → Lv 2 → **EVOLVE** | 1st & 2nd pick strengthen it; the **3rd pick evolves** it |

> Your rule = **"get 3 → evolution."**

### Passive cards (Lv 1–5)
| Card | Per-level effect |
|---|---|
| **Sigma Grindset** | +25% damage |
| **Hyper Rizz** | +18% fire rate |
| **Nike Tech Fleece** | +12% move speed |
| **Grimace Shake** | +25 max HP + heal |
| **Gyatt Magnet** | +40% pickup range |
| **Aimbot (Legal)** | +10% crit |
| **Zoomies** | −20% dash cooldown |

### Ability cards → Evolutions ("3 = evolve")
| Card | Lv 1 | Lv 2 | **Lv 3 = EVOLVE →** | Evolved effect |
|---|---|---|---|---|
| **Fanum Tax** | +1 projectile | +1 projectile | **Full Fanum Tax** | fire a **full ring** of projectiles |
| **Ohio Drill** | pierce +1 | pierce +1 | **Drill to Ohio** | pierce **everything** + faster/bigger shots |
| **Sigma Range** | +25% range | +25% range | **Touch-Grass Sniper** | huge range **+50% damage** |
| **Emotional Support Orb** ✦ | +1 orb | +1 orb | **Sigma Squad** | extra orb that also **deletes enemy bullets** |
| **Skibidi Blast** ✦ | blast every 5s | faster + stronger | **Skibidi Nuke** | huge frequent blast that **wipes nearby bullets** |
| **Edging the Grind** ✦ | heal 1/kill | heal 2/kill | **Vampiric Rizz** | heal a big chunk per kill |
| **Cold as Ohio** ✦ | bullets 15% slower | 15% slower | **Absolute Ohio** | enemies you hit **freeze solid** |

✦ = rare (rarer in the draw). UI: owned card shows **"Lv 2"**; ready-to-evolve shows a gold
**"EVOLVE!"** badge + gold border (reuses the existing rare styling). Evolve gets the highest
draw weight once unlocked; maxed/evolved cards leave the pool.

---

## 7. Planned abilities (brainrot-flavored)
Designed for survivors auto-combat **+** dense bullet hell; several interact with *enemy bullets*.

**Weapons (how your auto-fire works):**
- **Skibidi Bolt** *(default+)* — every 5th shot is a **charged piercing bolt** w/ a trail.
- **Twin Fanum Blades** — fire **2 bolts, front + behind**.
- **Rizz Chain** — hits **arc to 3 nearby enemies**.
- **Boomerang Crocs** — Tralalero's sneaker **flies out and back** (hits twice).
- **Auto-Aim Volley** — a **5-shot spread** when you stand still ~0.5s.

**Actives (cooldown / auto):**
- **Skibidi Blink** — teleport-dash **through bullets** + explosive after-image.
- **Gyatt Dome** — bubble that **deletes enemy bullets** for 2s.
- **Mewing Parry** — dash into fire to **reflect bullets back** as damage.
- **Sigma Black Hole** *(ult)* — **pulls enemies + their bullets** in, then detonates.
- **Ohio Meteor** *(ult)* — delayed AoE telegraph nukes a big circle + leaves lava.
- **Phoenix Rizz** *(ult)* — full heal, **3s invuln + flight**, become a fire trail.

**Defensive / passive:**
- **Sigma Wisps** — orbs that **each eat one enemy bullet** then recharge.
- **Second Wind** — survive a lethal hit at **1 HP + i-frames + bullet clear** (long cd).
- **Graze Rizz** — **near-misses build a shield meter**.
- **Slow Field** — passive aura that **slows enemy bullets** in range.
- **Executioner** — enemies **under 15% HP die instantly** to your hits.

---

## 8. Pickups & misc reskin
- XP crystals → **Rizz Gems** · big crystal → **Sigma Gem** · coin → **Fanum Coins** · heart → **Grimace Shake** (heal).
- SFX keep the punchy synth; add a **"tung tung tung"** boss drum and meme-y pickup blips.

---

## 9. Suggested build order
1. **Art + roster pass** (headline): **keep the grass map/fence/palette**; draw the 24 enemies +
   6 bosses (reference-searched) and wire them onto the *existing* mechanics (chase/shoot + spiral/rings/chaos).
2. **Card leveling + evolution system** (contained change to `js/game.js` + CSS for badges).
3. **New mechanics:** telegraphs, AoE zones, shields, summoners, charge-dashes.
4. **Elites + bosses B3–B6** using those mechanics; then the planned abilities/ults.

---

## 10. Character → role index (all 30)
| # | Character | Role |
|---|---|---|
| 1 | Tralalero Tralala | **BOSS** (speed) |
| 2 | Bombardiro Crocodilo | **BOSS** (bomber) |
| 3 | Ballerina Cappuccina | T2 infantry |
| 4 | Cappuccino Assassino | T2 infantry |
| 5 | Tung Tung Tung Sahur | **BOSS** (rhythm) |
| 6 | Brr Brr Patapim | T2 infantry |
| 7 | Chimpanzini Bananini | T1 fodder |
| 8 | Bombombini Gusini | T3 caster |
| 9 | Lirili Larila | T2 infantry |
| 10 | Trippi Troppi | **BOSS** (glitch final) |
| 11 | Gorillo Watermellondrillo | **BOSS** (heavy) |
| 12 | Crocodillo Ananasinno | T3 caster |
| 13 | Pandaccini Bananini | T5 elite |
| 14 | Espressona Signora | T3 caster |
| 15 | Svinino Bombondino | T2 infantry |
| 16 | Tigrrullini Watermellini | T5 elite |
| 17 | Penguino Cocosino | T1 fodder |
| 18 | Orangutini Ananasini | T3 caster |
| 19 | Capybarelli Bananalelli | T5 elite (support) |
| 20 | Torrtuginni Dragonfrutinni | T4 heavy |
| 21 | Frigo Camelo | T4 heavy |
| 22 | Rhino Toasterino | T4 heavy |
| 23 | La Vaca Saturno Saturnita | **BOSS** (bullet hell) |
| 24 | Castori Gangsteri | T2 infantry |
| 25 | Blueberrinni Octopussini | T3 caster |
| 26 | Quacodillo Bombardiro | T1 fodder |
| 27 | Il Cacto Hipopotamo | T4 heavy |
| 28 | Graipussi Medussi | T3 caster |
| 29 | Spijuniro Golubiro | T1 fodder |
| 30 | Flamingulli-gulli-gulli | T1 fodder |
