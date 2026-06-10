# BRAINROT SURVIVORS — Italian Brainrot Bullet Hell

A mobile-first web game. One HTML file, zero dependencies, zero build step.

## Play

Open `index.html` in any browser, or host it anywhere static (GitHub Pages, Vercel, etc.).
Built for phones — add it to your home screen for fullscreen.

## How it works

- **Drag anywhere** to move (floating joystick). WASD/arrows work on desktop.
- **Auto-fire** at the nearest enemy. Your job is to position and dodge.
- **DASH** button (mobile) or Space/Shift (desktop) — a short i-frame burst to escape.
- Kills drop **crystals** → fill the XP bar → **pick 1 of 3 upgrades** (roguelike).
- Coins add score; rare hearts heal. Chain kills for a **combo score multiplier**.
- Waves get harder forever. Every 5th wave is a **boss** (spiral / ring / chaos patterns).

## The map

A real bordered arena (~2600×2600) surrounded by a wooden fence. The **camera follows you**
as you roam the field — walk to the edges, kite enemies around the world, watch the minimap
in the bottom-left to read the swarm.

## The bestiary (hand-drawn vector sprites)

Skibidi Toilet · Cappuccino Assassino · Bombardiro Crocodilo · Tralalero Tralala ·
Brr Brr Patapim · Lirili Larila.
Bosses: SKIBIDI TITAN, TRALALERO BOSS, BOMBARDIRO.

## Feel

Hit-stop on impact, squash & stretch, white hit-flash, floating damage numbers, screen
shake, knockback, particle bursts, dash afterimages, and a shockwave upgrade — tuned for
satisfying game feel.

## Tech

Vanilla JS + Canvas 2D. All characters and pickups are **code-drawn vector sprites**
pre-rendered to offscreen canvases (no emoji, no external image files). Web Audio synth
sound effects (no audio assets). Clean flat cel-shaded daylight art — no glow/bloom.
`localStorage` high score, haptic feedback on hit where supported.

## Project structure

No build step — open `index.html` directly or host it statically. The code is split
into plain (non-module) files so they still run from `file://`:

```
index.html      markup + script/style links
styles.css      all styling
js/core.js      canvas setup, shared helpers, world/camera/zoom, game-state flag
js/audio.js     Web Audio synth + sound effects
js/sprites.js   sprite factory + every character/pickup sprite
js/input.js     joystick, dash, zoom, drag/right-click guards
js/game.js      entities, upgrades, update/render loop, minimap, init
```
