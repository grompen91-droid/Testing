'use strict';
// ============ ACCOUNTS: Google login (Supabase) + cloud save, or local guest ============
// Progression (gold, world unlocks, gear owned/equipped/seen) saves to the signed-in Google
// account via Supabase (Postgres + Row Level Security). "Continue as Guest" keeps everything in
// localStorage only and is NEVER uploaded. Device-only settings (music/SFX mute) stay local.
//
// SETUP (one-time):
//   1. Create a project at https://supabase.com  → Project Settings → API:
//        copy the "Project URL" and the "anon public" key into js/supabase-config.js
//        (or inject them on Vercel via env vars + build.js — see README/build.js).
//      NOTE: the anon key is PUBLIC and safe in the browser — your data is protected by the RLS
//      policies below, not by hiding the key.
//   2. SQL editor → run:
//        create table if not exists public.saves (
//          user_id uuid primary key references auth.users(id) on delete cascade,
//          data jsonb not null default '{}',
//          updated_at timestamptz not null default now()
//        );
//        alter table public.saves enable row level security;
//        create policy "own_read"   on public.saves for select using (auth.uid() = user_id);
//        create policy "own_insert" on public.saves for insert with check (auth.uid() = user_id);
//        create policy "own_update" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
//   3. Authentication → Providers → Google → enable; paste a Google OAuth Client ID + Secret
//      (from Google Cloud console). In Google, add redirect URI: https://<project>.supabase.co/auth/v1/callback
//   4. Authentication → URL Configuration → set Site URL to your Vercel URL and add it (and
//      http://localhost:* for testing) under "Redirect URLs".
// Until URL + anon key are set, Google login is disabled and the game runs in guest-only mode.

const SUPA_URL  = (typeof window!=='undefined' && window.SUPA_URL)  || 'PASTE_SUPABASE_URL';
const SUPA_ANON = (typeof window!=='undefined' && window.SUPA_ANON) || 'PASTE_SUPABASE_ANON_KEY';

const EMPTY_PROFILE = () => ({ gold:0, unlocked:0, owned:[], equipped:{}, seen:[], gems:0, chars:[], pets:[], petPity:0, activeChar:'gianni', activePet:null });

let sb = null;                // supabase client
let authMode = null;          // 'guest' | 'account'
let acctUser = null;          // signed-in supabase user (account mode)
let loadedUid = null;
let saveTimer = null;

function supaConfigured(){
  return typeof supabase!=='undefined'
      && typeof SUPA_URL==='string'  && SUPA_URL.indexOf('PASTE')<0  && SUPA_URL.indexOf('http')===0
      && typeof SUPA_ANON==='string' && SUPA_ANON.indexOf('PASTE')<0 && SUPA_ANON.length>20;
}

