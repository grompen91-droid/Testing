# Multi-World System — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-world structure (Grass → Dirt → Underground) with per-world rosters/themes, full-reset progression that routes a slain-boss cutscene through the menu to unlock the next world, a world-select carousel, a boss-moveset overhaul, and range-based enemy shooting AI.

**Architecture:** Wrap the existing single roster into a `WORLDS[]` data table; the active world points mutable `curFoes/curBosses/curTheme` bindings that spawn/render read. Progression persists `br_unlocked` in `localStorage`. World 1 keeps today's exact look (no visual change) — new behavior is the boss kits, range AI, and the world plumbing. World 2 ships as a dirt-tinted placeholder reusing World 1 content so the unlock loop is fully playable now; real Dirt/Underground characters come in Phases 2/3.

**Tech Stack:** Vanilla ES5-ish JS (classic non-module scripts sharing globals, runs from `file://`), HTML5 canvas, no build step, no unit-test framework. Verification is via **headless Edge harnesses** that drive `update()`/functions and write a result to a DOM attribute, read back with `--dump-dom`.

---

## Conventions used by every task

**Project facts the engineer must know:**
- Code lives in `js/{core,audio,sprites,input,game}.js` + `index.html` + `styles.css`. Globals are shared across files (no modules). Load order (from `index.html`): core → audio → sprites → input → game.
- Key globals: `P` (player), `enemies`, `gems`, `ebullets`, `bullets`, `zones`, `state`, `ST` (state enum in `core.js`), `wave`, `WORLD` (world bounds), `WALL`, `TILE`, `camera`, `zoom`, `cx` (2d ctx), `SP`/`SPW` (sprite canvases), `rand`, `dist2`, `pick`, `clamp`, `TAU`, `$` (getElementById), `bigText`, `floatText`, `burst`, `fireEB`, `addZone`, `muzzleFlash`, `shake`, `hitstop`, `playMusic`, `stopMusic`, `sfx`.
- `dist2(ax,ay,bx,by)` returns **squared** distance. Compare against `range*range`.
- There is **no `gh` CLI / Node / Python**. Use git over HTTPS (credential manager). Verify in-browser via Edge headless.

**Edge headless verification template.** For each behavior task, create a throwaway `__test.html` in the repo root that loads the real scripts with a minimal DOM, runs assertions, and writes `data-result`. Run it and read the result:

```html
<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="styles.css"></head>
<body data-result="pending">
<script>window.onerror=(m,s,l,c)=>{document.body.setAttribute('data-result','ERROR: '+m+' @'+l+':'+c);return true;};</script>
<canvas id="game"></canvas>
<div id="hud" class="hidden"><button id="pausebtn"></button>
  <div class="bar"><div id="hpfill"></div></div><div class="bar"><div id="xpfill"></div></div>
  <div id="hudrow"><span id="wavetag"></span><span id="leveltag"></span><span id="scoretag"></span></div>
  <div id="bossbar" class="hidden"><div id="bossname"></div><div class="bar"><div id="bossfill"></div></div></div></div>
<div id="combotag"></div><div id="bosswarn" class="hidden"></div><div id="dashbtn" class="hidden"></div>
<div id="zoomctl" class="hidden"><button id="zoomin"></button><button id="zoomout"></button></div>
<div id="menu" class="overlay"><div id="menutop"><div class="curpill"><img id="goldicon" alt=""><span id="goldtxt">0</span></div>
<div class="curpill"><span class="bstar">★</span><span id="besttxt">0</span></div><button id="mutebtn" class="curpill"></button></div>
<div id="menumid"><div class="title"></div><div class="subtitle"></div><div id="charwrap"><div id="charplat"></div><img id="charimg" alt=""></div></div>
<div id="menubot"><button class="bigbtn green" id="startbtn"></button><div class="hint"></div></div></div>
<div id="levelup" class="overlay hidden"><div class="panel"><h2></h2><div class="cards" id="cards"></div></div></div>
<div id="gameover" class="overlay hidden"><div class="panel"><div class="title"></div>
<div class="stats"><b id="fwave"></b><b id="fscore"></b><b id="fkills"></b><b id="fbest"></b></div><button id="retrybtn"></button></div></div>
<div id="pause" class="overlay hidden"><div class="panel"><h2 class="ptitle"></h2>
<button class="bigbtn green" id="resumebtn"></button><button class="bigbtn" id="pausemute"></button><button class="bigbtn quit" id="quitbtn"></button></div></div>
<!-- ADD any new DOM the task needs (e.g. #worldsel) here -->
<script src="js/core.js"></script><script src="js/audio.js"></script><script src="js/sprites.js"></script>
<script src="js/input.js"></script><script src="js/game.js"></script>
<script>
try{
  const C=[];
  /* <<TEST BODY: push [label,boolean] pairs into C>> */
  const fails=C.filter(c=>!c[1]).map(c=>c[0]);
  document.body.setAttribute('data-result', fails.length? 'FAIL: '+fails.join(', ') : 'PASS ('+C.length+')');
}catch(e){ document.body.setAttribute('data-result','THROW: '+e.message); }
</script>
</body></html>
```

