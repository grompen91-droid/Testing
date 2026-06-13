'use strict';
// ============ GEAR: SHOP + INVENTORY + CASES ============
// Loaded after game.js so it shares the globals `gold`, `P`, sprite helpers, sfx, $.
// Items boost STARTING stats — damage / move speed / attack range. 4 typed slots: the equipped
// piece's SLOT picks the on-character silhouette + rarity tint, its STAT picks the bonus.
// Catalog = 3 stats × 5 rarities × 7 named variants = 105 items (21 per rarity).

const GEAR_CATS = ['helmet','chest','pants','shoes'];
const CAT_LABEL = { helmet:'Helmet', chest:'Chestplate', pants:'Pants', shoes:'Shoes' };
const CAT_NOUN  = { helmet:'Helm', chest:'Plate', pants:'Greaves', shoes:'Boots' };

// rarity: border color + base price (prices cut to ~1/3 of the old shop)
const RAR = {
  common:    { name:'COMMON',    color:'#9aa3af', price:25   },
  uncommon:  { name:'UNCOMMON',  color:'#5fbf52', price:80   },
  rare:      { name:'RARE',      color:'#4aa3df', price:230  },
  epic:      { name:'EPIC',      color:'#b06ff0', price:600  },
  legendary: { name:'LEGENDARY', color:'#e0a92e', price:1200 },
};
const RAR_ORDER = ['common','uncommon','rare','epic','legendary'];