// ---- profile <-> the live localStorage working keys ----
function currentBlob(){
  return {
    gold:       +(localStorage.getItem('br_gold')||0),
    unlocked:   +(localStorage.getItem('br_unlocked')||0),
    owned:      JSON.parse(localStorage.getItem('br_items_owned')||'[]'),
    equipped:   JSON.parse(localStorage.getItem('br_gear_equipped')||'{}'),
    seen:       JSON.parse(localStorage.getItem('br_gear_seen')||'[]'),
    gems:       +(localStorage.getItem('br_gems')||0),
    chars:      JSON.parse(localStorage.getItem('br_owned_chars')||'[]'),
    pets:       JSON.parse(localStorage.getItem('br_owned_pets')||'[]'),
    petPity:    +(localStorage.getItem('br_pet_pity')||0),
    activeChar: localStorage.getItem('br_active_char')||'gianni',
    activePet:  localStorage.getItem('br_active_pet')||null,
  };
}
function applyProfile(b){
  b = b || EMPTY_PROFILE();
  // gold
  const restoredGold = Math.max(0, Math.floor(b.gold!=null? b.gold : 0));
  localStorage.setItem('br_gold', restoredGold);
  if(typeof _saveHash==='function') localStorage.setItem('br_gold_sig', _saveHash(restoredGold));
  // world progress
  localStorage.setItem('br_unlocked',      b.unlocked!=null? b.unlocked : 0);
  // gear
  localStorage.setItem('br_items_owned',   JSON.stringify(b.owned||[]));
  localStorage.setItem('br_gear_equipped', JSON.stringify(b.equipped||{}));
  localStorage.setItem('br_gear_seen',     JSON.stringify(b.seen||[]));
  // gems
  const restoredGems = Math.max(0, Math.floor(b.gems!=null? b.gems : 0));
  localStorage.setItem('br_gems', restoredGems);
  if(typeof _gemHash==='function') localStorage.setItem('br_gems_sig', _gemHash(restoredGems));
  if(typeof gemBalance!=='undefined') gemBalance = restoredGems;
  // characters
  localStorage.setItem('br_owned_chars', JSON.stringify(b.chars||[]));
  // pets
  localStorage.setItem('br_owned_pets', JSON.stringify(b.pets||[]));
  localStorage.setItem('br_pet_pity', b.petPity!=null? b.petPity : 0);
  // active selections
  const ac = b.activeChar||'gianni';
  localStorage.setItem('br_active_char', ac);
  if(typeof activeCharId!=='undefined') activeCharId = ac;
  if(b.activePet){ localStorage.setItem('br_active_pet', b.activePet); if(typeof activePetId!=='undefined') activePetId=b.activePet; }
  else { localStorage.removeItem('br_active_pet'); if(typeof activePetId!=='undefined') activePetId=null; }
  rehydrate();
}
// push the freshly-written working keys into the live game globals + refresh the menu UI
function rehydrate(){
  try{
    gold = +(localStorage.getItem('br_gold')||0);
    unlockedMax = +(localStorage.getItem('br_unlocked')||0);
    if(typeof selWorld!=='undefined' && selWorld>unlockedMax) selWorld=unlockedMax;
    gearOwned = new Set(JSON.parse(localStorage.getItem('br_items_owned')||'[]'));
    gearEquip = Object.assign({helmet:null,chest:null,pants:null,shoes:null}, JSON.parse(localStorage.getItem('br_gear_equipped')||'{}'));
    gearSeen  = new Set(JSON.parse(localStorage.getItem('br_gear_seen')||'[]'));
  }catch(e){ console.warn('rehydrate failed',e); }
  if(typeof refreshTopbar==='function')    refreshTopbar();
  if(typeof refreshWorldSel==='function')  refreshWorldSel();
  if(typeof refreshMenuChar==='function')  refreshMenuChar();
  if(typeof renderShop==='function')       renderShop();
  if(typeof renderInventory==='function')  renderInventory();
  if(typeof renderPetSection==='function') renderPetSection();
  if(typeof renderCharacterTab==='function') renderCharacterTab();
  if(typeof updateInvBadge==='function')   updateInvBadge();
  if(typeof refreshGemsUI==='function')    refreshGemsUI();
  const gt=$('goldtxt'); if(gt) gt.textContent = (typeof gold!=='undefined'?gold:0);
}

// ---- saving (debounced; gentle on quota) ----
function markDirty(){ if(saveTimer) return; saveTimer=setTimeout(()=>{ saveTimer=null; saveProfile(); }, 1500); }
window.markDirty = markDirty;
function flushSave(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; saveProfile(); } }
window.addEventListener('beforeunload', flushSave);
window.addEventListener('pagehide', flushSave);
function saveProfile(){
  const blob = currentBlob();
  if(authMode==='guest'){ localStorage.setItem('br_save_guest', JSON.stringify(blob)); return; }
  if(authMode==='account' && acctUser && sb){
    localStorage.setItem('br_save_acct_'+acctUser.id, JSON.stringify(blob));        // offline cache
    sb.from('saves').upsert({ user_id:acctUser.id, data:blob, updated_at:new Date().toISOString() })
      .then(({error})=>{ if(error) console.warn('cloud save failed', error.message); });
  }
}

// ---- guest mode (local only; never uploaded) ----
function enterGuest(){
  authMode='guest'; acctUser=null; loadedUid=null;
  let blob=null;
  try{ const g=localStorage.getItem('br_save_guest'); if(g) blob=JSON.parse(g); }catch(e){}
  if(!blob) blob=currentBlob();   // first run: the existing localStorage IS the guest save (nothing wiped)
  applyProfile(blob);
  localStorage.setItem('br_save_guest', JSON.stringify(currentBlob()));
  hideLogin(); updateAcctUI();
}