Run (PowerShell or Bash tool):
```
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --virtual-time-budget=4000 --dump-dom "file:///C:/Users/elytr/Documents/game/Testing/__test.html"
```
Pipe to grep for `data-result="..."`. Expected: `PASS (N)`. **Delete `__test.html` before committing.**

For UI tasks, additionally capture a screenshot with `--screenshot=C:/Users/elytr/Documents/game/Testing/__shot.png --window-size=900,600` and view it; delete the png + html before commit.

---

## File Structure

- `js/game.js` — all gameplay logic: `WORLDS` table, `curFoes/curBosses/curTheme`, `curWorld`, `loadWorld`, range AI (enemy update block), boss moves (`roll`/`warp`), `worldCleared`/`cutsceneUpdate`, `startGame(idx)`, world-select wiring, theme-driven render colors. (This file is already large; we follow the existing pattern rather than splitting.)
- `js/sprites.js` — `tintedSprite(name,tint)` helper + tint hook in `drawSprite`.
- `js/core.js` — add `ST.CUTSCENE`.
- `index.html` — `#worldsel` carousel DOM; reuse existing overlays.
- `styles.css` — carousel, unlock-reveal animation, cutscene banner styling.

---

## Task 1: Enemy shooting-range AI

**Files:** Modify `js/game.js` (enemy defs in `FOES`, enemy update block ~620-651).

- [ ] **Step 1: Add `range`/`move` to shooter defs.** In `FOES`, give each entry that has a `shoot` a `range` and tag a couple mobile. Edit these lines (add the bold fields):
  - `cappuccino`: add `, range:300` to its object.
  - `ballerina`: add `, range:260, ` and set `shoot:{type:'ring',...,move:true}` (mobile strafer).
  - `candypig`: `range:300`. `beaver`: `range:340`. `lirili`: `range:320`. `patapim`: `range:300`. `pinecroc`: `range:320`. `goose`: `range:320`. `octopus`: `range:300`. `jelly`: `range:280`. `espresso`: `range:300`. `orangutan`: `range:320`. `rhino`: `range:340`. `hippo`: `range:320`.
  - `tiger`: `range:360` and add `move:true` inside its `shoot:{...}`.

  Concretely, e.g. change:
  ```js
  { spr:'cappuccino',name:'Cappuccino Assassino', hp:5, sp:90, r:15, xp:2, score:18, shoot:{type:'aim',n:1,cd:2.6,spd:175,col:'#d8e0ea'} },
  ```
  to:
  ```js
  { spr:'cappuccino',name:'Cappuccino Assassino', hp:5, sp:90, r:15, xp:2, score:18, range:300, shoot:{type:'aim',n:1,cd:2.6,spd:175,col:'#d8e0ea'} },
  ```
  (Apply the analogous one-field addition to each shooter listed above; add `move:true` inside the `shoot:{}` of `ballerina` and `tiger`.)

- [ ] **Step 2: Replace the chase block with range-aware movement.** Replace this block:
  ```js
      if(!dashing && e.iv<=0){
        const fs = e.frz>0 ? 0.2 : 1;     // Absolute Ohio freeze
        const a = Math.atan2(P.y-e.y, P.x-e.x) + Math.sin(e.t*e.wob)*0.4;
        e.x += Math.cos(a)*e.sp*fs*dt;
        e.y += Math.sin(a)*e.sp*fs*dt;
        e.face = Math.cos(a)>=0 ? 1 : -1;
      }
  ```
  with:
  ```js
      if(!dashing && e.iv<=0){
        const fs = e.frz>0 ? 0.2 : 1;     // Absolute Ohio freeze
        const toP = Math.atan2(P.y-e.y, P.x-e.x);
        const d2  = dist2(e.x,e.y,P.x,P.y);
        const rng = e.range||0;           // 0 = melee: always chase
        let a = toP + Math.sin(e.t*e.wob)*0.4;
        let move = true;
        if(rng>0){
          if(d2 > rng*rng){ move=true; }                       // out of range: approach
          else if(d2 < (rng*0.55)*(rng*0.55)){ a = toP+Math.PI + Math.sin(e.t*e.wob)*0.4; } // too close: back off
          else if(e.shoot && e.shoot.move){ a = toP + Math.PI/2; } // in range + mobile: strafe
          else { move=false; }                                  // in range + stationary: hold
        }
        if(move){ e.x += Math.cos(a)*e.sp*fs*dt; e.y += Math.sin(a)*e.sp*fs*dt; }
        e.face = Math.cos(toP)>=0 ? 1 : -1;
      }
  ```

- [ ] **Step 3: Gate firing by range.** Change the shoot condition. Replace:
  ```js
        if(e.shoot){
          e.shootCd -= dt;
          if(e.shootCd<=0){
  ```
  with:
  ```js
        if(e.shoot && (!e.range || dist2(e.x,e.y,P.x,P.y) <= e.range*e.range)){
          e.shootCd -= dt;
          if(e.shootCd<=0){
  ```

