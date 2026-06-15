'use strict';
// ============ GEAR: SHOP + INVENTORY + CASES ============
// Loaded after game.js so it shares the globals `gold`, `P`, sprite helpers, sfx, $.
// Items boost STARTING stats — damage (FLAT +N) / move speed (%) / attack range (%). 4 typed slots:
// the equipped piece's SLOT picks the on-character silhouette + rarity tint, its STAT picks the bonus.
// Catalog = 4 stats × 6 rarities × 7 named variants = 168 items (28 per rarity).

const GEAR_CATS = ['helmet','chest','pants','shoes'];
const CAT_LABEL = { helmet:'Helmet', chest:'Chestplate', pants:'Pants', shoes:'Shoes' };
const CAT_NOUN  = { helmet:'Helm', chest:'Plate', pants:'Greaves', shoes:'Boots' };

// rarity: border color + base price (prices cut to ~1/3 of the old shop)
// prices scale ~3-4x per tier so the next rarity costs "about one world of grinding"
// (tied to the rarity-banded gear gate — see docs/specs/2026-06-14-worlds-expansion-design.md)
const RAR = {
  common:    { name:'COMMON',    color:'#9aa3af', price:30    },
  uncommon:  { name:'UNCOMMON',  color:'#5fbf52', price:120   },
  rare:      { name:'RARE',      color:'#4aa3df', price:450   },
  epic:      { name:'EPIC',      color:'#b06ff0', price:1500  },
  legendary: { name:'LEGENDARY', color:'#e0a92e', price:4500  },
  mythic:    { name:'MYTHIC',    color:'#ff3b5c', price:13500 },
};
const RAR_ORDER = ['common','uncommon','rare','epic','legendary','mythic'];

// stat lines: damage adds a FLAT amount; speed/range add a fraction of the starting stat.
// `flat:true` marks a stat whose vals are absolute numbers (shown "+N") rather than percentages.
const STAT = {
  dmg:   { label:'damage',       short:'DMG', icon:'coin',  flat:true, vals:{common:2,uncommon:4,rare:7,epic:12,legendary:20,mythic:32} },
  hp:    { label:'max HP',       short:'HP',  icon:'heart', flat:true, vals:{common:8,uncommon:15,rare:25,epic:40,legendary:65,mythic:100} },
  speed: { label:'move speed',   short:'SPD', icon:'heart', vals:{common:0.03,uncommon:0.05,rare:0.08,epic:0.12,legendary:0.18,mythic:0.27} },
  range: { label:'attack range', short:'RNG', icon:'gem',   vals:{common:0.05,uncommon:0.09,rare:0.14,epic:0.20,legendary:0.30,mythic:0.45} },
};
const STAT_ORDER = ['dmg','hp','speed','range'];
// 7 flavour adjectives per stat -> 7 variants per (stat,rarity)
const ITEM_ADJ = {
  dmg:   ['Brawler','Berserker','Warlord','Crusher','Onslaught','Ravager','Titan'],
  hp:    ['Stalwart','Guardian','Bulwark','Ironhide','Bastion','Colossus','Immortal'],
  speed: ['Swift','Sprinter','Gale','Dasher','Quicksilver','Zephyr','Tempo'],
  range: ['Hawkeye','Marksman','Farsight','Sniper','Longshot','Eagle','Horizon'],
};

// id = "<stat>_<rarity>_<variant>"  e.g. "range_epic_3"
function itemStat(id){ return id.split('_')[0]; }
function itemRar(id){  return id.split('_')[1]; }
function itemVar(id){  return +id.split('_')[2]; }
function itemCat(id){  return GEAR_CATS[itemVar(id) % 4]; }   // slot spreads across all 4 gear pieces
function itemBonus(id){ return STAT[itemStat(id)].vals[itemRar(id)]; }
function itemPrice(id){ return RAR[itemRar(id)].price; }
function itemName(id){ return ITEM_ADJ[itemStat(id)][itemVar(id)] + ' ' + CAT_NOUN[itemCat(id)]; }
// short "+N" (flat stats) or "+N%" (percent stats) badge used on tiles/slots
function statIsFlat(stat){ return !!STAT[stat].flat; }
function itemBonusShort(id){ const s=itemStat(id); return statIsFlat(s) ? '+'+itemBonus(id) : '+'+Math.round(itemBonus(id)*100)+'%'; }
function itemBonusTxt(id){ const s=itemStat(id); return (statIsFlat(s) ? '+'+itemBonus(id) : '+'+Math.round(itemBonus(id)*100)+'%') + ' ' + STAT[s].label; }

