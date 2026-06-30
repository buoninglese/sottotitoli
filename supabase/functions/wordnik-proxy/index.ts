// Supabase Edge Function: Wordnik API Proxy
// Keeps the Wordnik API key server-side. Client calls this with ?word= and ?type=
// Types: definitions, synonyms

const WORDNIK_API_KEY = Deno.env.get('WORDNIK_API_KEY')!;
const WORDNIK_BASE = 'https://api.wordnik.com/v4/word.json';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-memory cache (resets on cold start, good enough for a session)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const word = url.searchParams.get('word');
    const type = url.searchParams.get('type') || 'definitions';

    if (!word) {
      return new Response(JSON.stringify({ error: 'Missing word parameter' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Check cache
    const cacheKey = `${word}:${type}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), { headers: corsHeaders });
    }

    let wnUrl: string;
    if (type === 'synonyms') {
      wnUrl = `${WORDNIK_BASE}/${encodeURIComponent(word)}/relatedWords?useCanonical=true&relationshipTypes=synonym&limitPerRelationshipType=8&api_key=${WORDNIK_API_KEY}`;
    } else {
      wnUrl = `${WORDNIK_BASE}/${encodeURIComponent(word)}/definitions?limit=2&sourceDictionaries=all&api_key=${WORDNIK_API_KEY}`;
    }

    const wnRes = await fetch(wnUrl);
    if (!wnRes.ok) {
      return new Response(JSON.stringify({ error: `Wordnik returned ${wnRes.status}` }), {
        status: wnRes.status, headers: corsHeaders,
      });
    }

    const data = await wnRes.json();
    cache.set(cacheKey, { data, ts: Date.now() });

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: corsHeaders,
    });
  }
});