- [ ] **Step 4: Verify with harness.** Create `__test.html` (template) with TEST BODY:
  ```js
  startGame(); wave=5;
  // place one stationary shooter (beaver, range 340) far, then near
  enemies.length=0;
  const far={spr:'beaver',x:P.x+900,y:P.y,r:17,sp:62,range:340,shoot:{type:'aim',n:1,cd:2.6,spd:175,col:'#caa12f'},shootCd:0.01,t:0,wob:3,iv:0,hp:7,maxHp:7,isBoss:false,hitT:0,sq:0,frz:0};
  enemies.push(far);
  const ex0=far.x, eb=ebullets.length; update(0.1);
  C.push(['far shooter approached', far.x < ex0], ['far shooter held fire', ebullets.length===eb]);
  // now in range
  far.x=P.x+200; far.shootCd=0.01; const ix=far.x, ib=ebullets.length; update(0.1);
  C.push(['in-range shooter fired', ebullets.length>ib], ['in-range shooter ~held position', Math.abs(far.x-ix)<8]);
  ```
  Run Edge headless; expect `PASS (4)`.

- [ ] **Step 5: Delete `__test.html`, commit.**
  ```
  git add js/game.js && git commit -m "Range-based enemy shooting AI: approach, stand-and-shoot, strafe"
  ```

---

## Task 2: Boss moveset overhaul (`roll` + `warp`)

**Files:** Modify `js/game.js` (`bossMoves` ~776, `MOVE_COL` ~790, `execMove` ~795, `updateBoss` sustained-attacks block ~825-832, `spawnBoss` init ~233).

- [ ] **Step 1: Revise per-boss pools.** Replace the `gorillo` and `trippi` cases in `bossMoves`:
  ```js
    case 'gorillo':   return ['seedsmash','aimed5','ring12'];
  ```
  →
  ```js
    case 'gorillo':   return ['roll','seedsmash','ring12'];
  ```
  and
  ```js
    case 'trippi':    return ['spiral','ring16','aimed5'];
  ```
  →
  ```js
    case 'trippi':    return ['warp','spiral','ring16'];
  ```

- [ ] **Step 2: Add move colors.** In `MOVE_COL`, add: `roll:'#e0503f', warp:'#c77dff'` (append inside the object literal).

- [ ] **Step 3: Add the two move primitives to `execMove`.** Before the final `return 0.2;` in `execMove`, add:
  ```js
    case 'roll':   // Gorillo: rolling-melon charge (reuses dash fields) + seed spray + trail zones
      e.dst='wind'; e.dwin=e.enraged?0.3:0.5; e.da=Math.atan2(P.y-e.y,P.x-e.x);
      e.rollSpray=0.5; return 1.0;
    case 'warp':   // Trippi: blink near player, then disorienting double-spiral
      e.warpT=0.45; burst(e.x,e.y,'#c77dff',18,240);
      return 0.9;
  ```

- [ ] **Step 4: Implement `roll` spray + `warp` blink in `updateBoss`.** In the sustained-attacks area (after the existing `if(e.spin>0){...}` block, before the move-cycle comment), add:
  ```js
    // Gorillo rolling-melon: while dashing from a 'roll', spray seeds sideways + drop trail
    if(e.rollSpray>0 && e.dst==='dash'){
      e.rollSpray-=dt; e.spT=(e.spT||0)-dt;
      if(e.spT<=0){ e.spT=0.09;
        fireEB(e.x,e.y,e.da+Math.PI/2,150,'#e0503f'); fireEB(e.x,e.y,e.da-Math.PI/2,150,'#e0503f');
        addZone(e.x,e.y,40,{tele:0.3,life:0.8,dps:14,col:'#3f7d33'}); }
    }
    // Trippi warp: count down the blink tell, then teleport beside the player and burst
    if(e.warpT>0){ e.warpT-=dt;
      if(e.warpT<=0){
        const a=rand(0,TAU); e.x=clamp(P.x+Math.cos(a)*180,WALL+e.r,WORLD.w-WALL-e.r); e.y=clamp(P.y+Math.sin(a)*180,WALL+e.r,WORLD.h-WALL-e.r);
        burst(e.x,e.y,'#c77dff',22,260); e.spin=0.7; e.spinCol='#c77dff'; e.iv=0.2; }
    }
  ```
  Note: `roll` sets `e.dst='wind'`→ the existing dash state machine in `updateBoss` (the `e.dst==='wind'/'dash'` block) already moves the boss; but that block is gated by `if(e.dst==='wind')` unconditionally (not `if(e.dash)`), so it runs for bosses too — confirm by reading lines ~829-830. The boss dash speed there is 520, reused for the roll charge.

- [ ] **Step 5: Init new fields in `spawnBoss`.** In the boss object literal, append to the last field line:
  ```js
    mst:'recover', mt:1.0, mv:null, lastMv:null, vph:1, pull:0, spin:0, dst:'idle', iv:0,
    rollSpray:0, warpT:0
  ```

