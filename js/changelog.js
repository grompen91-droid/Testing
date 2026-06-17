'use strict';
// Versioning: +0.01 per patch/small update/bugfix, +0.1 per big update/rework, +1.0 per major release.
// Append a new entry (and bump CURRENT_VERSION) every push that changes the game.
const CURRENT_VERSION = '1.36';
const CHANGELOG = [
  { v: '1.36', notes: 'New character: Engineer! Fires no bullets of his own — starts with 2 turrets that share all his stats, and Dash is replaced with placing a stationary turret (25 HP, max 3). Two new Engineer-exclusive cards: Minigun Turret (fast, low damage, +fire rate then +1 turret) and Flamethrower Turret (AOE flame damage).' },
  { v: '1.26', notes: 'Fixed ability cards showing extra unreachable stars after evolving (e.g. Turret Network showed 5 star slots for a card with only 4 real levels).' },
  { v: '1.25', notes: 'Added a one-time cutscene after first clearing World 1: Tung Tung Tung Sahur rises from defeat and revives his fallen army before they vow to grow stronger.' },
  { v: '1.15', notes: 'Walking Turret redesigned: detailed tripod body with a swiveling twin-barrel head instead of a flat top-down disc. Its card description is shorter too.' },
  { v: '1.14', notes: 'Fantasma is now a Legendary character shop-only — no longer a World 9 unlock. La Strega has been removed from the game.' },
  { v: '1.13', notes: 'Challenger mode buffed: bigger boss arenas (even bigger on phase 3 finales), enemies hit harder and scale with world, 30% more mobs early on, mobs spawn closer in on wide screens, and Challenger now has its own danger-badge world icon.' },
  { v: '1.12', notes: 'Fixed world-select arrow buttons shifting position depending on world name length (title box is now a fixed width, not just a minimum).' },
  { v: '1.11', notes: 'Fixed UI layout jitter: world title, shop character carousel, weekly legendary card, and character-select button no longer shift position when text length changes.' },
  { v: '1.10', notes: 'Pulse Wave (shockwave): radius buffed to actually match its visual size, but damage nerfed and now scales off radius too, not just a flat number.' },
  { v: '1.09', notes: 'Ability cards now show up more often in level-up draws while you have none yet.' },
  { v: '1.08', notes: 'Walking Turret card is now Epic rarity.' },
  { v: '1.07', notes: 'Walking Turret card now available from World 1. Pets and characters got small idle animations (sways, glints, flickers) to feel more alive.' },
  { v: '1.06', notes: 'Added the Walking Turret card: a turret that trails behind your pet and auto-fires the closest enemy.' },
  { v: '1.05', notes: 'Fortunato now starts with 2 projectiles and can no longer pick Splinter Shot.' },
  { v: '1.04', notes: 'Added in-game Update Log (Settings → Update Log).' },
  { v: '1.03', notes: 'Added a Death Shake toggle in Settings; Calamita pet now pulses its magnet every 60s in Challenger mode.' },
  { v: '1.02', notes: 'Fixed some Inventory items becoming unselectable after a cloud-account restore (gear uid collision).' },
  { v: '1.01', notes: 'Removed the daily free coins shop feature.' },
];
