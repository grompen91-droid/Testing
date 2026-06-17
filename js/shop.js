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
const GEAR_UID_KEY = 'br_gear_uid_seq';
const SELL_RATE = 0.4;
const FUSE_BASE = 20;
const FUSE_STEP = 10;
const FUSE_CAP = 100;

// ---- persistent state (one-time wipe when the item-id scheme changed to stat-based) ----
if(!localStorage.getItem('br_gear_reset_v2')){
  localStorage.removeItem('br_items_owned'); localStorage.removeItem('br_gear_equipped');
  localStorage.setItem('br_gear_reset_v2','1');
}
function makeGearUid(){ return 'g'+Date.now().toString(36)+(Math.random()*1e8>>>0).toString(36); }
function isGearInstance(v){ return !!v && typeof v==='object' && typeof v.itemId==='string'; }
function normalizeOwned(raw){
  let next = 1;
  try{ next = Math.max(1, +(localStorage.getItem(GEAR_UID_KEY)||1)); }catch(_){}
  let dirty = false;
  const list = Array.isArray(raw) ? raw.map(entry=>{
    if(typeof entry==='string'){
      dirty = true;
      return { uid:'g'+(next++).toString(36), itemId:entry };
    }
    if(isGearInstance(entry)){
      if(!entry.uid){ dirty = true; return { uid:'g'+(next++).toString(36), itemId:entry.itemId }; }
      return { uid:String(entry.uid), itemId:entry.itemId };
    }
    dirty = true;
    return null;
  }).filter(Boolean) : [];
  localStorage.setItem(GEAR_UID_KEY, String(next));
  return { list, dirty };
}
function normalizeSeen(raw, owned){
  const ownedIds = new Set(owned.map(x=>x.uid));
  const seen = Array.isArray(raw) ? raw.map(String).filter(id=>ownedIds.has(id)) : [];
  return { list:[...new Set(seen)], dirty:seen.length !== new Set(seen).size || seen.length !== (Array.isArray(raw)?raw.length:0) };
}
function normalizeEquip(raw, owned){
  const byUid = new Map(owned.map(x=>[x.uid, x]));
  const byItem = new Map();
  for(const inst of owned) if(!byItem.has(inst.itemId)) byItem.set(inst.itemId, inst.uid);
  const out = { helmet:null, chest:null, pants:null, shoes:null };
  let dirty = false;
  for(const cat of GEAR_CATS){
    const value = raw && raw[cat]!=null ? raw[cat] : null;
    if(value==null) continue;
    if(byUid.has(value)){ out[cat]=String(value); continue; }
    if(typeof value==='string' && byItem.has(value)){ out[cat]=byItem.get(value); dirty = true; continue; }
    dirty = true;
  }
  return { map:out, dirty };
}
let _gearUidSeq = Math.max(1, +(localStorage.getItem(GEAR_UID_KEY)||1));
function nextGearUid(){ const uid='g'+(_gearUidSeq++).toString(36); localStorage.setItem(GEAR_UID_KEY, String(_gearUidSeq)); return uid; }
const _ownedRaw = JSON.parse(localStorage.getItem('br_items_owned')||'[]');
const _ownedNorm = normalizeOwned(_ownedRaw);
let gearOwned = _ownedNorm.list;
const _equipRaw = JSON.parse(localStorage.getItem('br_gear_equipped')||'{}');
const _equipNorm = normalizeEquip(_equipRaw, gearOwned);
let gearEquip = _equipNorm.map;
// items already viewed in the Inventory tab — anything owned-but-unseen drives the red tab badge.
// First run (no key): seed with current owned so existing gear doesn't badge.
const _seenRaw = localStorage.getItem('br_gear_seen')!=null
  ? JSON.parse(localStorage.getItem('br_gear_seen')) : gearOwned.map(x=>x.uid);
