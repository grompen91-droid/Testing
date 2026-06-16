'use strict';
// ============ RECRUIT: Gems, Character Shop, Pet Gacha ============
// Loads after pets.js. Uses mulberry32/hashStr from shop.js (available as globals at runtime).

// ---- Gem currency ----
function _gemHash(v) {
  let h=0x811c9dc5;
  const s=String(v)+'brgems';
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*0x1000193)>>>0; }
  return h.toString(36);
}
let gemBalance = (()=>{
  const raw=+(localStorage.getItem('br_gems')||0);
  const sig=localStorage.getItem('br_gems_sig');
  const valid=sig===null?true:sig===_gemHash(Math.floor(raw));
  const safe=valid?Math.max(0,Math.floor(raw)):0;
  if(sig===null) localStorage.setItem('br_gems_sig',_gemHash(safe));
  return safe;
})();
function saveGems() { localStorage.setItem('br_gems',gemBalance); localStorage.setItem('br_gems_sig',_gemHash(gemBalance)); }
function addGems(n) { gemBalance+=Math.floor(n); saveGems(); refreshGemsUI(); }
function spendGems(n) { if(gemBalance<n) return false; gemBalance-=n; saveGems(); refreshGemsUI(); return true; }
function refreshGemsUI() { const t=document.getElementById('gemtxt'); if(t) t.textContent=gemBalance; }

// ---- Gem icon (cached data-URL) ----
let _gemIconURL='';
function gemIconURL() {
  if(_gemIconURL) return _gemIconURL;
  const c=document.createElement('canvas'); c.width=32; c.height=32;
  const g=c.getContext('2d');
  // Purple hexagonal gem
  g.beginPath();
  const cx=16, cy=16, or=13, ir=7;
  const pts=6;
  for(let i=0;i<pts;i++){
    const a=i*Math.PI/3-Math.PI/6;
    i===0?g.moveTo(cx+Math.cos(a)*or,cy+Math.sin(a)*or):g.lineTo(cx+Math.cos(a)*or,cy+Math.sin(a)*or);
  }
  g.closePath();
  g.fillStyle='#b06ff0';
  g.fill();
  g.strokeStyle='#7a3ab8';
  g.lineWidth=2;
  g.stroke();
  // White highlight triangle (top facet)
  g.beginPath();
  g.moveTo(cx, cy-or+2);
  g.lineTo(cx-5, cy-2);
  g.lineTo(cx+5, cy-2);
  g.closePath();
  g.fillStyle='rgba(255,255,255,0.55)';
  g.fill();
  _gemIconURL=c.toDataURL();
  return _gemIconURL;
}

// ---- Seeded RNG seeds ----
function dailyCharSeed() {
  const d=new Date();
  return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();
}
function weeklyCharSeed() {
  const d=new Date();
  const jan4=new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const startOfWeek1=jan4.getTime()-((jan4.getUTCDay()||7)-1)*86400000;
  const weekNum=Math.floor((d.getTime()-startOfWeek1)/604800000)+1;
  return d.getUTCFullYear()*100+weekNum;
}

// ---- Timer helpers ----
function _hoursUntilMidnightUTC() {
  const now=new Date();
  const ms=(86400000-((now.getUTCHours()*3600+now.getUTCMinutes()*60+now.getUTCSeconds())*1000+now.getUTCMilliseconds()));
  return Math.ceil(ms/3600000);
}
function _daysUntilMonday() {
  const d=new Date().getUTCDay(); // 0=Sun
  const days=d===0?1:(8-d)%7||7;
  return days;
}
function _weeklyResetStr() {
  const now=new Date();
  const d=now.getUTCDay();
  const daysToMon=d===0?1:(8-d)%7||7;
  const msInDay=now.getUTCHours()*3600000+now.getUTCMinutes()*60000+now.getUTCSeconds()*1000;
  const msLeft=daysToMon*86400000-msInDay;
  const totalH=Math.max(1,Math.ceil(msLeft/3600000));
  const days=Math.floor(totalH/24); const hrs=totalH%24;
  return days>0 ? days+'d '+hrs+'h' : hrs+'h';
}

