'use strict';
// Versioning: +0.01 per patch/small update/bugfix, +0.1 per big update/rework, +1.0 per major release.
// Append a new entry (and bump CURRENT_VERSION) every push that changes the game.
const CURRENT_VERSION = '1.06';
const CHANGELOG = [
  { v: '1.06', notes: 'Added the Walking Turret card: a turret that trails behind your pet and auto-fires the closest enemy.' },
  { v: '1.05', notes: 'Fortunato now starts with 2 projectiles and can no longer pick Splinter Shot.' },
  { v: '1.04', notes: 'Added in-game Update Log (Settings → Update Log).' },
  { v: '1.03', notes: 'Added a Death Shake toggle in Settings; Calamita pet now pulses its magnet every 60s in Challenger mode.' },
  { v: '1.02', notes: 'Fixed some Inventory items becoming unselectable after a cloud-account restore (gear uid collision).' },
  { v: '1.01', notes: 'Removed the daily free coins shop feature.' },
];