const _seenNorm = normalizeSeen(_seenRaw, gearOwned);
let gearSeen = new Set(_seenNorm.list);
if(_ownedNorm.dirty) localStorage.setItem('br_items_owned', JSON.stringify(gearOwned));
if(_equipNorm.dirty) localStorage.setItem('br_gear_equipped', JSON.stringify(gearEquip));
if(_seenNorm.dirty) localStorage.setItem('br_gear_seen', JSON.stringify([...gearSeen]));
function saveOwned(){ localStorage.setItem('br_items_owned', JSON.stringify(gearOwned)); if(window.markDirty) window.markDirty(); }
function saveEquip(){ localStorage.setItem('br_gear_equipped', JSON.stringify(gearEquip)); if(window.markDirty) window.markDirty(); }
function saveSeen(){  localStorage.setItem('br_gear_seen',   JSON.stringify([...gearSeen])); if(window.markDirty) window.markDirty(); }
function gearInstanceItem(uid){ const inst=gearOwned.find(x=>x.uid===uid); return inst?inst.itemId:null; }
function ownedGearList(){ return gearOwned.slice(); }
function hasItemId(itemId){ return gearOwned.some(x=>x.itemId===itemId); }
function addGearInstance(itemId){
  const inst = { uid:nextGearUid(), itemId };
  gearOwned.push(inst);
  saveOwned();
  updateInvBadge();
  return inst;
}
function removeGearInstance(uid){
  const idx = gearOwned.findIndex(x=>x.uid===uid);
  if(idx<0) return null;
  const [removed] = gearOwned.splice(idx,1);
  for(const cat of GEAR_CATS) if(gearEquip[cat]===uid) gearEquip[cat]=null;
  gearSeen.delete(uid);
  saveOwned(); saveEquip(); saveSeen();
  updateInvBadge();
  return removed;
}
function sellValue(itemId){ return Math.round(itemPrice(itemId)*SELL_RATE); }
function sellGearInstance(uid){
  const itemId = gearInstanceItem(uid);
  if(!itemId) return false;
  removeGearInstance(uid);
  gold += sellValue(itemId);
  saveGold();
  if(window.markDirty) window.markDirty();
  refreshGoldUI();
  afterEquipChange();
  return true;
}
function unseenCount(){ let n=0; for(const inst of gearOwned) if(!gearSeen.has(inst.uid)) n++; return n; }
function updateInvBadge(){ const b=$('invbadge'); if(!b) return; const n=unseenCount();
  b.textContent = n>99?'99+':n; b.classList.toggle('hidden', n<=0); }

// ---- equipped bonuses (summed across the 4 slots) ----
// percent stats (speed/range) return a starting-stat multiplier; flat stats (dmg) return a raw sum.
function equippedStatBonus(stat){
  let b=0; for(const c of GEAR_CATS){ const uid=gearEquip[c], id=uid&&gearInstanceItem(uid); if(id && itemStat(id)===stat) b+=itemBonus(id); }
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
  for(const c of GEAR_CATS){ const uid=gearEquip[c], id=uid&&gearInstanceItem(uid); if(id) drawSprite('gear_'+c, x,y,size,rot,0,0,flip, RAR[itemRar(id)].color); }
}
// ---- composite the player sprite + equipped gear into a data-URL (menu + equipment screens) ----
function compositeCharURL(){
  if(typeof compositeCharCanvasURL==='function') return compositeCharCanvasURL(200);
  const base = SP['player']; if(!base) return '';
  const nom = base._nom || base.width; // use nominal (pre-padding) size so content fills the canvas
  const c = document.createElement('canvas'); c.width=nom; c.height=nom;
  const g = c.getContext('2d');
  g.drawImage(base, (nom-base.width)/2, (nom-base.height)/2);
  for(const cat of GEAR_CATS){ const uid=gearEquip[cat], id=uid&&gearInstanceItem(uid); if(!id) continue;
    const spr = (typeof tintedSprite==='function' && tintedSprite('gear_'+cat, RAR[itemRar(id)].color)) || SP['gear_'+cat];
    if(spr) g.drawImage(spr, (nom-spr.width)/2, (nom-spr.height)/2);
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

// ---- free daily coins ----
const DAILY_COINS_AMOUNT=100;
function _utcDateKey(){ const d=new Date(); return d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate(); }
function dailyCoinsClaimed(){ return localStorage.getItem('br_daily_coins_date')===_utcDateKey(); }
function claimDailyCoins(){
  if(dailyCoinsClaimed()) return false;
  gold+=DAILY_COINS_AMOUNT; saveGold(); if(window.markDirty) window.markDirty();
  localStorage.setItem('br_daily_coins_date', _utcDateKey());
  refreshGoldUI();
  return true;
}

// ============ PURCHASING ============
function buyItem(id, price){
  if(hasItemId(id) || gold<price) return false;
  gold-=price; saveGold();
  addGearInstance(id);
  if(typeof sfx!=='undefined') sfx.coin();
  refreshGoldUI(); renderShop(); renderInventory();
  return true;
}

// ============ SHOP RENDER ============
// vertical ribboned card used in the Daily Shop grid
function shopCardHTML(id, price){
  const rar=itemRar(id), owned=hasItemId(id);
  const off = Math.round((1 - price/itemPrice(id))*100);
  const ribbon = off>0 ? '<div class="sribbon'+(off>=40?' big':'')+'">-'+off+'%</div>' : '';
  const action = owned ? '<div class="scheck">✓</div>'
    : '<button class="sbuy'+(gold<price?' poor':'')+'" data-id="'+id+'" data-price="'+price+'">'+coinTag()+price+'</button>';
  return '<div class="scard r-'+rar+(owned?' owned':'')+'">'+ribbon+
    '<div class="sname">'+itemName(id)+'</div>'+
    '<div class="sicon"><img src="'+gearIconURL(id)+'" alt=""></div>'+
    '<div class="stagrow">'+rtagHTML(rar)+statTag(itemStat(id))+'<span class="sbonus">'+itemBonusShort(id)+'</span></div>'+
    action+'</div>';
}

function renderShop(){
  const grid=$('shopgrid'); if(!grid) return;
  // ---- FREE DAILY COINS ----
  const claimed=dailyCoinsClaimed();
  let html = '<div class="banner"><span>FREE DAILY COINS</span></div>';
  html += '<div class="dailycoins'+(claimed?' claimed':'')+'">'+
    '<div class="dcrow">'+coinTag()+'<span class="dcamt">+'+DAILY_COINS_AMOUNT+'</span></div>'+
    (claimed ? '<div class="dcclaimed">Claimed — resets in '+_hoursUntilMidnightUTC()+'h</div>'
             : '<button class="bigbtn green" id="dailycoinsbtn">CLAIM</button>')+
    '</div>';
  // ---- DAILY SHOP (rotating, discounted) ----
  html += '<div class="banner"><span>DAILY SHOP</span></div><div class="shopsub">Resets at midnight (UTC) · up to -25%</div>';
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
  // ---- CHARACTER SHOP ----
  html += (typeof renderShopCharSection==='function') ? renderShopCharSection() : '';
  // ---- PET RECRUIT ----
  html += (typeof renderPetRecruitSection==='function') ? renderPetRecruitSection() : '';
  grid.innerHTML = html;

  const dcb=$('dailycoinsbtn'); if(dcb) dcb.addEventListener('click',()=>{ if(claimDailyCoins()){ if(typeof sfx!=='undefined') sfx.coin(); renderShop(); } });
  grid.querySelectorAll('button.sbuy[data-id]').forEach(b=>b.addEventListener('click',()=>buyItem(b.dataset.id, +b.dataset.price)));
  grid.querySelectorAll('button[data-crate]').forEach(b=>b.addEventListener('click',()=>openCrate(b.dataset.crate)));
  grid.querySelectorAll('button[data-crinfo]').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); openCrateOdds(b.dataset.crinfo); }));
  if(typeof initRecruitUI==='function') initRecruitUI(grid);
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
  gold-=cr.price; saveGold(); refreshGoldUI();
  if(typeof sfx!=='undefined') sfx.pick();
  const won = rollCrateItem(key);
  const dup = hasItemId(won);

  const ov=$('crate'); if(!ov){ // headless / no overlay: just resolve instantly
    if(dup) gold+=sellValue(won);
    else addGearInstance(won);
    saveGold();
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
    if(typeof sfx!=='undefined'){ sfx.evolve(); }
    const res=$('crresult');
    res.className='crresult r-'+itemRar(won);
    res.innerHTML='<img src="'+gearIconURL(won)+'"><div><div class="crwname">'+itemName(won)+'</div>'+
      rtagHTML(itemRar(won))+statTag(itemStat(won))+'<div class="gbonus">'+itemBonusTxt(won)+'</div>'+
      (dup
        ? '<div class="crdup">duplicate found</div><div class="cractrow"><button class="cract keep" id="crkeep">KEEP</button><button class="cract sell" id="crsell">SELL +'+sellValue(won)+'</button></div>'
        : '<div class="crnew">NEW!</div>')+'</div>';
    res.classList.remove('hidden');
    const claim=$('crclaim');
    if(dup){
      claim.classList.add('hidden');
      $('crkeep').onclick=()=>{ addGearInstance(won); if(typeof sfx!=='undefined') sfx.pick(); closeCrate(); };
      $('crsell').onclick=()=>{ gold+=sellValue(won); saveGold(); if(window.markDirty) window.markDirty(); refreshGoldUI(); if(typeof sfx!=='undefined') sfx.coin(); closeCrate(); };
    } else {
      addGearInstance(won);
      claim.classList.remove('hidden');
    }
  }, 3800);
  return won;
}
function closeCrate(){ const ov=$('crate'); if(ov) ov.classList.add('hidden'); renderShop(); renderInventory(); }