// ---- Character Shop data ----
function getCharDailyShop() {
  const seed=dailyCharSeed();
  const pool=CHARACTERS.filter(c=>c.rarity!=='world'&&c.rarity!=='legendary');
  // Use mulberry32/hashStr from shop.js (loaded after recruit.js at runtime)
  const rng=mulberry32(hashStr(String(seed)));
  const shuffled=pool.slice();
  for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  return shuffled.slice(0,3);
}
function getCharWeeklyShop() {
  const seed=weeklyCharSeed();
  const pool=CHARACTERS.filter(c=>c.rarity==='legendary');
  if(!pool.length) return null;
  const rng=mulberry32(hashStr(String(seed)+'w'));
  const shuffled=pool.slice();
  for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  return shuffled[0];
}
const CHAR_SHOP_PRICE={ rare:50, epic:100, legendary:150, common:20 };
let charShopDailyIdx=0;
function buyCharacter(id) {
  const char=CHARACTERS.find(c=>c.id===id); if(!char) return;
  const price=CHAR_SHOP_PRICE[char.rarity]||50;
  if(isCharOwned(id)){ alert('Already owned'); return; }
  if(!spendGems(price)){ alert('Not enough gems!'); return; }
  grantChar(id);
  if(typeof renderShop==='function') renderShop();
  if(typeof sfx!=='undefined') sfx.evolve();
}

// ---- Pet Recruit / Pity ----
const PET_WEIGHTS={ common:55, rare:35, epic:9, legendary:1 };
const PET_PITY_EPIC=10, PET_PITY_LEG=50;
const PET_PULL_COST=5;
function weightedRarityRoll(weights) {
  let total=0; for(const k in weights) total+=weights[k];
  let r=Math.random()*total;
  for(const k of ['common','rare','epic','legendary']){ r-=(weights[k]||0); if(r<=0) return k; }
  return 'common';
}
function recruitPet() {
  if(!spendGems(PET_PULL_COST)) return null;
  let pity=+(localStorage.getItem('br_pet_pity')||0)+1;
  let rarity=weightedRarityRoll(PET_WEIGHTS);
  if(pity>=PET_PITY_LEG){ rarity='legendary'; pity=0; }
  else if(pity>=PET_PITY_EPIC&&rarity==='common'){ rarity='rare'; }
  localStorage.setItem('br_pet_pity',pity);
  const pool=PETS.filter(p=>p.rarity===rarity&&!isPetOwned(p.id));
  if(!pool.length){
    const anyPool=PETS.filter(p=>p.rarity===rarity);
    const picked=anyPool[Math.floor(Math.random()*anyPool.length)];
    addGems(3);
    return { pet:picked, duplicate:true };
  }
  const picked=pool[Math.floor(Math.random()*pool.length)];
  grantPet(picked.id);
  if(typeof sfx!=='undefined') sfx.evolve();
  return { pet:picked, duplicate:false };
}

// ---- Shop section renderers ----

function _renderCharThumbDataURL(charId, size) {
  size=size||72;
  const c=document.createElement('canvas'); c.width=size; c.height=size;
  const g=c.getContext('2d');
  if(typeof renderCharThumb==='function') renderCharThumb(g, charId, size);
  return c.toDataURL();
}
function _renderPetThumbDataURL(petId, size) {
  size=size||64;
  return petThumbURL(petId, size);
}

function renderShopCharSection() {
  const weekly=getCharWeeklyShop();
  const daily=getCharDailyShop();
  const gem='<span class="gemico-sm">◆</span>';
  const daysLeft=_daysUntilMonday();
  const hoursLeft=_hoursUntilMidnightUTC();
  let html='<div class="shopsec">';
  html+='<div class="banner"><span>CHARACTER SHOP</span></div>';

  // ---- WEEKLY LEGENDARY (tall vertical card) ----
  if(weekly){
    const owned=isCharOwned(weekly.id);
    const price=CHAR_SHOP_PRICE[weekly.rarity]||150;
    const poor=gemBalance<price;
    const resetStr=_weeklyResetStr();
    html+='<div class="scard weeklycard weeklycard-v">';
    html+='<div class="weekly-header"><span class="weeklybadge">WEEKLY LEGENDARY</span><span class="shoptimer weekly-timer">⏱ '+resetStr+'</span></div>';
    html+='<div class="charport-lg weekly-port" data-petcanvas="'+weekly.id+'"><canvas width="120" height="120" id="weeklyCanvas"></canvas></div>';
    html+='<div class="weekly-name">'+weekly.name+'</div>';
    html+='<div class="weekly-desc">'+weekly.desc+'</div>';
    html+='<div class="cstags cstags-center"><span class="rtag r-legendary">LEGENDARY</span></div>';
    if(owned) html+='<div class="scheck">✓ OWNED</div>';
    else html+='<button class="sbuy charshop-buy'+(poor?' poor':'')+'" data-buychar="'+weekly.id+'" data-price="'+price+'">'+gem+price+'</button>';
    html+='</div>';
  }

  // ---- DAILY CAROUSEL ----
  html+='<div class="shopsub">Daily · Resets in '+hoursLeft+'h</div>';
  if(daily.length){
    if(charShopDailyIdx>=daily.length) charShopDailyIdx=0;
    const card=daily[charShopDailyIdx];
    const owned=isCharOwned(card.id);
    const price=CHAR_SHOP_PRICE[card.rarity]||50;
    const poor=gemBalance<price;
    const rarLabel=(typeof RAR!=='undefined'&&RAR[card.rarity])?RAR[card.rarity].name:card.rarity.toUpperCase();
    html+='<div class="charcarousel">';
    html+='<button class="charav" id="charcaroprev" aria-label="Previous">&#9664;</button>';
    html+='<div id="charcarowrap">';
    html+='<div class="charcarousel-card scard r-'+card.rarity+'">';
    html+='<div class="charport-lg"><canvas width="100" height="100" id="charcarocanvas"></canvas></div>';
    html+='<div class="csname-lg">'+card.name+'</div>';
    html+='<div class="csdesc-full">'+card.desc+'</div>';
    html+='<div class="cstags cstags-center"><span class="rtag r-'+card.rarity+'">'+rarLabel+'</span></div>';
    if(owned) html+='<div class="scheck">✓</div>';
    else html+='<button class="sbuy charshop-buy'+(poor?' poor':'')+'" data-buychar="'+card.id+'" data-price="'+price+'">'+gem+price+'</button>';
    html+='</div>';
    html+='</div>'; // charcarowrap
    html+='<button class="charav" id="charcaronext" aria-label="Next">&#9654;</button>';
    html+='</div>'; // charcarousel
    html+='<div class="carcounter">'+(charShopDailyIdx+1)+' / '+daily.length+'</div>';
  }

  html+='</div>'; // shopsec
  return html;
}