const GEAR_CATALOG = [];
for(const s of STAT_ORDER) for(const r of RAR_ORDER) for(let i=0;i<7;i++) GEAR_CATALOG.push(s+'_'+r+'_'+i);
function catalogByRarity(r){ return GEAR_CATALOG.filter(id=>itemRar(id)===r); }

// crates: weighted random pulls. cheaper crate = mostly low rarity, pricier = better odds.
const CRATES = {
  wood:   { name:'Wooden Crate', price:40,   glow:'#9aa3af', odds:{common:60,uncommon:30,rare:8, epic:2, legendary:0, mythic:0} },
  silver: { name:'Silver Crate', price:240,  glow:'#bcd0e0', odds:{common:6, uncommon:30,rare:36,epic:20,legendary:7, mythic:1} },
  gold:   { name:'Gold Crate',   price:1200, glow:'#e0a92e', odds:{common:0, uncommon:5, rare:25,epic:38,legendary:23,mythic:9} },
};
const CRATE_ORDER = ['wood','silver','gold'];

// ---- persistent state (one-time wipe when the item-id scheme changed to stat-based) ----
if(!localStorage.getItem('br_gear_reset_v2')){
  localStorage.removeItem('br_items_owned'); localStorage.removeItem('br_gear_equipped');
  localStorage.setItem('br_gear_reset_v2','1');
}
let gearOwned = new Set(JSON.parse(localStorage.getItem('br_items_owned')||'[]'));
let gearEquip = Object.assign({helmet:null,chest:null,pants:null,shoes:null},
                              JSON.parse(localStorage.getItem('br_gear_equipped')||'{}'));
// items already viewed in the Inventory tab — anything owned-but-unseen drives the red tab badge.
// First run (no key): seed with current owned so existing gear doesn't badge.
let gearSeen = localStorage.getItem('br_gear_seen')!=null
  ? new Set(JSON.parse(localStorage.getItem('br_gear_seen'))) : new Set(gearOwned);
function saveOwned(){ localStorage.setItem('br_items_owned', JSON.stringify([...gearOwned])); if(window.markDirty) window.markDirty(); }
function saveEquip(){ localStorage.setItem('br_gear_equipped', JSON.stringify(gearEquip)); if(window.markDirty) window.markDirty(); }
function saveSeen(){  localStorage.setItem('br_gear_seen',   JSON.stringify([...gearSeen])); if(window.markDirty) window.markDirty(); }
function unseenCount(){ let n=0; for(const id of gearOwned) if(!gearSeen.has(id)) n++; return n; }
function updateInvBadge(){ const b=$('invbadge'); if(!b) return; const n=unseenCount();
  b.textContent = n>99?'99+':n; b.classList.toggle('hidden', n<=0); }

// ---- equipped bonuses (summed across the 4 slots) ----
// percent stats (speed/range) return a starting-stat multiplier; flat stats (dmg) return a raw sum.
function equippedStatBonus(stat){
  let b=0; for(const c of GEAR_CATS){ const id=gearEquip[c]; if(id && itemStat(id)===stat) b+=itemBonus(id); }
  return b;
}
function equippedStatMult(stat){ return 1 + equippedStatBonus(stat); }   // for percent stats / UI
function equippedFlatDmg(){   return equippedStatBonus('dmg');   }   // consumed by game.js startGame() (flat +damage)
function equippedHp(){        return equippedStatBonus('hp');    }   // consumed by game.js startGame() (flat +max HP)
function equippedSpeedMult(){ return equippedStatMult('speed'); }
function equippedRangeMult(){ return equippedStatMult('range'); }