// ============ EQUIPMENT ============
let invSort='rarity';
const SORT_LABEL = { rarity:'Rarity', stat:'Stat', slot:'Slot' };
let fuseSelectMode=false;
let fuseSelected = new Set();
const rarRank = id => RAR_ORDER.indexOf(itemRar(id));     // higher = rarer
function fuseChance(count){ return Math.min(FUSE_CAP, FUSE_BASE + FUSE_STEP*Math.max(0, count-2)); }
function nextRarity(rar){ const i=RAR_ORDER.indexOf(rar); return (i>=0 && i<RAR_ORDER.length-1) ? RAR_ORDER[i+1] : null; }
function sortedOwned(){
  const list = ownedGearList();
  const sortCmp = (a,b)=>{
    const ida=a.itemId, idb=b.itemId;
    if(invSort==='stat') return STAT_ORDER.indexOf(itemStat(ida))-STAT_ORDER.indexOf(itemStat(idb)) || rarRank(idb)-rarRank(ida) || itemBonus(idb)-itemBonus(ida);
    if(invSort==='slot') return GEAR_CATS.indexOf(itemCat(ida))-GEAR_CATS.indexOf(itemCat(idb)) || rarRank(idb)-rarRank(ida) || itemBonus(idb)-itemBonus(ida);
    return rarRank(idb)-rarRank(ida) || itemBonus(idb)-itemBonus(ida);
  };
  return list.sort(sortCmp);
}
function equipToggle(uid){ const id=gearInstanceItem(uid); if(!id) return; const cat=itemCat(id); gearEquip[cat]=(gearEquip[cat]===uid?null:uid); saveEquip(); afterEquipChange(); }
function autoEquipBest(){   // fill every slot with its rarest owned piece — one-tap loadout
  for(const cat of GEAR_CATS){
    const best = gearOwned.filter(inst=>itemCat(inst.itemId)===cat)
      .sort((a,b)=> rarRank(b.itemId)-rarRank(a.itemId) || itemBonus(b.itemId)-itemBonus(a.itemId))[0];
    if(best) gearEquip[cat]=best.uid;
  }
  saveEquip(); if(typeof sfx!=='undefined') sfx.evolve(); afterEquipChange();
}

