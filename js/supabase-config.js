// Public Supabase config — SAFE for the browser (the anon key is meant to be public; your data is
// protected by Row Level Security, not by hiding this).
//
// Two ways to fill these in:
//   A) Simplest: just paste your values below (they're public, fine to commit).
//   B) Vercel env vars: leave the PASTE_* placeholders here and let `build.js` overwrite this file
//      at deploy time from SUPABASE_URL / SUPABASE_ANON_KEY (see build.js + the Vercel steps).
window.SUPA_URL  = window.SUPA_URL  || 'https://elifpwxfgyiqmxrtghqg.supabase.co';
window.SUPA_ANON = window.SUPA_ANON || 'sb_publishable_-8oZz1-IegpGfMTQTuvIwA_eqf52xfW';