// ---- daily featured rotation: deterministic by UTC date, discounted ----
function dayKey(){ const d=new Date(); return d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate(); }
function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const FEATURED_OFF = 0.25;   // 25% off featured items
function featuredPrice(id){ return Math.max(5, Math.round(itemPrice(id)*(1-FEATURED_OFF))); }
function dailyShop(n=6){
  const rng = mulberry32(hashStr(dayKey()));
  const pool = GEAR_CATALOG.slice();
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool.slice(0,n);
}

// ---- gear icon (tinted silhouette on transparent bg) ----
const GEAR_ICON = {};
function gearIconURL(id){
  if(GEAR_ICON[id]) return GEAR_ICON[id];
  const spr = (typeof tintedSprite==='function' && tintedSprite('gear_'+itemCat(id), RAR[itemRar(id)].color)) || SP['gear_'+itemCat(id)];
  const url = spr ? spr.toDataURL() : '';
  GEAR_ICON[id]=url; return url;
}

// ---- draw equipped gear over the in-game player (called from game.js draw loop) ----
function drawPlayerGear(x,y,size,rot,flip){
  for(const c of GEAR_CATS){ const id=gearEquip[c]; if(id) drawSprite('gear_'+c, x,y,size,rot,0,0,flip, RAR[itemRar(id)].color); }
}
// ---- composite the player sprite + equipped gear into a data-URL (menu + equipment screens) ----
function compositeCharURL(){
  const base = SP['player']; if(!base) return '';
  const c = document.createElement('canvas'); c.width=base.width; c.height=base.height;
  const g = c.getContext('2d'); g.drawImage(base,0,0);
  for(const cat of GEAR_CATS){ const id=gearEquip[cat]; if(!id) continue;
    const spr = (typeof tintedSprite==='function' && tintedSprite('gear_'+cat, RAR[itemRar(id)].color)) || SP['gear_'+cat];
    if(spr) g.drawImage(spr,0,0);
  }
  return c.toDataURL();
}
// The Battle stage now shows the world emblem (see game.js); the player+gear preview lives on the
// Inventory tab (#eqchar). Keep this as the world-emblem refresher so equipping gear doesn't clobber it.
function refreshMenuChar(){ if(typeof setStageEmblem==='function' && typeof selWorld!=='undefined') setStageEmblem(selWorld); }

// ---- gold display + coin chip ----
function refreshGoldUI(){ const t=$('goldtxt'); if(t) t.textContent=gold; }
let _coinURL='';
function coinTag(){ if(!_coinURL && SP['coin']) _coinURL=SP['coin'].toDataURL(); return '<img class="coinico" src="'+_coinURL+'" alt="">'; }
const _ICURL={};   // cached data-URLs for the house-drawn UI icons
function icURL(n){ if(!_ICURL[n] && SP[n]) _ICURL[n]=SP[n].toDataURL(); return _ICURL[n]||''; }
const STAT_IC = { dmg:'ic_dmg', hp:'ic_hp', speed:'ic_spd', range:'ic_rng' };
function rtagHTML(rar){ return '<span class="rtag r-'+rar+'">'+RAR[rar].name+'</span>'; }
function statTag(stat){ return '<span class="stag s-'+stat+'">'+STAT[stat].short+'</span>'; }

// ============ PURCHASING ============
function ownItem(id){ gearOwned.add(id); saveOwned(); updateInvBadge(); }   // badge the Inventory tab
function buyItem(id, price){
  if(gearOwned.has(id) || gold<price) return false;
  gold-=price; localStorage.setItem('br_gold',gold);
  ownItem(id);
  if(typeof sfx!=='undefined') sfx.coin();
  refreshGoldUI(); renderShop(); renderInventory();
  return true;
}