function eqSlotHTML(cat){
  const uid=gearEquip[cat], id=uid&&gearInstanceItem(uid);
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
    const uid=gearEquip[el.dataset.cat]; if(uid) openItemPop(uid); }));

  // controls: sort chips + one-tap auto-equip
  const ctl=$('eqcontrols');
  if(ctl){
    ctl.innerHTML = '<span class="sortlbl">Sort</span>'+
      ['rarity','stat','slot'].map(s=>'<button class="chip2'+(invSort===s?' on':'')+'" data-sort="'+s+'">'+SORT_LABEL[s]+'</button>').join('')+
      '<button class="chip2 fuseaction'+(fuseSelectMode?' on':'')+'" id="fusemode"><img class="cic" src="'+icURL('ic_crate')+'">Fuse</button>'+
      '<button class="chip2 auto" id="autoeq"><img class="cic" src="'+icURL('ic_bolt')+'">Auto-Equip</button>'+
      '<button class="chip2'+(gearForceVisible?' on':'')+'" id="gearvis">Show Armor: '+(gearForceVisible?'On':'Off')+'</button>'+
      renderFuseStatus();
    ctl.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{ invSort=b.dataset.sort; if(typeof sfx!=='undefined') sfx.pick(); renderInventory(); }));
    const ae=$('autoeq'); if(ae) ae.addEventListener('click', autoEquipBest);
    const fm=$('fusemode'); if(fm) fm.addEventListener('click',()=>{ fuseSelectMode=!fuseSelectMode; if(!fuseSelectMode) fuseSelected.clear(); if(typeof sfx!=='undefined') sfx.pick(); renderInventory(); });
    const fb=$('fusebtn'); if(fb) fb.addEventListener('click', openFuseConfirm);
    const fc=$('fuseclear'); if(fc) fc.addEventListener('click',()=>{ fuseSelected.clear(); renderInventory(); });
    const gv=$('gearvis'); if(gv) gv.addEventListener('click',()=>{ setGearForceVisible(!gearForceVisible); if(typeof sfx!=='undefined') sfx.pick(); renderInventory(); if(typeof refreshMenuChar==='function') refreshMenuChar(); });
  }

  const list=sortedOwned();
  if(!list.length){ owned.innerHTML='<div class="invhint">Open a Case or buy gear in the Shop to fill your slots.</div>'; return; }
  let html='';
  for(const inst of list){ const id=inst.itemId, selected=fuseSelected.has(inst.uid), equipped=gearEquip[itemCat(id)]===inst.uid;
    html += '<div class="itile r-'+itemRar(id)+(equipped?' equipped':'')+(selected?' selected':'')+(fuseSelectMode?' fusemode':'')+'" data-uid="'+inst.uid+'" title="'+itemName(id)+'">'+
      (equipped?'<span class="ieq">✓</span>':'')+'<span class="ilv">'+STAT[itemStat(id)].short+'</span>'+
      '<img src="'+gearIconURL(id)+'"><span class="ipct">'+itemBonusShort(id)+'</span></div>';
  }
  owned.innerHTML=html;
  owned.querySelectorAll('.itile[data-uid]').forEach(el=>el.addEventListener('click',()=>{
    if(fuseSelectMode){ toggleFuseSelection(el.dataset.uid); return; }
    openItemPop(el.dataset.uid);
  }));
}

