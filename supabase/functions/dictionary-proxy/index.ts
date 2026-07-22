// Dictionary proxy — caches lookups and proxies to free API server-side (no CORS)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const CACHE_TABLE = "dictionary_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

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
    const { data: cached } = await supabase
      .from(CACHE_TABLE)
      .select("data, cached_at")
      .eq("word", word)
      .maybeSingle();

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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