// ============ SHOP RENDER ============
// vertical ribboned card used in the Daily Shop grid
function shopCardHTML(id, price){
  const rar=itemRar(id), owned=gearOwned.has(id);
  const off = Math.round((1 - price/itemPrice(id))*100);
  const ribbon = off>0 ? '<div class="sribbon'+(off>=40?' big':'')+'">-'+off+'%</div>' : '';
  const action = owned ? '<div class="scheck">✓</div>'
    : '<button class="sbuy'+(gold<price?' poor':'')+'" data-id="'+id+'" data-price="'+price+'">'+coinTag()+price+'</button>';
  return '<div class="scard r-'+rar+(owned?' owned':'')+'">'+ribbon+
    '<div class="sname">'+itemName(id)+'</div>'+
    '<div class="sicon"><img src="'+gearIconURL(id)+'" alt=""></div>'+
    '<div class="stagrow">'+rtagHTML(rar)+statTag(itemStat(id))+'</div>'+
    action+'</div>';
}

function renderShop(){
  const grid=$('shopgrid'); if(!grid) return;
  // ---- DAILY SHOP (rotating, discounted) ----
  let html = '<div class="banner"><span>DAILY SHOP</span></div><div class="shopsub">Resets at midnight (UTC) · up to -25%</div>';
  html += '<div class="ggrid">';
  for(const id of dailyShop(6)) html += shopCardHTML(id, featuredPrice(id));
  html += '</div>';
  // ---- CASES ----
  html += '<div class="banner"><span>CASES</span></div><div class="crates">';
  for(const key of CRATE_ORDER){ const cr=CRATES[key]; const poor=gold<cr.price;
    html += '<div class="crate c-'+key+'" style="--glow:'+cr.glow+'">'+
      '<button class="crinfo" data-crinfo="'+key+'" title="Drop chances" aria-label="Drop chances">i</button>'+
      '<div class="cratebox"><img src="'+icURL('ic_crate')+'" alt=""></div><div class="cratename">'+cr.name+'</div>'+
      '<button class="sbuy cratebuy'+(poor?' poor':'')+'" data-crate="'+key+'">'+coinTag()+cr.price+'</button></div>';
  }
  html += '</div>';
  grid.innerHTML = html;

  grid.querySelectorAll('button.sbuy[data-id]').forEach(b=>b.addEventListener('click',()=>buyItem(b.dataset.id, +b.dataset.price)));
  grid.querySelectorAll('button[data-crate]').forEach(b=>b.addEventListener('click',()=>openCrate(b.dataset.crate)));
  grid.querySelectorAll('button[data-crinfo]').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); openCrateOdds(b.dataset.crinfo); }));
}

// ============ CASES (animated reveal) ============
function rollCrateRarity(key){
  const odds=CRATES[key].odds; let total=0; for(const r of RAR_ORDER) total+=odds[r]||0;
  let x=Math.random()*total; for(const r of RAR_ORDER){ x-=odds[r]||0; if(x<=0) return r; }
  return 'common';
}
function rollCrateItem(key){ const r=rollCrateRarity(key); const pool=catalogByRarity(r); return pool[Math.floor(Math.random()*pool.length)]; }

