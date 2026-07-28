// Supabase Edge Function: translate
// Deploy: supabase functions deploy translate --no-verify-jwt
//
// Proxies translation requests through a server-side cache with fallback chain:
//   1. Google Translate (unofficial, client=gtx)
//   2. MyMemory (free tier, ~1000 words/day)
//   3. Raw text passthrough (no translation — UI won't break)
//
// Caching: ephemeral in-memory Map. Survives within a single instance lifetime
// (warm Lambda). Sufficient for caption bursts where phrases repeat ("Next slide",
// "Thank you", etc.). For a persistent cache, add Redis or Supabase KV.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// ── Configuration ──────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = 'https://www.sottotitoli.pro';
const MYMEMORY_EMAIL = 'studiobuoninglese@gmail.com'; // free tier attribution
const MAX_CACHE_SIZE = 2000; // max entries before eviction
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Simple TTL Cache ───────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  provider: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, source: string, target: string): string {
  return `${source}:${target}:${text.trim().toLowerCase()}`;
}

function cacheGet(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key: string, value: string, provider: string): void {
  // Evict oldest entry if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, {
    value,
    provider,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeLang(value: string): string {
  const input = (value || '').toLowerCase().trim();
  if (!input) return '';
  const base = input.split('-')[0];
  const allowed = ['en', 'it', 'fr', 'de', 'es', 'pt', 'nl', 'pl', 'auto'];
  return allowed.includes(base) ? base : '';
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

// ── Translation Providers ──────────────────────────────────────────────────

async function translateGoogle(text: string, source: string, target: string) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    encodeURIComponent(source) +
    '&tl=' + encodeURIComponent(target) +
    '&dt=t&q=' + encodeURIComponent(text);

  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) {
    throw new Error(`Google Translate HTTP ${resp.status}`);
  }

  const raw = await resp.text();
  // Response format: [[["translated text","original",...]],...]
  const matches = [...raw.matchAll(/"([^"]+)"/g)];
  if (matches.length === 0) {
    throw new Error('Could not parse Google Translate response');
  }

  const translated = matches[0][1];

  // Detect source language when sl=auto
  let detectedLang: string | null = null;
  if (source === 'auto') {
    const dlMatch = raw.match(/],null,"([a-z]{2,3})"/);
    if (dlMatch) detectedLang = dlMatch[1];
  }

  return { translated, provider: 'google', detectedLang };
}

async function translateMyMemory(text: string, source: string, target: string) {
  const url =
    'https://api.mymemory.translated.net/get?' +
    new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`,
      de: MYMEMORY_EMAIL,
    }).toString();

  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) {
    throw new Error(`MyMemory HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) {
    throw new Error('Invalid MyMemory response');
  }

  return { translated, provider: 'mymemory', detectedLang: null };
}

// ── Main Handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { text?: string; sourceLang?: string; targetLang?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const text = (body.text || '').trim();
  const source = normalizeLang(body.sourceLang || 'auto');
  const target = normalizeLang(body.targetLang || '');

  if (!text) {
    return jsonResponse({ error: 'Missing "text" field' }, 400);
  }
  if (!target) {
    return jsonResponse({ error: 'Missing or invalid "targetLang"' }, 400);
  }

  // ── Cache lookup ──
  const key = cacheKey(text, source, target);
  const cached = cacheGet(key);
  if (cached) {
    return jsonResponse({
      translatedText: cached.value,
      provider: `cached:${cached.provider}`,
      detectedLang: null,
    });
  }

  // ── Fallback chain: Google → MyMemory → raw text ──
  let result: { translated: string; provider: string; detectedLang: string | null };

  try {
    const googleResult = await translateGoogle(text, source, target);
    result = googleResult;
  } catch (googleErr) {
    console.warn('Google Translate failed:', googleErr);
    try {
      const mmResult = await translateMyMemory(text, source, target);
      result = mmResult;
    } catch (mmErr) {
      console.warn('MyMemory failed:', mmErr);
      // Passthrough: return original text so UI doesn't break
      result = { translated: text, provider: 'passthrough', detectedLang: null };
    }
  }

  // ── Cache the result ──
  cacheSet(key, result.translated, result.provider);

  return jsonResponse({
    translatedText: result.translated,
    provider: result.provider,
    detectedLang: result.detectedLang,
  });
});