- [ ] **Step 6: Verify with harness.** TEST BODY:
  ```js
  startGame();
  C.push(['gorillo pool has roll', bossMoves({spr:'gorillo'}).includes('roll')]);
  C.push(['trippi pool has warp', bossMoves({spr:'trippi',vph:1}).includes('warp')]);
  C.push(['roll color', !!MOVE_COL.roll], ['warp color', !!MOVE_COL.warp]);
  // execute each move on a fake boss without throwing
  const g={spr:'gorillo',x:WORLD.w/2,y:WORLD.h/2,r:60,enraged:false,mv:'roll',dst:'idle'}; execMove(g);
  C.push(['roll set wind', g.dst==='wind']);
  const tr={spr:'trippi',x:WORLD.w/2,y:WORLD.h/2,r:56,mv:'warp'}; execMove(tr);
  C.push(['warp set tell', tr.warpT>0]);
  ```
  Expect `PASS (6)`.

- [ ] **Step 7: Delete `__test.html`, commit.**
  ```
  git add js/game.js && git commit -m "Boss overhaul: rolling-melon (Gorillo) + warp (Trippi) signature moves"
  ```

---

## Task 3: World data model refactor (no behavior change)

**Files:** Modify `js/game.js` (`FOES`/`BOSSES` definitions, add `WORLDS` + accessors; repoint `spawnEnemy`/`spawnBoss`).

- [ ] **Step 1: Rename the existing arrays.** Change `const FOES = [` → `const FOES_GRASS = [` and `const BOSSES = [` → `const BOSSES_GRASS = [`.

- [ ] **Step 2: Add the `WORLDS` table + active bindings.** Immediately after `BOSSES_GRASS` closes, add:
  ```js
  // ---- worlds: each = theme + roster + boss list + wave target (boss wave). ----
  const WORLDS = [
    { id:'grass', name:'GRASSLANDS', waveTarget:20, endless:false,
      theme:{ void:'#5b7d33', tile1:'#86c64a', tile2:'#7cbd43', tuft:'rgba(60,110,40,0.35)',
              wall:null, post:null, bg:'#6fae3d', tint:null, music:'game' },
      foes:FOES_GRASS, bosses:BOSSES_GRASS },
  ];
  let worldIdx = 0;
  function curWorld(){ return WORLDS[worldIdx]; }
  let curFoes   = WORLDS[0].foes;
  let curBosses = WORLDS[0].bosses;
  let curTheme  = WORLDS[0].theme;
  ```
  (`wall`/`post` `null` means "use the existing hardcoded border colors" — Task 4 wires those; World 2/3 added in Task 5.)

- [ ] **Step 3: Repoint spawns.** In `spawnEnemy`, change `const def = FOES[Math.floor(...)]` → `const def = curFoes[Math.floor(...)]` and `Math.min(FOES.length-1, ...)` → `Math.min(curFoes.length-1, ...)`. In `spawnBoss`, change `BOSSES[(Math.floor(wave/5)-1) % BOSSES.length]` → `curBosses[(Math.floor(wave/5)-1) % curBosses.length]`.

- [ ] **Step 4: Verify nothing else references the old names.** Grep `\bFOES\b|\bBOSSES\b` in `js/game.js`; expect **zero** matches (all are now `FOES_GRASS`/`BOSSES_GRASS`/`curFoes`/`curBosses`). Fix any stragglers.

- [ ] **Step 5: Harness — World 1 unchanged.** TEST BODY:
  ```js
  C.push(['3?…1 world for now', WORLDS.length===1]);
  C.push(['curFoes is grass', curFoes===FOES_GRASS], ['curBosses is grass', curBosses===BOSSES_GRASS]);
  startGame(); wave=2; spawnEnemy();
  C.push(['enemy spawned from grass roster', enemies.some(e=>FOES_GRASS.some(f=>f.spr===e.spr))]);
  ```
  Expect `PASS (4)`.

- [ ] **Step 6: Delete `__test.html`, commit.**
  ```
  git add js/game.js && git commit -m "Refactor roster into WORLDS table with active curFoes/curBosses/curTheme"
  ```

---

## Task 4: Theme-driven rendering + sprite tint

**Files:** Modify `js/game.js` (`render` ground ~920-940, `drawBorder` colors, enemy/boss draw calls), `js/sprites.js` (`tintedSprite` + `drawSprite` tint arg).

- [ ] **Step 1: Theme the ground.** In `render`, replace the three hardcoded ground colors:
  - `cx.fillStyle='#5b7d33';` → `cx.fillStyle=curTheme.void;`
  - `cx.fillStyle = odd ? '#86c64a' : '#7cbd43';` → `cx.fillStyle = odd ? curTheme.tile1 : curTheme.tile2;`
  - `cx.fillStyle='rgba(60,110,40,0.35)';` (tufts) → `cx.fillStyle=curTheme.tuft;`

- [ ] **Step 2: Theme the border.** Read `drawBorder`. It uses a dark band fill and post color (hardcoded). Replace the band `fillStyle` with `curTheme.wall||'<existing color>'` and post `fillStyle`/stroke with `curTheme.post||'<existing color>'` (keep the existing literals as the `||` fallback so World 1, with `wall:null/post:null`, looks identical).

- [ ] **Step 3: Theme the page background.** In `js/game.js` init (or wherever the body bg is set) the page bg is CSS `#6fae3d` in `styles.css`. Add to `loadWorld` (created in Task 6) a line `document.body.style.background = curTheme.bg;`. For now, add to the init block after `computeCamera()`: `document.body.style.background = curTheme.bg;`.