function openCrate(key){
  const cr=CRATES[key]; if(gold<cr.price) return;
  gold-=cr.price; localStorage.setItem('br_gold',gold); refreshGoldUI();
  if(typeof sfx!=='undefined') sfx.pick();
  const won = rollCrateItem(key);
  const dup = gearOwned.has(won);
  if(dup){ const refund=Math.round(itemPrice(won)*0.4); gold+=refund; localStorage.setItem('br_gold',gold); if(window.markDirty) window.markDirty(); }
  else ownItem(won);

  const ov=$('crate'); if(!ov){ // headless / no overlay: just resolve instantly
    refreshGoldUI(); renderShop(); renderInventory(); return won;
  }
  // build a CS:GO-style reel that decelerates onto the won item
  const ITEMW=92, REELN=44, WINIDX=REELN-6;
  const strip=$('crstrip'); strip.innerHTML='';
  for(let i=0;i<REELN;i++){
    const id = i===WINIDX ? won : GEAR_CATALOG[Math.floor(Math.random()*GEAR_CATALOG.length)];
    strip.innerHTML += '<div class="reelitem r-'+itemRar(id)+'"><img src="'+gearIconURL(id)+'"></div>';
  }
  ov.classList.remove('hidden'); $('crresult').classList.add('hidden'); $('crclaim').classList.add('hidden');
  strip.style.transition='none'; strip.style.transform='translateX(0)';
  const view=$('crview'); const center=view.clientWidth/2;
  const target = -(WINIDX*ITEMW + ITEMW/2 - center) - (Math.random()*40-20);  // tiny jitter so it isn't dead-center
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
    strip.style.transition='transform 3.6s cubic-bezier(.12,.62,.18,1)';
    strip.style.transform='translateX('+target+'px)';
  });});
  setTimeout(()=>{
    if(typeof sfx!=='undefined'){ dup?sfx.pick():sfx.evolve(); }
    const res=$('crresult');
    res.className='crresult r-'+itemRar(won);
    res.innerHTML='<img src="'+gearIconURL(won)+'"><div><div class="crwname">'+itemName(won)+'</div>'+
      rtagHTML(itemRar(won))+statTag(itemStat(won))+'<div class="gbonus">'+itemBonusTxt(won)+'</div>'+
      (dup?'<div class="crdup">duplicate · +'+Math.round(itemPrice(won)*0.4)+' refunded</div>':'<div class="crnew">NEW!</div>')+'</div>';
    res.classList.remove('hidden'); $('crclaim').classList.remove('hidden');
  }, 3800);
  return won;
}
function closeCrate(){ const ov=$('crate'); if(ov) ov.classList.add('hidden'); renderShop(); renderInventory(); }

// ============ EQUIPMENT ============
let invSort='rarity';
const SORT_LABEL = { rarity:'Rarity', stat:'Stat', slot:'Slot' };
const rarRank = id => RAR_ORDER.indexOf(itemRar(id));     // higher = rarer
function sortedOwned(){
  const list = GEAR_CATALOG.filter(id=>gearOwned.has(id));
  if(invSort==='stat') return list.sort((a,b)=> STAT_ORDER.indexOf(itemStat(a))-STAT_ORDER.indexOf(itemStat(b)) || rarRank(b)-rarRank(a));
  if(invSort==='slot') return list.sort((a,b)=> GEAR_CATS.indexOf(itemCat(a))-GEAR_CATS.indexOf(itemCat(b)) || rarRank(b)-rarRank(a));
  return list.sort((a,b)=> rarRank(b)-rarRank(a) || itemBonus(b)-itemBonus(a));   // by rarity (default)
}
function equipToggle(id){ const cat=itemCat(id); gearEquip[cat]=(gearEquip[cat]===id?null:id); saveEquip(); afterEquipChange(); }
function autoEquipBest(){   // fill every slot with its rarest owned piece — one-tap loadout
  for(const cat of GEAR_CATS){
    const best = GEAR_CATALOG.filter(id=>gearOwned.has(id) && itemCat(id)===cat)
      .sort((a,b)=> rarRank(b)-rarRank(a) || itemBonus(b)-itemBonus(a))[0];
    if(best) gearEquip[cat]=best;
  }
  saveEquip(); if(typeof sfx!=='undefined') sfx.evolve(); afterEquipChange();
}