function renderPetRecruitSection() {
  const pity=+(localStorage.getItem('br_pet_pity')||0);
  const poor=gemBalance<PET_PULL_COST;
  const gem='<span class="gemico-sm">◆</span>';
  const ownedPets=PETS.filter(p=>isPetOwned(p.id));

  let html='<div class="shopsec">';
  html+='<div class="banner"><span>PET RECRUIT</span></div>';
  html+='<div class="pullzone">';
  html+='<button class="pullbtn'+(poor?' poor':'')+'" id="petpullbtn">'+gem+PET_PULL_COST+' — RECRUIT PET</button>';
  html+='<div class="pitytxt">Pity: '+pity+' / '+PET_PITY_LEG+' (guaranteed legendary) · '+Math.max(0,PET_PITY_EPIC-pity)+' for guaranteed rare</div>';
  html+='</div>';
  if(ownedPets.length){
    html+='<div class="banner" style="margin-top:8px"><span>MY PETS</span></div>';
    html+='<div class="petownedgrid">';
    for(const pet of PETS){
      if(!isPetOwned(pet.id)) continue;
      const eq=(typeof activePetId!=='undefined')&&activePetId===pet.id;
      html+='<div class="pettile r-'+pet.rarity+(eq?' equipped':'')+'" data-petid="'+pet.id+'" title="'+pet.name+'">';
      if(eq) html+='<span class="petteq">✓</span>';
      html+='<canvas class="pettile-canvas" width="56" height="56"></canvas>';
      html+='<div class="pettile-name">'+pet.name+'</div>';
      html+='</div>';
    }
    html+='</div>'; // petownedgrid
  } else {
    html+='<div class="invhint">Recruit a pet to get started!</div>';
  }
  html+='</div>'; // shopsec
  return html;
}

// ---- Result modal ----
function _showPullResult(result) {
  if(!result) return;
  const { pet, duplicate } = result;
  const ov=document.getElementById('itempop'); if(!ov) return;
  const rarLabel=(typeof RAR!=='undefined'&&RAR[pet.rarity])?RAR[pet.rarity].name:pet.rarity.toUpperCase();
  const thumbURL=_renderPetThumbDataURL(pet.id, 100);
  ov.innerHTML='<div class="ipcard r-'+pet.rarity+'">'
    +'<button class="ipx" id="ipclose">✕</button>'
    +'<div class="ipicon r-'+pet.rarity+'"><img src="'+thumbURL+'" alt="" style="width:80%;height:80%"></div>'
    +'<div class="ipname">'+pet.name+'</div>'
    +'<div class="iptags"><span class="rtag r-'+pet.rarity+'">'+rarLabel+'</span></div>'
    +'<div class="ipstat">'+pet.desc+'</div>'
    +(duplicate?'<div class="crdup">Duplicate — 3 gems refunded</div>':'<div class="crnew">NEW PET!</div>')
    +'</div>';
  ov.classList.remove('hidden');
  ov.onclick=(e)=>{ if(e.target===ov) ov.classList.add('hidden'); };
  const xb=document.getElementById('ipclose');
  if(xb) xb.onclick=()=>ov.classList.add('hidden');
}