// ---- item detail popup: see full stats, equip/unequip ----
function openItemPop(uid){
  const ov=$('itempop'); if(!ov) return;
  const id=gearInstanceItem(uid); if(!id) return;
  const cat=itemCat(id), rar=itemRar(id), equipped=gearEquip[cat]===uid;
  ov.innerHTML =
    '<div class="ipcard r-'+rar+'">'+
      '<button class="ipx" id="ipclose">✕</button>'+
      '<div class="ipicon r-'+rar+'"><img src="'+gearIconURL(id)+'"></div>'+
      '<div class="ipname">'+itemName(id)+'</div>'+
      '<div class="iptags">'+rtagHTML(rar)+statTag(itemStat(id))+'</div>'+
      '<div class="ipstat">'+itemBonusTxt(id)+'</div>'+
      '<div class="ipslot">Slot · '+CAT_LABEL[cat]+'</div>'+
      '<div class="ipactions">'+
        '<button class="ipbtn'+(equipped?' un':'')+'" id="ipequip">'+(equipped?'UNEQUIP':'EQUIP')+'</button>'+
        '<button class="ipbtn sell" id="ipsell">SELL +'+sellValue(id)+'</button>'+
      '</div>'+
    '</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) closeItemPop(); };
  $('ipclose').onclick=closeItemPop;
  $('ipequip').onclick=()=>{ equipToggle(uid); closeItemPop(); };
  $('ipsell').onclick=()=>openSellConfirm(uid);
}
function closeItemPop(){ const ov=$('itempop'); if(ov) ov.classList.add('hidden'); }
function renderFuseStatus(){
  if(!fuseSelectMode) return '';
  const count=fuseSelected.size;
  if(!count) return '<span class="fusehint">Fuse mode: pick 2+ same-rarity items.</span>';
  const ids=[...fuseSelected].map(gearInstanceItem).filter(Boolean);
  const rar=ids[0] ? itemRar(ids[0]) : null;
  const invalid = !ids.length || ids.some(id=>itemRar(id)!==rar) || !nextRarity(rar);
  const chance = ids.length>=2 && !invalid ? fuseChance(ids.length) : 0;
  return '<div class="fusebar">'+
    '<span class="fusemeta">'+count+' selected'+(rar?' · '+RAR[rar].name:'')+(chance?' · '+chance+'%':'')+'</span>'+
    '<button class="chip2" id="fuseclear">Clear</button>'+
    '<button class="chip2 fusego'+((count<2||invalid)?' disabled':'')+'" id="fusebtn"'+((count<2||invalid)?' disabled':'')+'>Fuse</button>'+
  '</div>';
}
function toggleFuseSelection(uid){
  const id=gearInstanceItem(uid); if(!id) return;
  if(fuseSelected.has(uid)){ fuseSelected.delete(uid); renderInventory(); return; }
  const current=[...fuseSelected].map(gearInstanceItem).filter(Boolean);
  if(current.length){
    const rar=itemRar(current[0]);
    if(itemRar(id)!==rar){ if(typeof sfx!=='undefined') sfx.hit && sfx.hit(); return; }
  }
  fuseSelected.add(uid);
  if(typeof sfx!=='undefined') sfx.pick();
  renderInventory();
}
function openConfirmCard(title, body, yesText, onYes, tone){
  const ov=$('itempop'); if(!ov) return;
  ov.innerHTML =
    '<div class="ipcard'+(tone?' '+tone:'')+'">'+
      '<button class="ipx" id="ipclose">✕</button>'+
      '<div class="ipname">'+title+'</div>'+
      '<div class="ipcopy">'+body+'</div>'+
      '<div class="ipconfirm">'+
        '<button class="ipbtn cancel" id="ipno">NO</button>'+
        '<button class="ipbtn'+(tone==='warn'?' warn':'')+'" id="ipyes">'+yesText+'</button>'+
      '</div>'+
    '</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) closeItemPop(); };
  $('ipclose').onclick=closeItemPop;
  $('ipno').onclick=closeItemPop;
  $('ipyes').onclick=()=>{ closeItemPop(); onYes(); };
}
function openSellConfirm(uid){
  const id=gearInstanceItem(uid); if(!id) return;
  openConfirmCard('SELL ITEM', 'Sell '+itemName(id)+' for '+sellValue(id)+' coins?', 'YES', ()=>{
    sellGearInstance(uid);
  }, 'warn');
}
function fuseGearInstances(uids){
  const ids = uids.map(gearInstanceItem).filter(Boolean);
  if(ids.length<2) return null;
  const rar = itemRar(ids[0]);
  if(ids.some(id=>itemRar(id)!==rar)) return null;
  const next = nextRarity(rar);
  if(!next) return null;
  const success = Math.random()*100 < fuseChance(ids.length);
  for(const uid of uids) removeGearInstance(uid);
  const pool = catalogByRarity(success ? next : rar);
  const won = pool[Math.floor(Math.random()*pool.length)];
  const inst = addGearInstance(won);
  return { success, itemId:won, instance:inst, rarity:success?next:rar };
}
function openFuseConfirm(){
  const ids=[...fuseSelected];
  const itemIds=ids.map(gearInstanceItem).filter(Boolean);
  if(itemIds.length<2) return;
  const rar=itemRar(itemIds[0]), next=nextRarity(rar);
  if(itemIds.some(id=>itemRar(id)!==rar) || !next) return;
  openConfirmCard('FUSE ITEMS', 'Consume '+itemIds.length+' '+RAR[rar].name+' items for '+fuseChance(itemIds.length)+'% '+RAR[next].name+' chance?', 'FUSE', ()=>{
    const result = fuseGearInstances(ids);
    fuseSelected.clear();
    fuseSelectMode=false;
    renderInventory();
    if(result) openFuseResult(result);
  });
}
function openFuseResult(result){
  const ov=$('itempop'); if(!ov) return;
  const id=result.itemId, rar=itemRar(id);
  ov.innerHTML =
    '<div class="ipcard r-'+rar+'">'+
      '<button class="ipx" id="ipclose">✕</button>'+
      '<div class="ipicon r-'+rar+'"><img src="'+gearIconURL(id)+'"></div>'+
      '<div class="ipname">'+(result.success?'FUSE SUCCESS':'FUSE FAILED')+'</div>'+
      '<div class="iptags">'+rtagHTML(rar)+statTag(itemStat(id))+'</div>'+
      '<div class="ipstat">'+itemName(id)+'</div>'+
      '<div class="ipslot">'+itemBonusTxt(id)+'</div>'+
      '<button class="ipbtn" id="ipclaim">OK</button>'+
    '</div>';
  ov.classList.remove('hidden');
  $('ipclose').onclick=closeItemPop;
  $('ipclaim').onclick=closeItemPop;
}

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