function eqSlotHTML(cat){
  const id=gearEquip[cat];
  if(id) return '<div class="eqslot r-'+itemRar(id)+'" data-cat="'+cat+'"><span class="eqlv">'+STAT[itemStat(id)].short+'</span>'+
    '<img src="'+gearIconURL(id)+'"><span class="eqpct">'+itemBonusShort(id)+'</span></div>';
  return '<div class="eqslot" data-cat="'+cat+'"><span class="eqlv">'+CAT_LABEL[cat]+'</span><span class="eqempty">+</span></div>';
}
function renderInventory(){
  const stage=$('eqstage'); const owned=$('invowned'); if(!stage||!owned) return;
  const pct=(stat)=>Math.round((equippedStatMult(stat)-1)*100);
  stage.innerHTML =
    '<div class="eqside left">'+eqSlotHTML('helmet')+eqSlotHTML('chest')+'</div>'+
    '<div class="eqmid"><img class="eqchar" src="'+compositeCharURL()+'" alt="">'+
      '<div class="eqstats">'+
        '<span class="eqstat"><img class="ei" src="'+icURL('ic_dmg')+'">+'+equippedFlatDmg()+'</span>'+
        '<span class="eqstat"><img class="ei" src="'+icURL('ic_hp')+'">+'+equippedHp()+'</span>'+
        '<span class="eqstat"><img class="ei" src="'+icURL('ic_spd')+'">+'+pct('speed')+'%</span>'+
        '<span class="eqstat"><img class="ei" src="'+icURL('ic_rng')+'">+'+pct('range')+'%</span>'+
      '</div></div>'+
    '<div class="eqside right">'+eqSlotHTML('pants')+eqSlotHTML('shoes')+'</div>';
  stage.querySelectorAll('.eqslot[data-cat]').forEach(el=>el.addEventListener('click',()=>{
    const id=gearEquip[el.dataset.cat]; if(id) openItemPop(id); }));

  // controls: sort chips + one-tap auto-equip
  const ctl=$('eqcontrols');
  if(ctl){
    ctl.innerHTML = '<span class="sortlbl">Sort</span>'+
      ['rarity','stat','slot'].map(s=>'<button class="chip2'+(invSort===s?' on':'')+'" data-sort="'+s+'">'+SORT_LABEL[s]+'</button>').join('')+
      '<button class="chip2 auto" id="autoeq"><img class="cic" src="'+icURL('ic_bolt')+'">Auto-Equip</button>';
    ctl.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{ invSort=b.dataset.sort; if(typeof sfx!=='undefined') sfx.pick(); renderInventory(); }));
    const ae=$('autoeq'); if(ae) ae.addEventListener('click', autoEquipBest);
  }

  const list=sortedOwned();
  if(!list.length){ owned.innerHTML='<div class="invhint">Open a Case or buy gear in the Shop to fill your slots.</div>'; return; }
  let html='';
  for(const id of list){ const equipped=gearEquip[itemCat(id)]===id;
    html += '<div class="itile r-'+itemRar(id)+(equipped?' equipped':'')+'" data-id="'+id+'" title="'+itemName(id)+'">'+
      (equipped?'<span class="ieq">✓</span>':'')+'<span class="ilv">'+STAT[itemStat(id)].short+'</span>'+
      '<img src="'+gearIconURL(id)+'"><span class="ipct">'+itemBonusShort(id)+'</span></div>';
  }
  owned.innerHTML=html;
  owned.querySelectorAll('.itile[data-id]').forEach(el=>el.addEventListener('click',()=>openItemPop(el.dataset.id)));
}

// ---- item detail popup: see full stats, equip/unequip ----
function openItemPop(id){
  const ov=$('itempop'); if(!ov) return;
  const cat=itemCat(id), rar=itemRar(id), equipped=gearEquip[cat]===id;
  ov.innerHTML =
    '<div class="ipcard r-'+rar+'">'+
      '<button class="ipx" id="ipclose">✕</button>'+
      '<div class="ipicon r-'+rar+'"><img src="'+gearIconURL(id)+'"></div>'+
      '<div class="ipname">'+itemName(id)+'</div>'+
      '<div class="iptags">'+rtagHTML(rar)+statTag(itemStat(id))+'</div>'+
      '<div class="ipstat">'+itemBonusTxt(id)+'</div>'+
      '<div class="ipslot">Slot · '+CAT_LABEL[cat]+'</div>'+
      '<button class="ipbtn'+(equipped?' un':'')+'" id="ipequip">'+(equipped?'UNEQUIP':'EQUIP')+'</button>'+
    '</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) closeItemPop(); };
  $('ipclose').onclick=closeItemPop;
  $('ipequip').onclick=()=>{ equipToggle(id); closeItemPop(); };
}
function closeItemPop(){ const ov=$('itempop'); if(ov) ov.classList.add('hidden'); }