// stat lines: the fraction each rarity adds to that starting stat
const STAT = {
  dmg:   { label:'damage',       short:'DMG', icon:'coin',  vals:{common:0.06,uncommon:0.12,rare:0.20,epic:0.32,legendary:0.50} },
  speed: { label:'move speed',   short:'SPD', icon:'heart', vals:{common:0.03,uncommon:0.05,rare:0.08,epic:0.12,legendary:0.18} },
  range: { label:'attack range', short:'RNG', icon:'gem',   vals:{common:0.05,uncommon:0.09,rare:0.14,epic:0.20,legendary:0.30} },
};
const STAT_ORDER = ['dmg','speed','range'];
// 7 flavour adjectives per stat -> 7 variants per (stat,rarity)
const ITEM_ADJ = {
  dmg:   ['Brawler','Berserker','Warlord','Crusher','Onslaught','Ravager','Titan'],
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
function itemBonusTxt(id){ return '+'+Math.round(itemBonus(id)*100)+'% '+STAT[itemStat(id)].label; }

const GEAR_CATALOG = [];
for(const s of STAT_ORDER) for(const r of RAR_ORDER) for(let i=0;i<7;i++) GEAR_CATALOG.push(s+'_'+r+'_'+i);
function catalogByRarity(r){ return GEAR_CATALOG.filter(id=>itemRar(id)===r); }

// crates: weighted random pulls. cheaper crate = mostly low rarity, pricier = better odds.
const CRATES = {
  wood:   { name:'Wooden Crate', price:30,  glow:'#9aa3af', odds:{common:60,uncommon:30,rare:8, epic:2, legendary:0} },
  silver: { name:'Silver Crate', price:120, glow:'#bcd0e0', odds:{common:18,uncommon:40,rare:28,epic:11,legendary:3} },
  gold:   { name:'Gold Crate',   price:400, glow:'#e0a92e', odds:{common:0, uncommon:16,rare:40,epic:32,legendary:12} },
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
function saveOwned(){ localStorage.setItem('br_items_owned', JSON.stringify([...gearOwned])); }
function saveEquip(){ localStorage.setItem('br_gear_equipped', JSON.stringify(gearEquip)); }

// ---- equipped starting-stat multipliers (summed bonuses across the 4 slots) ----
function equippedStatMult(stat){
  let b=0; for(const c of GEAR_CATS){ const id=gearEquip[c]; if(id && itemStat(id)===stat) b+=itemBonus(id); }
  return 1 + b;
}
function equippedDmgMult(){   return equippedStatMult('dmg');   }   // consumed by game.js startGame()
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
// ---- recomposite the menu character image with equipped gear ----
function refreshMenuChar(){
  const base = SP['player']; if(!base) return;
  const c = document.createElement('canvas'); c.width=base.width; c.height=base.height;
  const g = c.getContext('2d'); g.drawImage(base,0,0);
  for(const cat of GEAR_CATS){ const id=gearEquip[cat]; if(!id) continue;
    const spr = (typeof tintedSprite==='function' && tintedSprite('gear_'+cat, RAR[itemRar(id)].color)) || SP['gear_'+cat];
    if(spr) g.drawImage(spr,0,0);
  }
  const img=$('charimg'); if(img) img.src=c.toDataURL();
}

// ---- gold display + coin chip ----
function refreshGoldUI(){ const t=$('goldtxt'); if(t) t.textContent=gold; }
let _coinURL='';
function coinTag(){ if(!_coinURL && SP['coin']) _coinURL=SP['coin'].toDataURL(); return '<img class="coinico" src="'+_coinURL+'" alt="">'; }
function rtagHTML(rar){ return '<span class="rtag r-'+rar+'">'+RAR[rar].name+'</span>'; }
function statTag(stat){ return '<span class="stag s-'+stat+'">'+STAT[stat].short+'</span>'; }

// ============ PURCHASING ============
function ownItem(id){ gearOwned.add(id); saveOwned(); }
function buyItem(id, price){
  if(gearOwned.has(id) || gold<price) return false;
  gold-=price; localStorage.setItem('br_gold',gold);
  ownItem(id);
  if(typeof sfx!=='undefined') sfx.coin();
  refreshGoldUI(); renderShop(); renderInventory();
  return true;
}

// ============ SHOP RENDER ============
let shopFilter='all';   // browse filter: all | dmg | speed | range
function itemCardHTML(id, priceOverride){
  const rar=itemRar(id), owned=gearOwned.has(id);
  const price = priceOverride!=null ? priceOverride : itemPrice(id);
  const buy = owned ? '<div class="gbuy ownedtag">OWNED</div>'
                    : '<button class="gbuy'+(gold<price?' poor':'')+'" data-id="'+id+'" data-price="'+price+'">'+coinTag()+price+'</button>';
  return '<div class="gcard r-'+rar+(owned?' owned':'')+'">'+
    '<img class="gicon" src="'+gearIconURL(id)+'" alt="">'+
    '<div class="gmeta"><div class="gname">'+itemName(id)+'</div>'+
      rtagHTML(rar)+statTag(itemStat(id))+
      '<div class="gbonus">'+itemBonusTxt(id)+' · '+CAT_LABEL[itemCat(id)]+'</div></div>'+
    buy+'</div>';
}

function renderShop(){
  const grid=$('shopgrid'); if(!grid) return;
  // ---- CASES ----
  let html = '<div class="shopsec"><h3 class="secttl">📦 CASES</h3><div class="crates">';
  for(const key of CRATE_ORDER){ const cr=CRATES[key]; const poor=gold<cr.price;
    html += '<div class="crate c-'+key+'" style="--glow:'+cr.glow+'">'+
      '<div class="cratebox">📦</div><div class="cratename">'+cr.name+'</div>'+
      '<button class="gbuy cratebuy'+(poor?' poor':'')+'" data-crate="'+key+'">'+coinTag()+cr.price+'</button></div>';
  }
  html += '</div></div>';
  // ---- FEATURED (rotating daily) ----
  html += '<div class="shopsec"><h3 class="secttl">⭐ FEATURED · resets daily (UTC) <span class="offtag">-25%</span></h3><div class="glist" id="featlist">';
  for(const id of dailyShop(6)) html += itemCardHTML(id, featuredPrice(id));
  html += '</div></div>';
  // ---- BROWSE all (filterable) ----
  html += '<div class="shopsec"><h3 class="secttl">🛒 ALL GEAR</h3><div class="filterbar">'+
    ['all','dmg','speed','range'].map(f=>'<button class="chip'+(shopFilter===f?' on':'')+'" data-filter="'+f+'">'+(f==='all'?'ALL':STAT[f].short)+'</button>').join('')+
    '</div><div class="glist" id="browselist">';
  const list = GEAR_CATALOG.filter(id=> shopFilter==='all' || itemStat(id)===shopFilter)
                           .sort((a,b)=> RAR_ORDER.indexOf(itemRar(a))-RAR_ORDER.indexOf(itemRar(b)));
  for(const id of list) html += itemCardHTML(id);
  html += '</div></div>';
  grid.innerHTML = html;

  grid.querySelectorAll('button.gbuy[data-id]').forEach(b=>b.addEventListener('click',()=>buyItem(b.dataset.id, +b.dataset.price)));
  grid.querySelectorAll('button[data-crate]').forEach(b=>b.addEventListener('click',()=>openCrate(b.dataset.crate)));
  grid.querySelectorAll('button[data-filter]').forEach(b=>b.addEventListener('click',()=>{ shopFilter=b.dataset.filter; if(typeof sfx!=='undefined') sfx.pick(); renderShop(); }));
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
  if(dup){ const refund=Math.round(itemPrice(won)*0.4); gold+=refund; localStorage.setItem('br_gold',gold); }
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

// ============ INVENTORY ============
function renderInventory(){
  const slots=$('invslots'); const owned=$('invowned'); if(!slots||!owned) return;
  slots.innerHTML='';
  for(const cat of GEAR_CATS){
    const id=gearEquip[cat];
    const slot=document.createElement('div');
    slot.className='slot'+(id?(' filled r-'+itemRar(id)):'');
    slot.innerHTML='<div class="slotlabel">'+CAT_LABEL[cat]+'</div>'+
      (id ? '<img class="gicon" src="'+gearIconURL(id)+'" alt=""><div class="sname">'+itemName(id)+'</div><div class="sbonus">'+statTag(itemStat(id))+'</div>'
          : '<div class="empty">—</div>');
    if(id) slot.addEventListener('click',()=>{ gearEquip[cat]=null; saveEquip(); afterEquipChange(); });
    slots.appendChild(slot);
  }
  owned.innerHTML='';
  const list=GEAR_CATALOG.filter(id=>gearOwned.has(id))
                         .sort((a,b)=> RAR_ORDER.indexOf(itemRar(b))-RAR_ORDER.indexOf(itemRar(a)));
  if(!list.length){ owned.innerHTML='<div class="invhint">Open a Case or buy gear in the Shop to fill your slots.</div>'; return; }
  for(const id of list){
    const cat=itemCat(id), rar=itemRar(id), equipped=gearEquip[cat]===id;
    const card=document.createElement('div');
    card.className='gcard r-'+rar+(equipped?' equipped':'');
    card.innerHTML='<img class="gicon" src="'+gearIconURL(id)+'" alt="">'+
      '<div class="gmeta"><div class="gname">'+itemName(id)+'</div>'+rtagHTML(rar)+statTag(itemStat(id))+
        '<div class="gbonus">'+itemBonusTxt(id)+' · '+CAT_LABEL[cat]+'</div></div>'+
      '<div class="gbuy '+(equipped?'equiptag':'equipbtn')+'">'+(equipped?'EQUIPPED':'Equip')+'</div>';
    card.addEventListener('click',()=>{ gearEquip[cat]=(equipped?null:id); saveEquip(); afterEquipChange(); });
    owned.appendChild(card);
  }
}
function afterEquipChange(){ if(typeof sfx!=='undefined') sfx.pick(); refreshMenuChar(); renderInventory(); }

// ---- tab switching ----
function showTab(name){
  for(const t of ['battle','shop','inventory']){ const p=$('tab-'+t); if(p) p.classList.toggle('hidden', t!==name); }
  document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  if(name==='shop') renderShop();
  if(name==='inventory') renderInventory();
}
document.querySelectorAll('#tabbar .tabbtn').forEach(b=>b.addEventListener('click',()=>{ showTab(b.dataset.tab); if(typeof sfx!=='undefined') sfx.pick(); }));
const _crclaim=$('crclaim'); if(_crclaim) _crclaim.addEventListener('click', closeCrate);

// ---- init ----
refreshMenuChar();
renderShop();
renderInventory();
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