function afterEquipChange(){ if(typeof sfx!=='undefined') sfx.pick(); refreshMenuChar(); renderInventory(); renderPetSection(); renderPetsTab(); }

// ---- Character tab ----
function renderCharacterTab() {
  const list=$('charlist'); if(!list) return;
  if(typeof CHARACTERS==='undefined') return;
  const rarRank={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,world:-1};
  // Sort into 4 groups
  // gating (progression-locked) is decided by which threshold field is set, not by the cosmetic rarity tag —
  // lets a character carry a real rarity (e.g. Fortunato is 'epic') while still being a world/challenger unlock
  const owned=[], worldLocked=[], chalLocked=[], shopLocked=[];
  for(const char of CHARACTERS){
    const isWorld=char.worldUnlock!=null;
    const isChal=char.chalWorldUnlock!=null;
    const unlocked=typeof charIsUnlocked==='function'?charIsUnlocked(char.id):(isWorld||isChal?false:isCharOwned(char.id));
    if(unlocked) owned.push(char);
    else if(isWorld) worldLocked.push(char);
    else if(isChal) chalLocked.push(char);
    else shopLocked.push(char);
  }
  owned.sort((a,b)=>{
    const aw=a.worldUnlock!=null||a.chalWorldUnlock!=null, bw=b.worldUnlock!=null||b.chalWorldUnlock!=null;
    if(aw&&bw) return ((a.worldUnlock??a.chalWorldUnlock??0))-(b.worldUnlock??b.chalWorldUnlock??0);
    if(aw) return -1; if(bw) return 1;
    return (rarRank[b.rarity]||0)-(rarRank[a.rarity]||0);
  });
  worldLocked.sort((a,b)=>(a.worldUnlock??0)-(b.worldUnlock??0));
  chalLocked.sort((a,b)=>(a.chalWorldUnlock??0)-(b.chalWorldUnlock??0));
  shopLocked.sort((a,b)=>(rarRank[b.rarity]||0)-(rarRank[a.rarity]||0));

  function buildCard(char, locked){
    const isWorld=char.worldUnlock!=null;
    const isChal=char.chalWorldUnlock!=null;
    // 'world'/'challenger' are placeholder rarity tags (no real tier) and get a forced badge color;
    // a gated character with a real rarity (e.g. Fortunato: epic) keeps its own color/tag.
    const placeholderRar=char.rarity==='world'?'uncommon':char.rarity==='challenger'?'rare':char.rarity;
    const rarClass='r-'+placeholderRar;
    const selected=(typeof activeCharId!=='undefined')&&activeCharId===char.id;
    const thumbId='charport_'+char.id;
    const portHtml='<div class="charport"><canvas id="'+thumbId+'" width="80" height="80"></canvas></div>';
    let selBtn='';
    if(locked&&isWorld){
      selBtn='<button class="charselbtn locked" disabled>World '+char.worldUnlock+' unlock</button>';
    } else if(locked&&isChal){
      selBtn='<button class="charselbtn locked" disabled>Challenger World '+char.chalWorldUnlock+' unlock</button>';
    } else if(locked){
      selBtn='<button class="charselbtn locked" disabled>Get in Shop</button>';
    } else if(selected){
      selBtn='<button class="charselbtn active" data-selchar="'+char.id+'">SELECTED</button>';
    } else {
      selBtn='<button class="charselbtn" data-selchar="'+char.id+'">SELECT</button>';
    }
    const lockBadge=locked&&isWorld?'<span class="charlockbadge">Beat World '+char.worldUnlock+'</span>'
      :locked&&isChal?'<span class="charlockbadge">Beat Challenger World '+char.chalWorldUnlock+'</span>':'';
    let html='<div class="charcard '+rarClass+(selected?' selected':'')+(locked?' locked':'')+'" id="charcard_'+char.id+'">';
    html+=portHtml;
    html+='<div class="charinfo"><div class="charname">'+char.name+'</div>';
    html+='<div class="chardesc">'+char.desc+'</div>';
    html+='<div class="chartags">'+rtagHTML(placeholderRar)+lockBadge+'</div>';
    html+='</div>';
    html+=selBtn+'</div>';
    return html;
  }

  let html='';
  if(owned.length){
    html+='<div class="banner"><span>MY CHARACTERS</span></div>';
    for(const c of owned) html+=buildCard(c,false);
  }
  if(worldLocked.length){
    html+='<div class="banner"><span>WORLD UNLOCKS</span></div>';
    for(const c of worldLocked) html+=buildCard(c,true);
  }
  if(chalLocked.length){
    html+='<div class="banner"><span>CHALLENGER</span></div>';
    for(const c of chalLocked) html+=buildCard(c,true);
  }
  if(shopLocked.length){
    html+='<div class="banner"><span>GET IN SHOP</span></div>';
    for(const c of shopLocked) html+=buildCard(c,true);
  }
  list.innerHTML=html;
  // Render thumbnails
  const allChars=[...owned,...worldLocked,...chalLocked,...shopLocked];
  for(const char of allChars){
    const canvas=document.getElementById('charport_'+char.id);
    if(!canvas) continue;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,80,80);
    if(typeof renderCharThumb==='function') renderCharThumb(ctx, char.id, 80);
  }
  // Select handlers
  list.querySelectorAll('[data-selchar]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(typeof setActiveChar==='function') setActiveChar(btn.dataset.selchar);
      if(typeof sfx!=='undefined') sfx.pick();
      renderCharacterTab();
      renderInventory();
    });
  });
}