// ---- account mode (Google + Supabase) ----
async function enterAccount(user){
  if(authMode==='account' && loadedUid===user.id){ hideLogin(); updateAcctUI(); return; }
  authMode='account'; acctUser=user; loadedUid=user.id;
  let blob=null;
  try{
    const { data, error } = await sb.from('saves').select('data').eq('user_id', user.id).maybeSingle();
    if(!error && data && data.data) blob = data.data;
  }catch(e){
    const c=localStorage.getItem('br_save_acct_'+user.id);     // offline → last cached cloud save
    if(c){ try{ blob=JSON.parse(c); }catch(_){} }
  }
  if(!blob) blob = EMPTY_PROFILE();   // brand-new account = fresh start; guest progress is NOT imported
  applyProfile(blob);
  saveProfile();                      // ensure the row exists
  hideLogin(); updateAcctUI();
}

function doGoogleLogin(){
  if(!supaConfigured()){ loginMsg("Google login isn't set up yet — add your Supabase URL + anon key (js/supabase-config.js). You can play as guest for now."); return; }
  authMode=null;   // explicit sign-in overrides a prior guest choice
  const redirectTo = location.href.split('#')[0].split('?')[0];
  sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } })
    .then(({error})=>{ if(error) loginMsg('Login failed: '+error.message); });
}
function doSignOut(){
  if(sb) sb.auth.signOut().catch(()=>{});
  acctUser=null; authMode=null; loadedUid=null;
  showLogin(); updateAcctUI();
}

// ---- UI ----
function showLogin(){ const o=$('login'); if(o) o.classList.remove('hidden'); }
function hideLogin(){ const o=$('login'); if(o) o.classList.add('hidden'); }
function loginMsg(t){ const m=$('loginmsg'); if(m){ m.textContent=t; m.classList.remove('hidden'); } }
function updateAcctUI(){
  const un=$('sdrop-username'), si=$('sdrop-acct'); if(!un) return;
  if(authMode==='account' && acctUser){
    const md = acctUser.user_metadata||{};
    const nm = md.full_name || md.name || acctUser.email || 'Account';
    un.textContent = String(nm).split(' ')[0];
    if(si){ si.textContent='Sign Out'; si.dataset.action='signout'; si.style.background='#d9694a'; si.style.boxShadow='0 4px 0 #a0412c'; }
  } else {
    un.textContent = 'Guest';
    if(si){ si.textContent='Sign In'; si.dataset.action='signin'; si.style.background=''; si.style.boxShadow=''; }
  }
}

// ---- boot ----
(function initAuth(){
  // Non-destructively snapshot any existing progress as the guest save, so current players keep
  // everything when they choose "Continue as Guest". The original keys are never removed.
  if(localStorage.getItem('br_save_guest')==null){
    try{ localStorage.setItem('br_save_guest', JSON.stringify(currentBlob())); }catch(e){}
  }

  const g=$('btn-google'); if(g) g.addEventListener('click', doGoogleLogin);
  const gu=$('btn-guest'); if(gu) gu.addEventListener('click', enterGuest);
  const si=$('sdrop-acct'); if(si) si.addEventListener('click', ()=>{
    $('settingsdrop').classList.add('hidden');
    if(si.dataset.action==='signout'){ if(confirm('Sign out of your Google account?')) doSignOut(); }
    else { showLogin(); }
  });

  if(supaConfigured()){
    try{
      sb = supabase.createClient(SUPA_URL, SUPA_ANON);
      // fires INITIAL_SESSION on load (and after the Google redirect detects the session in the URL)
      sb.auth.onAuthStateChange((event, session)=>{
        if(session && session.user && authMode!=='guest'){ enterAccount(session.user); }
        else if(event==='SIGNED_OUT'){ acctUser=null; loadedUid=null; if(authMode==='account'){ authMode=null; showLogin(); } }
      });
    }catch(e){ console.warn('Supabase init failed',e); }
  } else {
    const gb=$('btn-google'); if(gb) gb.classList.add('disabled');
    loginMsg('Add your Supabase URL + anon key to enable Google login. Guest play works now.');
  }

  showLogin(); updateAcctUI();
})();
