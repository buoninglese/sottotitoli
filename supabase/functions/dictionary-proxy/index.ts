// Dictionary proxy — caches lookups and proxies to free API server-side (no CORS)
//
// REQUIRES A SIGNED-IN CALLER. The access token is validated below and a request
// without one gets 401. It previously had no check at all, which made it a free public
// dictionary API for anyone who knew the URL: CORS narrowing was not enough, because
// CORS is a rule browsers obey and a server-side caller ignores it entirely.
//
// All five call sites in the app send the token (caption-s8t.html, js/learner.js and
// three in js/panoramica.js) and all of them are behind sign-in, so this costs no user
// anything. caption-s8t.html additionally falls back to the public dictionary API, so a
// definition still appears if the proxy is unreachable or unauthenticated.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const CACHE_TABLE = "dictionary_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Origin allowlist — the same five entries the other functions use. This one was a
// wildcard, and unlike its siblings it has no JWT check behind it, so the wildcard was
// the only thing standing between any website and this proxy.
const ALLOWED_ORIGINS = new Set([
  "https://www.sottotitoli.pro",
  "https://sottotitoli.pro",
  "https://buoninglese.github.io",
  "http://localhost:8000",
  "http://localhost:5500",
]);

function corsHeadersFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.sottotitoli.pro";
  return {
    "Access-Control-Allow-Origin": allow,
    // The value now depends on the request, so it must be marked as varying or a cache
    // can replay one origin's header back to a different origin.
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

serve(async (req: Request) => {
  // Bound to THIS request's Origin rather than module state: one isolate serves
  // concurrent requests, so a module-level value could answer with the wrong origin.
  const cors = corsHeadersFor(req.headers.get("Origin"));
  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  // ── Require a signed-in caller ─────────────────────────────────────────────
  // The token is resolved against the project rather than trusted, using the same
  // shape the other functions use. A caller-scoped client, so a token that is merely
  // the anon key does not pass — getUser() returns no user for it.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const word = url.searchParams.get("word")?.toLowerCase().trim();
  if (!word || word.length < 2) {
    return jsonResponse({ error: "Missing word parameter" }, 400);
  }

  // Init Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from(CACHE_TABLE)
      .select("data, cached_at")
      .eq("word", word)
      .maybeSingle();

    // A failed cache read must not be treated as a hit — reading it as a miss is
    // the safe answer. But the try/catch around this handler cannot see it, because
    // the client returns errors instead of throwing them.
    if (cacheError) {
      console.warn("dictionary cache unreadable for " + word + ": " + cacheError.message + " — treating as a miss");
    }

    if (cached && cached.cached_at) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < CACHE_TTL_MS) {
        return jsonResponse(cached.data);
      }
    }

    // Fetch from free API
    const resp = await fetch(DICT_API + encodeURIComponent(word));
    if (!resp.ok) {
      // Cache negatives briefly so we don't retry junk words
      const negative = { definition: null, ipa: null, notFound: true };
      await supabase.from(CACHE_TABLE).upsert({
        word,
        data: negative,
        cached_at: new Date().toISOString(),
      }, { onConflict: "word" });
      return jsonResponse(negative);
    }

    const raw = await resp.json();
    let definition = "";
    let ipa = "";

    if (Array.isArray(raw) && raw.length > 0) {
      const entry = raw[0];
      // IPA
      if (entry.phonetics?.length) {
        for (const ph of entry.phonetics) {
          if (ph.text) { ipa = ph.text; break; }
        }
      } else if (entry.phonetic) {
        ipa = entry.phonetic;
      }
      // Definition
      if (entry.meanings?.length) {
        for (const m of entry.meanings) {
          if (m.definitions?.length) {
            definition = m.definitions[0].definition;
            break;
          }
        }
      }
    }

    const result = { definition: definition || null, ipa: ipa || null };
    
    // Cache
    await supabase.from(CACHE_TABLE).upsert({
      word,
      data: result,
      cached_at: new Date().toISOString(),
    }, { onConflict: "word" });

    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: "Dictionary fetch failed", detail: String(e) }, 500);
  }
});