// ---- Pet section in Equipment tab ----
function renderPetSection() {
  const sec=$('petSection'); if(!sec) return;
  const ownedPets=typeof PETS!=='undefined'?PETS.filter(p=>isPetOwned(p.id)):[];
  const curPet=(typeof activePetId!=='undefined')&&activePetId?PETS.find(p=>p.id===activePetId):null;
  let html='';
  if(typeof PETS==='undefined'){ sec.innerHTML=''; return; }
  html+='<div class="petslotrow">';
  html+='<div class="petslotlbl">ACTIVE PET</div>';
  html+='<div class="petslot'+(curPet?' has-pet':'')+'" id="activePetSlot">';
  if(curPet){
    html+='<canvas width="56" height="56" id="activePetCanvas"></canvas>';
    html+='<div class="petslot-lbl">'+curPet.name+'</div>';
  } else {
    html+='<div class="petslot-lbl">None</div>';
  }
  html+='</div>';
  html+='</div>';
  if(ownedPets.length){
    html+='<div class="petgrid">';
    for(const pet of PETS){
      if(!isPetOwned(pet.id)) continue;
      const eq=curPet&&curPet.id===pet.id;
      html+='<div class="pettile r-'+pet.rarity+(eq?' equipped':'')+'" data-petid="'+pet.id+'" title="'+pet.desc+'">';
      if(eq) html+='<span class="petteq">✓</span>';
      html+='<canvas width="44" height="44" class="pettile-cnv"></canvas>';
      html+='<div class="pettile-name">'+pet.name+'</div>';
      html+='</div>';
    }
    html+='</div>';
  }
  sec.innerHTML=html;
  // Render active pet canvas
  if(curPet){
    const c=document.getElementById('activePetCanvas');
    if(c&&curPet.draw){
      const g=c.getContext('2d');
      g.save(); g.translate(28,28); curPet.draw(g,56,0); g.restore();
    }
  }
  // Render pet tile canvases
  sec.querySelectorAll('.pettile[data-petid]').forEach(tile=>{
    const pet=PETS.find(p=>p.id===tile.dataset.petid);
    const canvas=tile.querySelector('.pettile-cnv');
    if(canvas&&pet&&pet.draw){
      const g=canvas.getContext('2d');
      g.save(); g.translate(22,22); pet.draw(g,44,0); g.restore();
    }
    tile.addEventListener('click',()=>{
      const cur=(typeof activePetId!=='undefined')?activePetId:null;
      if(typeof setActivePet==='function') setActivePet(cur===pet.id?null:pet.id);
      if(typeof sfx!=='undefined') sfx.pick();
      renderPetSection();
    });
  });
}