// crate drop-chance popup (info button on each case)
function openCrateOdds(key){
  const ov=$('itempop'); if(!ov) return;
  const cr=CRATES[key], odds=cr.odds;
  let total=0; for(const r of RAR_ORDER) total+=odds[r]||0;
  let rows='';
  for(const r of RAR_ORDER){ const w=odds[r]||0; if(w<=0) continue;
    const pct=w/total*100;
    rows += '<div class="oddsrow"><span class="rtag r-'+r+'">'+RAR[r].name+'</span>'+
            '<span class="oddsbarwrap"><span class="oddsbar" style="width:'+pct.toFixed(1)+'%;background:'+RAR[r].color+'"></span></span>'+
            '<span class="oddspct">'+(pct<0.1?'<0.1':pct.toFixed(1))+'%</span></div>';
  }
  ov.innerHTML =
    '<div class="ipcard">'+
      '<button class="ipx" id="ipclose">✕</button>'+
      '<div class="ipname">'+cr.name+'</div>'+
      '<div class="ipslot">Drop chances</div>'+
      '<div class="oddslist">'+rows+'</div>'+
    '</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) closeItemPop(); };
  $('ipclose').onclick=closeItemPop;
}

function afterEquipChange(){ if(typeof sfx!=='undefined') sfx.pick(); refreshMenuChar(); renderInventory(); }

// ---- tab switching ----
function showTab(name){
  for(const t of ['battle','shop','inventory']){ const p=$('tab-'+t); if(p) p.classList.toggle('hidden', t!==name); }
  document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  const menu=$('menu'); if(menu) menu.setAttribute('data-tab', name);   // per-tab background tint
  if(name==='shop') renderShop();
  if(name==='inventory'){ gearSeen=new Set(gearOwned); saveSeen(); updateInvBadge(); renderInventory(); }   // mark all seen -> clear badge
}
document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.addEventListener('click',()=>{ showTab(b.dataset.tab); if(typeof sfx!=='undefined') sfx.pick(); }));
const _crclaim=$('crclaim'); if(_crclaim) _crclaim.addEventListener('click', closeCrate);

// ---- init ----
refreshMenuChar();
renderShop();
renderInventory();
saveSeen(); updateInvBadge();   // persist the first-run seed + show any pending "new items" badge
const _initTab = (location.hash||'').slice(1);
showTab(['battle','shop','inventory'].indexOf(_initTab)>=0 ? _initTab : 'battle');

// ---- asset prewarm + loading screen ----
// All sprites are procedural canvases built at script-load. Warm the GPU upload of every sprite
// and pre-generate each gear tint so nothing is built mid-game, then fade out the loading overlay.
(function prewarmAssets(){
  const scr=document.createElement('canvas'); scr.width=scr.height=8; const sg=scr.getContext('2d');
  for(const k in SP){  try{ sg.drawImage(SP[k],0,0,8,8);  }catch(e){} }
  for(const k in SPW){ try{ sg.drawImage(SPW[k],0,0,8,8); }catch(e){} }
  if(typeof tintedSprite==='function'){ for(const cat of GEAR_CATS) for(const r of RAR_ORDER){ try{ tintedSprite('gear_'+cat, RAR[r].color); }catch(e){} } }
  const L=$('loading');
  if(L) requestAnimationFrame(()=>{ L.classList.add('fade'); setTimeout(()=>L.classList.add('hidden'), 420); });
})();