- [ ] **Step 4: Add `tintedSprite` to `js/sprites.js`.** After the `SP`/`SPW` definitions add:
  ```js
  const TINTED = {};
  function tintedSprite(name, tint){
    const key=name+'|'+tint; if(TINTED[key]) return TINTED[key];
    const src=SP[name]; if(!src) return null;
    const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
    const g=c.getContext('2d'); g.drawImage(src,0,0);
    g.globalCompositeOperation='source-atop'; g.globalAlpha=0.42; g.fillStyle=tint;
    g.fillRect(0,0,c.width,c.height);
    TINTED[key]=c; return c;
  }
  ```

- [ ] **Step 5: Add a tint arg to `drawSprite`.** Change the signature `function drawSprite(name, x, y, size, rot, sq, hitT, flip){` → `function drawSprite(name, x, y, size, rot, sq, hitT, flip, tint){` and the draw line:
  ```js
  cx.drawImage(img, -size/2, -size/2, size, size);
  ```
  →
  ```js
  const drawImg = (tint && tintedSprite(name,tint)) || img;
  cx.drawImage(drawImg, -size/2, -size/2, size, size);
  ```

- [ ] **Step 6: Pass the world tint when drawing enemies/bosses only.** In `render`, find the enemy/boss `drawSprite(...)` calls and append `, curTheme.tint` as the last arg. (Leave gems, coins, player, orbs untinted — do not add the arg to those calls.)

- [ ] **Step 7: Harness — World 1 colors intact + tint helper works.** TEST BODY:
  ```js
  C.push(['void color', curTheme.void==='#5b7d33'], ['tile1', curTheme.tile1==='#86c64a']);
  C.push(['no tint world1', curTheme.tint===null]);
  C.push(['tintedSprite returns canvas', !!tintedSprite('pigeon','#7a4a1f')]);
  ```
  Expect `PASS (4)`. Also capture a screenshot of the menu (drifting enemies) and confirm it looks **identical** to before (green field).

- [ ] **Step 8: Delete test files, commit.**
  ```
  git add js/game.js js/sprites.js && git commit -m "Theme-driven ground/border/bg colors + optional per-world sprite tint"
  ```

---

## Task 5: Add World 2 (Dirt placeholder) + World 3 (Underground placeholder)

**Files:** Modify `js/game.js` (`WORLDS` array).

- [ ] **Step 1: Append two worlds.** Add to the `WORLDS` array (after the grass entry):
  ```js
    { id:'dirt', name:'DIRT DEPTHS', waveTarget:30, endless:false,
      theme:{ void:'#5a3d28', tile1:'#7a5333', tile2:'#6f4a2c', tuft:'rgba(40,26,14,0.35)',
              wall:'#4a3320', post:'#3a2616', bg:'#6b4a30', tint:'#8a5a2c', music:'game' },
      foes:FOES_GRASS, bosses:BOSSES_GRASS },
    { id:'under', name:'THE UNDERGROUND', waveTarget:0, endless:true,
      theme:{ void:'#1c1622', tile1:'#33293f', tile2:'#2c2336', tuft:'rgba(120,90,160,0.25)',
              wall:'#241a30', post:'#160f1e', bg:'#241a30', tint:'#6a4f8a', music:'boss2' },
      foes:FOES_GRASS, bosses:BOSSES_GRASS },
  ```
  (Both reuse the grass roster as a placeholder; Phases 2/3 replace `foes`/`bosses` with bespoke arrays.)

- [ ] **Step 2: Harness.** TEST BODY:
  ```js
  C.push(['3 worlds', WORLDS.length===3]);
  C.push(['dirt target 30', WORLDS[1].waveTarget===30], ['dirt has tint', WORLDS[1].theme.tint==='#8a5a2c']);
  C.push(['under endless', WORLDS[2].endless===true]);
  ```
  Expect `PASS (4)`.

- [ ] **Step 3: Commit.**
  ```
  git add js/game.js && git commit -m "Add Dirt + Underground placeholder worlds (reuse grass roster, themed)"
  ```

---

## Task 6: Progression — loadWorld, startGame(idx), unlock persistence, world-complete detection

**Files:** Modify `js/game.js` (`startGame`, boss-death branch ~671-680, init block; add `loadWorld`, unlock state). `index.html`/wiring touched in Task 8.

- [ ] **Step 1: Add unlock state + `loadWorld`.** Near `worldIdx` (Task 3) add:
  ```js
  let unlockedMax = +(localStorage.getItem('br_unlocked')||0);
  let selWorld = unlockedMax;
  function loadWorld(idx){
    worldIdx = clamp(idx,0,WORLDS.length-1);
    curFoes = curWorld().foes; curBosses = curWorld().bosses; curTheme = curWorld().theme;
    document.body.style.background = curTheme.bg;
  }
  ```