// ---- Pets tab ----
function renderPetsTab(){
  const wrap=$('petsTabContent'); if(!wrap) return;
  if(typeof PETS==='undefined'){ wrap.innerHTML=''; return; }
  const curId=typeof activePetId!=='undefined'?activePetId:null;
  const curPet=curId?PETS.find(p=>p.id===curId):null;
  const ownedPets=PETS.filter(p=>isPetOwned(p.id));
  let html='';

  // ---- active pet hero ----
  html+='<div class="banner"><span>ACTIVE PET</span></div>';
  if(curPet){
    html+='<div class="pethero r-'+curPet.rarity+'">';
    html+='<div class="pethero-port"><canvas id="petHeroCnv" width="110" height="110"></canvas></div>';
    html+='<div class="pethero-info">';
    html+='<div class="pethero-name">'+curPet.name+'</div>';
    html+='<div class="pethero-tags">'+rtagHTML(curPet.rarity)+'</div>';
    html+='<div class="pethero-desc">'+curPet.desc+'</div>';
    html+='<button class="ipbtn un pethero-unequip" id="petUnequipBtn">UNEQUIP</button>';
    html+='</div></div>';
  } else {
    html+='<div class="petno-active"><div class="petno-icon">🐾</div><div>No pet active.</div><div class="petno-hint">Select one from your collection below.</div></div>';
  }

  // ---- owned pets grid ----
  html+='<div class="banner" style="margin-top:4px"><span>MY PETS</span></div>';
  if(ownedPets.length){
    html+='<div class="petgrid petgrid-tab">';
    for(const pet of PETS){
      if(!isPetOwned(pet.id)) continue;
      const eq=curId===pet.id;
      html+='<div class="pettile r-'+pet.rarity+(eq?' equipped':'')+'" data-petpop="'+pet.id+'">';
      if(eq) html+='<span class="petteq">✓</span>';
      html+='<canvas width="52" height="52" class="pettile-cnv"></canvas>';
      html+='<div class="pettile-name">'+pet.name+'</div>';
      html+='</div>';
    }
    html+='</div>';
  } else {
    html+='<div class="invhint">No pets yet — recruit them in the Shop!</div>';
  }

  wrap.innerHTML=html;

  // draw hero canvas
  if(curPet&&curPet.draw){
    const hc=document.getElementById('petHeroCnv');
    if(hc){ const g=hc.getContext('2d'); g.save(); g.translate(55,55); curPet.draw(g,110,0); g.restore(); }
  }
  // draw grid canvases + wire click → popup
  wrap.querySelectorAll('.pettile[data-petpop]').forEach(tile=>{
    const pet=PETS.find(p=>p.id===tile.dataset.petpop);
    const cnv=tile.querySelector('.pettile-cnv');
    if(cnv&&pet&&pet.draw){ const g=cnv.getContext('2d'); g.save(); g.translate(26,26); pet.draw(g,52,0); g.restore(); }
    tile.addEventListener('click',()=>{ if(typeof sfx!=='undefined') sfx.pick(); openPetPop(pet.id); });
  });
  // unequip button
  const ub=$('petUnequipBtn');
  if(ub) ub.addEventListener('click',()=>{ setActivePet(null); if(typeof sfx!=='undefined') sfx.pick(); });
}

function openPetPop(petId){
  const ov=$('itempop'); if(!ov) return;
  const pet=PETS.find(p=>p.id===petId); if(!pet) return;
  const eq=(typeof activePetId!=='undefined')&&activePetId===petId;
  ov.innerHTML=
    '<div class="ipcard r-'+pet.rarity+'">'+
    '<button class="ipx" id="ppopx">✕</button>'+
    '<div class="ipicon r-'+pet.rarity+'" id="ppopport"><canvas width="90" height="90" style="width:78%;height:78%"></canvas></div>'+
    '<div class="ipname">'+pet.name+'</div>'+
    '<div class="iptags">'+rtagHTML(pet.rarity)+'</div>'+
    '<div class="ipstat" style="font-size:clamp(12px,2.2vmin,17px);color:#b8c8e0;font-weight:700;text-align:center;line-height:1.4">'+pet.desc+'</div>'+
    '<button class="ipbtn'+(eq?' un':'')+'" id="ppopequip">'+(eq?'UNEQUIP':'EQUIP')+'</button>'+
    '</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) closeItemPop(); };
  $('ppopx').onclick=closeItemPop;
  const cnv=ov.querySelector('#ppopport canvas');
  if(cnv&&pet.draw){ const g=cnv.getContext('2d'); g.save(); g.translate(45,45); pet.draw(g,90,0); g.restore(); }
  $('ppopequip').onclick=()=>{ setActivePet(eq?null:petId); if(typeof sfx!=='undefined') sfx.evolve(); closeItemPop(); };
}

// ---- tab switching ----
function showTab(name){
  for(const t of ['battle','shop','inventory','character','pets']){ const p=$('tab-'+t); if(p) p.classList.toggle('hidden', t!==name); }
  document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  const menu=$('menu'); if(menu) menu.setAttribute('data-tab', name);   // per-tab background tint
  if(name==='shop') renderShop();
  if(name==='pets') renderPetsTab();
  if(name==='inventory'){ gearSeen=new Set(gearOwned.map(x=>x.uid)); saveSeen(); updateInvBadge(); renderInventory(); renderPetSection(); }   // mark all seen -> clear badge
  if(name==='character') renderCharacterTab();
}
document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.addEventListener('click',()=>{ showTab(b.dataset.tab); if(typeof sfx!=='undefined') sfx.pick(); }));
const _crclaim=$('crclaim'); if(_crclaim) _crclaim.addEventListener('click', closeCrate);

// ---- init ----
refreshMenuChar();
renderShop();
renderInventory();
saveSeen(); updateInvBadge();   // persist the first-run seed + show any pending "new items" badge
const _initTab = (location.hash||'').slice(1);
showTab(['battle','shop','inventory','character','pets'].indexOf(_initTab)>=0 ? _initTab : 'battle');

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
