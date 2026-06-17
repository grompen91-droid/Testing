'use strict';
// Versioning: +0.01 per patch/small update/bugfix, +0.1 per big update/rework, +1.0 per major release.
// Append a new entry (and bump CURRENT_VERSION) every push that changes the game.
const CURRENT_VERSION = '1.10';
const CHANGELOG = [
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