- [ ] **Step 2: Make `startGame` take a world index.** Change `function startGame(){` → `function startGame(idx){`. At the top of the body, before `initAudio()`, add:
  ```js
    loadWorld(typeof idx==='number' ? idx : selWorld);
  ```
  Change `playMusic('game');` → `playMusic(curTheme.music);`.

- [ ] **Step 3: Detect world completion at the final boss.** In the boss-death branch, wrap the existing boss-down body. Replace:
  ```js
      if(e.isBoss){
        boss=null; arena=null;       // open the field back up
        $('bossbar').classList.add('hidden');
        playMusic('game'); sfx.win();
        bigText('BOSS DOWN','#4aa3df');
  ```
  with:
  ```js
      if(e.isBoss && !curWorld().endless && wave >= curWorld().waveTarget){
        boss=null; arena=null;
        $('bossbar').classList.add('hidden');
        ebullets=[];
        worldCleared(e);            // cutscene path (Task 7); skip normal drops/reopen
      } else if(e.isBoss){
        boss=null; arena=null;       // open the field back up
        $('bossbar').classList.add('hidden');
        playMusic(curTheme.music); sfx.win();
        bigText('BOSS DOWN','#4aa3df');
  ```
  (The `else if(e.isBoss)` keeps the existing drop/escalation code that follows unchanged. Leave its closing brace and the `} else {` enemy branch intact.)

- [ ] **Step 4: Stub `worldCleared` for now.** Add a temporary function (replaced fully in Task 7) so this task is testable:
  ```js
  function worldCleared(boss){
    unlockedMax = Math.min(WORLDS.length-1, Math.max(unlockedMax, worldIdx+1));
    localStorage.setItem('br_unlocked', unlockedMax);
    selWorld = Math.min(WORLDS.length-1, worldIdx+1);
    // Task 7 replaces this with the cutscene; for now jump straight to menu.
    quitToMenu();
  }
  ```

- [ ] **Step 5: Update the init call.** The init block calls `startGame` via the start button (Task 8 rewires it). For now ensure the existing `$('startbtn').addEventListener('click', startGame)` still works — `startGame(undefined)` falls back to `selWorld`. No change needed; confirm by reading the listener.

- [ ] **Step 6: Harness — progression.** TEST BODY:
  ```js
  localStorage.setItem('br_unlocked','0'); unlockedMax=0; selWorld=0;
  startGame(0); C.push(['loaded grass', worldIdx===0]);
  // simulate clearing the world-20 boss
  wave=20; const e={isBoss:true,x:P.x,y:P.y,r:54,hp:0,maxHp:540,spr:'tralalero',score:500};
  enemies.length=0; enemies.push(e);
  worldCleared(e);
  C.push(['unlocked dirt', unlockedMax===1], ['saved', localStorage.getItem('br_unlocked')==='1'],
         ['sel defaults to dirt', selWorld===1], ['back to menu', state===ST.MENU]);
  startGame(1); C.push(['startGame(1) loads dirt', worldIdx===1 && curTheme.tint==='#8a5a2c']);
  ```
  Expect `PASS (6)`.

- [ ] **Step 7: Delete test, commit.**
  ```
  git add js/game.js && git commit -m "World progression: loadWorld, startGame(idx), unlock persistence, world-complete detection"
  ```

---

## Task 7: Slain-boss cutscene → menu

**Files:** Modify `js/core.js` (add `ST.CUTSCENE`), `js/game.js` (`loop` dispatch, `worldCleared`, `cutsceneUpdate`, cutscene render overlay), `styles.css` (banner).

- [ ] **Step 1: Add the state.** In `js/core.js`: `const ST = { MENU:0, PLAY:1, LEVELUP:2, OVER:3, PAUSE:4, CUTSCENE:5 };`

- [ ] **Step 2: Dispatch in `loop`.** In `loop`, after `else if(state===ST.MENU) menuUpdate(dt);` add `else if(state===ST.CUTSCENE) cutsceneUpdate(dt);`.

- [ ] **Step 3: Replace `worldCleared` with the cutscene starter.** Replace the Task-6 stub:
  ```js
  let cut = null;   // cutscene state
  function worldCleared(boss){
    unlockedMax = Math.min(WORLDS.length-1, Math.max(unlockedMax, worldIdx+1));
    localStorage.setItem('br_unlocked', unlockedMax);
    selWorld = Math.min(WORLDS.length-1, worldIdx+1);
    state = ST.CUTSCENE;
    cut = { t:0, boss:boss, alpha:1, fade:0, name:curWorld().name };
    boss.cut = true;                 // mark for the death animation
    enemies.length=0; enemies.push(boss);   // keep only the dying boss on screen
    ebullets=[]; bullets=[]; zones=[];
    hitstop=0.25; shake=Math.max(shake,16);
    stopMusic(); sfx.win();
    bigText('WORLD CLEARED','#ffd24a');
  }
  ```