// ---- initRecruitUI: wire buttons after renderShop ----
function initRecruitUI(container) {
  if(!container) container=document.getElementById('shopgrid');
  if(!container) return;

  // Wire weekly charshop-buy button
  container.querySelectorAll('.weeklycard .charshop-buy[data-buychar]').forEach(btn=>{
    btn.addEventListener('click',()=>{ buyCharacter(btn.dataset.buychar); });
  });

  // Wire daily carousel nav + buy
  const charPrev=container.querySelector('#charcaroprev');
  const charNext=container.querySelector('#charcaronext');
  const charWrap=container.querySelector('#charcarowrap');
  const charCounter=container.querySelector('.carcounter');
  if(charPrev&&charNext&&charWrap){
    const daily=getCharDailyShop();

    function _wireCaroBuy(){
      const buyBtn=charWrap.querySelector('.charshop-buy[data-buychar]');
      if(buyBtn) buyBtn.addEventListener('click',()=>{ buyCharacter(buyBtn.dataset.buychar); });
    }

    function _renderCaroCard(dir){
      const card=daily[charShopDailyIdx]; if(!card) return;
      const gem='<span class="gemico-sm">◆</span>';
      const owned=isCharOwned(card.id);
      const price=CHAR_SHOP_PRICE[card.rarity]||50;
      const poor=gemBalance<price;
      const rarLabel=(typeof RAR!=='undefined'&&RAR[card.rarity])?RAR[card.rarity].name:card.rarity.toUpperCase();
      let html='<div class="charcarousel-card scard r-'+card.rarity+(dir===1?' caro-slide-right':dir===-1?' caro-slide-left':'')+'">';
      html+='<div class="charport-lg"><canvas width="100" height="100" id="charcarocanvas"></canvas></div>';
      html+='<div class="csname-lg">'+card.name+'</div>';
      html+='<div class="csdesc-full">'+card.desc+'</div>';
      html+='<div class="cstags cstags-center"><span class="rtag r-'+card.rarity+'">'+rarLabel+'</span></div>';
      if(owned) html+='<div class="scheck">✓</div>';
      else html+='<button class="sbuy charshop-buy'+(poor?' poor':'')+'" data-buychar="'+card.id+'" data-price="'+price+'">'+gem+price+'</button>';
      html+='</div>';
      charWrap.innerHTML=html;
      if(charCounter) charCounter.textContent=(charShopDailyIdx+1)+' / '+daily.length;
      const cv=document.getElementById('charcarocanvas');
      if(cv&&typeof renderCharThumb==='function') renderCharThumb(cv.getContext('2d'),card.id,100);
      _wireCaroBuy();
    }

    // Render initial canvas (HTML already present from renderShopCharSection)
    const initCv=document.getElementById('charcarocanvas');
    if(initCv&&typeof renderCharThumb==='function'){
      const card=daily[charShopDailyIdx];
      if(card) renderCharThumb(initCv.getContext('2d'),card.id,100);
    }
    _wireCaroBuy();

    charPrev.addEventListener('click',()=>{ charShopDailyIdx=(charShopDailyIdx-1+daily.length)%daily.length; _renderCaroCard(-1); });
    charNext.addEventListener('click',()=>{ charShopDailyIdx=(charShopDailyIdx+1)%daily.length; _renderCaroCard(1); });
  }

  // Wire pet pull button
  const pullBtn=container.querySelector('#petpullbtn');
  if(pullBtn){
    pullBtn.addEventListener('click',()=>{
      const result=recruitPet();
      if(!result) return;
      if(typeof renderShop==='function') renderShop();
      _showPullResult(result);
    });
  }

  // Wire pet tiles in recruit section
  container.querySelectorAll('.pettile[data-petid]').forEach(tile=>{
    tile.addEventListener('click',()=>{
      const id=tile.dataset.petid;
      if(typeof setActivePet==='function'){
        const cur=(typeof activePetId!=='undefined')?activePetId:null;
        setActivePet(cur===id?null:id);
      }
      if(typeof renderShop==='function') renderShop();
    });
  });

  // Render pet canvases in recruit section
  container.querySelectorAll('.pettile-canvas').forEach(canvas=>{
    const tile=canvas.closest('.pettile[data-petid]');
    if(!tile) return;
    const petId=tile.dataset.petid;
    const pet=PETS.find(p=>p.id===petId);
    if(!pet||!pet.draw) return;
    const g=canvas.getContext('2d');
    g.save(); g.translate(28,28); pet.draw(g,56,0); g.restore();
  });

  // Render weekly char thumbnail
  const weeklyCv=container.querySelector('#weeklyCanvas');
  if(weeklyCv){
    const wrap=weeklyCv.closest('[data-petcanvas]');
    const charId=wrap?wrap.dataset.petcanvas:null;
    if(charId&&typeof renderCharThumb==='function') renderCharThumb(weeklyCv.getContext('2d'),charId,weeklyCv.width);
  }
}

// init gem UI on load
refreshGemsUI();
