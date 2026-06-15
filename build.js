// Vercel build step: generate js/supabase-config.js from environment variables.
// Set "Build Command" in Vercel to:  node build.js
// and add Environment Variables:  SUPABASE_URL  and  SUPABASE_ANON_KEY
// (Both are public/browser-safe — data is protected by Supabase Row Level Security.)
//
// If the env vars are missing, the existing js/supabase-config.js is left untouched, so local
// hardcoded values still work.
const fs = require('fs');

const url  = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.warn('[build] SUPABASE_URL / SUPABASE_ANON_KEY not set — leaving js/supabase-config.js as-is.');
  process.exit(0);
}

const out =
`// AUTO-GENERATED at build time from Vercel env vars. Do not edit by hand.
window.SUPA_URL  = ${JSON.stringify(url)};
window.SUPA_ANON = ${JSON.stringify(anon)};
`;

fs.writeFileSync('js/supabase-config.js', out);
console.log('[build] wrote js/supabase-config.js from env vars.');