- [ ] **Step 4: Implement `cutsceneUpdate`.** Add:
  ```js
  function cutsceneUpdate(dt){
    computeCamera();
    if(!cut) return;
    cut.t += dt;
    const b=cut.boss;
    // pulsing death: bursts + scale-up then fade
    b.sq = 0.6;
    if(cut.t < 1.4){ if(Math.random()<0.5) burst(b.x+rand(-b.r,b.r), b.y+rand(-b.r,b.r), '#ffd24a', 10, 260); }
    b.deathScale = 1 + cut.t*0.5;
    cut.alpha = Math.max(0, 1 - (cut.t-1.0)/0.8);    // boss fades out 1.0..1.8s
    if(cut.t > 1.6) cut.fade = Math.min(1, (cut.t-1.6)/0.7);  // screen fades to theme color
    // advance floating texts/particles so they animate during the cutscene
    for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.t=(p.t||0)+dt; p.x+=(p.vx||0)*dt; p.y+=(p.vy||0)*dt; p.life-=dt; if(p.life<=0) parts.splice(i,1); }
    if(cut.t > 2.5){ cut=null; toMenuFromClear(); }
  }
  function toMenuFromClear(){
    quitToMenu();                       // existing teardown → menu (full reset)
    triggerUnlockReveal();              // Task 8
  }
  ```

- [ ] **Step 4b: Use the death alpha/scale when rendering the boss.** In `render`, where the boss sprite is drawn, multiply size by `e.deathScale||1` and wrap with alpha when `cut`:
  ```js
  if(e.cut){ cx.globalAlpha = cut?cut.alpha:1; }
  drawSprite(e.spr, e.x, e.y, sizeExpr*(e.deathScale||1), …, curTheme.tint);
  if(e.cut){ cx.globalAlpha = 1; }
  ```
  (Find the existing boss draw call and apply; `sizeExpr` = whatever the current size argument is.)

- [ ] **Step 5: Draw the fade + banner.** At the very end of `render` (after `cx.restore()` for the world transform, in screen space), add:
  ```js
  if(state===ST.CUTSCENE && cut && cut.fade>0){
    cx.save(); cx.globalAlpha=cut.fade; cx.fillStyle=curTheme.bg; cx.fillRect(0,0,W,H); cx.restore();
  }
  ```
  (The "WORLD CLEARED" text uses the existing `bigText` overlay system already shown.)

- [ ] **Step 6: Add `triggerUnlockReveal` stub** (filled in Task 8) so this compiles: `function triggerUnlockReveal(){}`.

- [ ] **Step 7: Harness — cutscene runs and lands on menu.** TEST BODY:
  ```js
  startGame(0); wave=20;
  const b={isBoss:true,x:P.x,y:P.y,r:54,hp:0,maxHp:540,spr:'tralalero',score:500,t:0,sq:0};
  enemies.length=0; enemies.push(b);
  worldCleared(b);
  C.push(['entered cutscene', state===ST.CUTSCENE], ['cut set', !!cut]);
  for(let i=0;i<60;i++){ cutsceneUpdate(0.05); }   // ~3s
  C.push(['cutscene ended->menu', state===ST.MENU], ['unlocked dirt', unlockedMax>=1], ['sel dirt', selWorld===1]);
  ```
  Expect `PASS (5)`. Also screenshot mid-cutscene (drive ~1.7s then `render()`) to confirm fade/banner.

- [ ] **Step 8: Delete tests, commit.**
  ```
  git add js/core.js js/game.js styles.css && git commit -m "Slain-boss cutscene: death FX + fade, routes to menu on world clear"
  ```

---

## Task 8: World-select carousel + menu unlock reveal

**Files:** Modify `index.html` (`#worldsel` DOM), `styles.css` (carousel + reveal animation), `js/game.js` (carousel render/wiring, `triggerUnlockReveal`, start-button rewire).

- [ ] **Step 1: Add carousel DOM.** In `index.html`, inside `#menumid` after `#charwrap`, add:
  ```html
  <div id="worldsel">
    <button id="wprev" type="button" aria-label="Previous world">◀</button>
    <span id="wname">WORLD 1 · GRASSLANDS</span>
    <button id="wnext" type="button" aria-label="Next world">▶</button>
  </div>
  ```

- [ ] **Step 2: Style it.** In `styles.css` add:
  ```css
  #worldsel { display:flex; align-items:center; gap:clamp(10px,2.4vmin,20px); margin-top:clamp(8px,2vmin,16px);
    background:#fbf3df; border:3px solid #3a2d22; border-radius:20px; padding:clamp(6px,1.4vmin,12px) clamp(12px,2.6vmin,20px);
    box-shadow:0 4px 0 rgba(58,45,34,0.3); }
  #worldsel button { background:#5fbf52; color:#fff; border:3px solid #3a2d22; border-radius:12px; cursor:pointer;
    width:clamp(34px,5.5vmin,46px); height:clamp(34px,5.5vmin,46px); font-weight:900; font-size:clamp(15px,2.6vmin,22px); }
  #worldsel button:disabled { background:#c9bda3; cursor:default; }
  #wname { font-weight:900; color:#3a2d22; font-size:clamp(14px,2.6vmin,22px); min-width:clamp(150px,28vmin,260px); text-align:center; }
  #worldsel.reveal { animation:wreveal 1.4s ease; }
  @keyframes wreveal { 0%{ transform:scale(0.7); filter:brightness(2); } 40%{ transform:scale(1.12);} 100%{ transform:scale(1);} }
  ```

- [ ] **Step 3: Carousel logic in `js/game.js`.** Near the other menu wiring (where `#startbtn` is bound), add:
  ```js
  function worldLabel(i){ return 'WORLD '+(i+1)+' · '+(i<=unlockedMax ? WORLDS[i].name : '??? 🔒'); }
  function refreshWorldSel(){
    $('wname').textContent = worldLabel(selWorld);
    $('wprev').disabled = selWorld<=0;
    $('wnext').disabled = selWorld>=unlockedMax;     // can't pick locked worlds
  }
  $('wprev').addEventListener('click', ()=>{ if(selWorld>0){ selWorld--; refreshWorldSel(); sfx.pick(); }});
  $('wnext').addEventListener('click', ()=>{ if(selWorld<unlockedMax){ selWorld++; refreshWorldSel(); sfx.pick(); }});
  function triggerUnlockReveal(){
    refreshWorldSel();
    const el=$('worldsel'); el.classList.remove('reveal'); void el.offsetWidth; el.classList.add('reveal');
    bigText('NEW WORLD UNLOCKED','#ffd24a');
  }
  refreshWorldSel();
  ```

- [ ] **Step 4: Rewire the start button to use the selected world.** Replace `$('startbtn').addEventListener('click', startGame);` with `$('startbtn').addEventListener('click', ()=>startGame(selWorld));`. (Leave `#retrybtn` as-is, or also point it at `()=>startGame(selWorld)`.)

- [ ] **Step 5: Add `#worldsel` to the harness DOM** (so tests/screens don't error): include the Step-1 markup in the `__test.html`/`__shot.html` `#menumid`.

- [ ] **Step 6: Harness — carousel + reveal.** TEST BODY:
  ```js
  localStorage.setItem('br_unlocked','1'); unlockedMax=1; selWorld=1; refreshWorldSel();
  C.push(['label dirt', $('wname').textContent.includes('DIRT')]);
  C.push(['next disabled at max', $('wnext').disabled===true]);
  selWorld=0; refreshWorldSel(); C.push(['prev disabled at 0', $('wprev').disabled===true]);
  // locked world shows lock
  unlockedMax=0; selWorld=0; refreshWorldSel();
  C.push(['world2 label hidden when locked', worldLabel(2).includes('???')]);
  triggerUnlockReveal(); C.push(['reveal class added', $('worldsel').classList.contains('reveal')]);
  ```
  Expect `PASS (5)`. Screenshot the menu to confirm the carousel sits cleanly under the character.

- [ ] **Step 7: Delete tests, commit.**
  ```
  git add index.html styles.css js/game.js && git commit -m "World-select carousel + 'new world unlocked' menu reveal"
  ```

---

## Task 9: Full end-to-end smoke test + PR

**Files:** none (verification only), then PR.

- [ ] **Step 1: Real-page smoke test.** Load the actual `index.html` headless with an injected trap is not possible without editing; instead create one final `__e2e.html` = copy of `index.html` with the `window.onerror` trap script inserted right after `<body>` and a trailing script that runs: `startGame(0)` → set `wave=20`, force `spawnBoss()`, set boss `hp=0`, call one `update(0.05)` to trigger `worldCleared`, drive `cutsceneUpdate` ~3s, then assert `state===ST.MENU && unlockedMax===1`, write `data-result`. Expect `PASS`. Delete `__e2e.html`.

- [ ] **Step 2: Visual pass.** Screenshot: (a) menu carousel, (b) World 1 gameplay (unchanged green), (c) World 2 after `startGame(1)` (brown/dirt tint), (d) mid-cutscene fade. Confirm each. Delete pngs.

- [ ] **Step 3: Confirm no throwaway files remain.** `git status` shows only intended source changes; no `__*.html`/`__*.png`.

- [ ] **Step 4: Branch, push, PR, merge** (per repo workflow — credential-manager push + REST API PR, squash-merge to `main`). Commit message references the spec doc.

---

## Self-review notes
- **Spec coverage:** Part 1 → Task 3/5; Part 2 → Task 6; Part 3 → Task 4; Part 4 (cutscene+reveal) → Tasks 7/8; Part 5 (carousel) → Task 8; Part 6 (boss overhaul) → Task 2; Part 7 (range AI) → Task 1. All covered.
- **Ordering:** Tasks 1–2 are world-independent and ship value immediately. 3–5 are no-behavior-change plumbing. 6–8 build the loop. 9 verifies + ships.
- **Type/name consistency:** `curWorld()`, `curFoes`, `curBosses`, `curTheme`, `worldIdx`, `unlockedMax`, `selWorld`, `loadWorld`, `worldCleared`, `cutsceneUpdate`, `triggerUnlockReveal`, `refreshWorldSel`, `worldLabel` used consistently across tasks. `startGame(idx)` signature consistent (Tasks 6/8). Theme keys (`void/tile1/tile2/tuft/wall/post/bg/tint/music`) consistent across Tasks 3/4/5.
- **Deferred to Phase 2/3:** bespoke Dirt/Underground rosters & unique behaviors, per-world music, hand-drawn cutscene art.
