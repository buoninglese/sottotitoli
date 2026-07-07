// ═══ Process Session Analytics ═══
// Supabase Edge Function — triggered after a session is saved.
// Reads the transcript, computes MATTR + CEFR breakdown,
// upserts user_vocabulary and user_analytics_snapshot.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WINDOW_SIZE = 50;

// ── Tokenizer ──
function tokenize(text: string): string[] {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/['\u2018\u2019]/g, "'")
    .replace(/[^a-z'\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !/^\d+$/.test(w));
}

// ── MATTR ──
function windowTTR(tokens: string[], start: number, size: number): number | null {
  const end = Math.min(start + size, tokens.length);
  if (end - start < 10) return null;
  const seen = new Set<string>();
  for (let i = start; i < end; i++) seen.add(tokens[i]);
  return seen.size / (end - start);
}

function computeMATTR(tokens: string[]): number {
  if (!tokens.length) return 0;
  if (tokens.length < WINDOW_SIZE) {
    return new Set(tokens).size / tokens.length;
  }
  const windows = tokens.length - WINDOW_SIZE + 1;
  let sum = 0, valid = 0;
  for (let w = 0; w < windows; w++) {
    const ttr = windowTTR(tokens, w, WINDOW_SIZE);
    if (ttr !== null) { sum += ttr; valid++; }
  }
  return valid ? Math.round((sum / valid) * 1000) / 1000 : 0;
}

// ── CEFR Mapping (embedded subset — full dict too large for edge function) ──
// The edge function bundles a core A1-B1 word set. Rarer words use heuristics.
const CEFR_MAP: Record<string, string> = {
  "the":"A1","a":"A1","an":"A1","be":"A1","is":"A1","are":"A1","was":"A1","were":"A1",
  "been":"A1","have":"A1","has":"A1","had":"A1","do":"A1","does":"A1","did":"A1",
  "will":"A1","would":"A1","can":"A1","could":"A1","should":"A1","i":"A1","you":"A1",
  "he":"A1","she":"A1","it":"A1","we":"A1","they":"A1","me":"A1","him":"A1","her":"A1",
  "us":"A1","them":"A1","my":"A1","your":"A1","his":"A1","our":"A1","their":"A1",
  "this":"A1","that":"A1","these":"A1","those":"A1","here":"A1","there":"A1",
  "not":"A1","no":"A1","yes":"A1","and":"A1","or":"A1","but":"A1","so":"A1",
  "because":"A1","if":"A1","when":"A1","where":"A1","what":"A1","who":"A1",
  "which":"A1","how":"A1","why":"A1","to":"A1","of":"A1","in":"A1","at":"A1",
  "on":"A1","for":"A1","with":"A1","from":"A1","by":"A1","about":"A1","as":"A1",
  "like":"A1","than":"A1","then":"A1","also":"A1","too":"A1","very":"A1","just":"A1",
  "now":"A1","only":"A1","all":"A1","some":"A1","any":"A1","every":"A1","one":"A1",
  "two":"A1","three":"A1","good":"A1","bad":"A1","big":"A1","small":"A1","new":"A1",
  "old":"A1","long":"A1","right":"A1","wrong":"A1","easy":"A1","hard":"A1",
  "man":"A1","woman":"A1","people":"A1","person":"A1","family":"A1","friend":"A1",
  "time":"A1","day":"A1","week":"A1","year":"A1","thing":"A1","way":"A1","world":"A1",
  "life":"A1","work":"A1","home":"A1","house":"A1","place":"A1","water":"A1","food":"A1",
  "money":"A1","name":"A1","number":"A1","word":"A1","go":"A1","come":"A1","get":"A1",
  "make":"A1","take":"A1","give":"A1","see":"A1","look":"A1","know":"A1","think":"A1",
  "want":"A1","need":"A1","say":"A1","tell":"A1","ask":"A1","help":"A1","use":"A1",
  "find":"A1","try":"A1","start":"A1","stop":"A1","play":"A1","run":"A1","walk":"A1",
  "eat":"A1","drink":"A1","sleep":"A1","read":"A1","write":"A1","listen":"A1",
  "speak":"A1","learn":"A1","teach":"A1","buy":"A1","pay":"A1","call":"A1",
  // A2 common words
  "able":"A2","accept":"A2","achieve":"A2","act":"A2","add":"A2","agree":"A2",
  "allow":"A2","answer":"A2","appear":"A2","arrive":"A2","believe":"A2","borrow":"A2",
  "break":"A2","bring":"A2","build":"A2","carry":"A2","catch":"A2","change":"A2",
  "check":"A2","choose":"A2","clear":"A2","climb":"A2","close":"A2","collect":"A2",
  "common":"A2","compare":"A2","complete":"A2","connect":"A2","consider":"A2",
  "continue":"A2","control":"A2","cook":"A2","correct":"A2","cost":"A2","count":"A2",
  "cover":"A2","create":"A2","cross":"A2","cry":"A2","cut":"A2","damage":"A2",
  "deal":"A2","decide":"A2","deep":"A2","describe":"A2","design":"A2","develop":"A2",
  "die":"A2","different":"A2","difficult":"A2","discover":"A2","discuss":"A2",
  "divide":"A2","draw":"A2","dream":"A2","drive":"A2","drop":"A2","enjoy":"A2",
  "enter":"A2","explain":"A2","express":"A2","fail":"A2","fall":"A2","fast":"A2",
  "feel":"A2","fill":"A2","finish":"A2","fit":"A2","fly":"A2","follow":"A2",
  "forget":"A2","form":"A2","free":"A2","grow":"A2","guess":"A2","happen":"A2",
  "hate":"A2","hide":"A2","hit":"A2","hold":"A2","hope":"A2","hurt":"A2",
  "imagine":"A2","important":"A2","improve":"A2","include":"A2","increase":"A2",
  "interest":"A2","introduce":"A2","invite":"A2","involve":"A2","join":"A2",
  "jump":"A2","keep":"A2","kill":"A2","laugh":"A2","lay":"A2","lead":"A2",
  "leave":"A2","lend":"A2","lie":"A2","lift":"A2","lose":"A2","manage":"A2",
  "mark":"A2","matter":"A2","mean":"A2","measure":"A2","meet":"A2","mention":"A2",
  "mind":"A2","miss":"A2","move":"A2","notice":"A2","offer":"A2","open":"A2",
  "order":"A2","own":"A2","pass":"A2","perform":"A2","pick":"A2","plan":"A2",
  "point":"A2","prefer":"A2","prepare":"A2","present":"A2","press":"A2","prevent":"A2",
  "produce":"A2","promise":"A2","protect":"A2","prove":"A2","provide":"A2","pull":"A2",
  "push":"A2","raise":"A2","reach":"A2","realize":"A2","receive":"A2","recognize":"A2",
  "record":"A2","reduce":"A2","refer":"A2","reflect":"A2","refuse":"A2","relate":"A2",
  "remain":"A2","remember":"A2","remove":"A2","repeat":"A2","replace":"A2","reply":"A2",
  "report":"A2","represent":"A2","require":"A2","rest":"A2","result":"A2","return":"A2",
  "reveal":"A2","ring":"A2","rise":"A2","roll":"A2","rule":"A2","rush":"A2",
  "save":"A2","search":"A2","seem":"A2","select":"A2","sell":"A2","send":"A2",
  "separate":"A2","serve":"A2","set":"A2","shake":"A2","share":"A2","shoot":"A2",
  "shout":"A2","show":"A2","shut":"A2","sign":"A2","sing":"A2","sit":"A2",
  "smile":"A2","sort":"A2","sound":"A2","stand":"A2","stay":"A2","steal":"A2",
  "stick":"A2","study":"A2","succeed":"A2","suffer":"A2","suggest":"A2","supply":"A2",
  "support":"A2","suppose":"A2","surprise":"A2","survive":"A2","talk":"A2","taste":"A2",
  "test":"A2","thank":"A2","throw":"A2","touch":"A2","train":"A2","travel":"A2",
  "treat":"A2","trust":"A2","turn":"A2","understand":"A2","visit":"A2","wait":"A2",
  "wake":"A2","watch":"A2","wear":"A2","win":"A2","wish":"A2","wonder":"A2","worry":"A2",
  // B1
  "achieve":"B1","acquire":"B1","adapt":"B1","adjust":"B1","admire":"B1","admit":"B1",
  "adopt":"B1","affect":"B1","afford":"B1","announce":"B1","apologize":"B1","approve":"B1",
  "argue":"B1","arrange":"B1","assume":"B1","attach":"B1","attack":"B1","attempt":"B1",
  "attend":"B1","attract":"B1","avoid":"B1","base":"B1","benefit":"B1","blame":"B1",
  "bother":"B1","broadcast":"B1","celebrate":"B1","claim":"B1","combine":"B1","comfort":"B1",
  "command":"B1","comment":"B1","commit":"B1","communicate":"B1","compete":"B1","complain":"B1",
  "concern":"B1","confirm":"B1","confuse":"B1","consist":"B1","contact":"B1","contain":"B1",
  "convince":"B1","cooperate":"B1","cope":"B1","crash":"B1","criticize":"B1","damage":"B1",
  "debate":"B1","declare":"B1","decline":"B1","defend":"B1","define":"B1","delay":"B1",
  "deliver":"B1","demand":"B1","depend":"B1","deserve":"B1","desire":"B1","destroy":"B1",
  "determine":"B1","disappear":"B1","disappoint":"B1","display":"B1","distinguish":"B1",
  "distribute":"B1","doubt":"B1","earn":"B1","educate":"B1","elect":"B1","embarrass":"B1",
  "employ":"B1","enable":"B1","encourage":"B1","engage":"B1","ensure":"B1","escape":"B1",
  "establish":"B1","examine":"B1","exist":"B1","expand":"B1","expect":"B1","experience":"B1",
  "experiment":"B1","explore":"B1","extend":"B1","familiar":"B1","fear":"B1","feed":"B1",
  "fight":"B1","figure":"B1","fix":"B1","flow":"B1","focus":"B1","force":"B1","gain":"B1",
  "gather":"B1","generate":"B1","grab":"B1","guarantee":"B1","handle":"B1","hang":"B1",
  "identify":"B1","ignore":"B1","illustrate":"B1","imply":"B1","impress":"B1","influence":"B1",
  "inform":"B1","insist":"B1","install":"B1","intend":"B1","investigate":"B1","judge":"B1",
  "lack":"B1","launch":"B1","link":"B1","locate":"B1","maintain":"B1","manufacture":"B1",
  "match":"B1","mix":"B1","monitor":"B1","negotiate":"B1","observe":"B1","obtain":"B1",
  "occur":"B1","operate":"B1","organize":"B1","overcome":"B1","participate":"B1",
  "permit":"B1","persuade":"B1","possess":"B1","predict":"B1","preserve":"B1","pretend":"B1",
  "proceed":"B1","process":"B1","promote":"B1","propose":"B1","protest":"B1","publish":"B1",
  "purchase":"B1","pursue":"B1","qualify":"B1","range":"B1","react":"B1","recover":"B1",
  "reform":"B1","regard":"B1","register":"B1","regret":"B1","reject":"B1","release":"B1",
  "rely":"B1","remark":"B1","remind":"B1","request":"B1","research":"B1","resist":"B1",
  "resolve":"B1","respond":"B1","restore":"B1","restrict":"B1","retain":"B1","retire":"B1",
  "risk":"B1","ruin":"B1","satisfy":"B1","secure":"B1","seek":"B1","settle":"B1",
  "shelter":"B1","shift":"B1","signal":"B1","slight":"B1","spread":"B1","struggle":"B1",
  "submit":"B1","sue":"B1","suit":"B1","surround":"B1","suspect":"B1","switch":"B1",
  "tackle":"B1","target":"B1","tend":"B1","threaten":"B1","tolerate":"B1","track":"B1",
  "transform":"B1","translate":"B1","transport":"B1","trap":"B1","undergo":"B1",
  "undertake":"B1","urge":"B1","value":"B1","vary":"B1","volunteer":"B1","vote":"B1",
  "warn":"B1","waste":"B1","welcome":"B1","witness":"B1","wrap":"B1",
  // B2
  "abandon":"B2","abolish":"B2","absorb":"B2","abuse":"B2","accelerate":"B2",
  "accompany":"B2","accomplish":"B2","accumulate":"B2","accuse":"B2","acknowledge":"B2",
  "address":"B2","advocate":"B2","allocate":"B2","alter":"B2","analyze":"B2",
  "anticipate":"B2","appreciate":"B2","assess":"B2","assign":"B2","associate":"B2",
  "assure":"B2","authorize":"B2","boom":"B2","capture":"B2","challenge":"B2",
  "characterize":"B2","clarify":"B2","classify":"B2","collapse":"B2","commission":"B2",
  "compensate":"B2","compose":"B2","comprise":"B2","concentrate":"B2","conclude":"B2",
  "conduct":"B2","confine":"B2","confront":"B2","consent":"B2","conserve":"B2",
  "consolidate":"B2","constitute":"B2","construct":"B2","consume":"B2","contradict":"B2",
  "contribute":"B2","convert":"B2","convey":"B2","coordinate":"B2","correspond":"B2",
  "cultivate":"B2","debate":"B2","decorate":"B2","dedicate":"B2","demonstrate":"B2",
  "deny":"B2","depict":"B2","derive":"B2","detect":"B2","devote":"B2","diminish":"B2",
  "discriminate":"B2","dismiss":"B2","dispose":"B2","dispute":"B2","dissolve":"B2",
  "distort":"B2","dominate":"B2","donate":"B2","draft":"B2","eliminate":"B2","embrace":"B2",
  "emerge":"B2","emphasize":"B2","encounter":"B2","enforce":"B2","enhance":"B2",
  "enrich":"B2","equip":"B2","erect":"B2","evolve":"B2","exceed":"B2","execute":"B2",
  "exploit":"B2","facilitate":"B2","fade":"B2","flourish":"B2","foster":"B2",
  "fulfill":"B2","fund":"B2","govern":"B2","grant":"B2","grasp":"B2","highlight":"B2",
  "implement":"B2","impose":"B2","incorporate":"B2","indicate":"B2","inhibit":"B2",
  "initiate":"B2","inspect":"B2","integrate":"B2","interact":"B2","interpret":"B2",
  "intervene":"B2","invoke":"B2","isolate":"B2","justify":"B2","legislate":"B2",
  "liberate":"B2","manipulate":"B2","maximize":"B2","minimize":"B2","modify":"B2",
  "motivate":"B2","neutralize":"B2","oppose":"B2","originate":"B2","outline":"B2",
  "perceive":"B2","persist":"B2","portray":"B2","pose":"B2","postpone":"B2",
  "prescribe":"B2","prevail":"B2","prohibit":"B2","prolong":"B2","prosecute":"B2",
  "provoke":"B2","pursue":"B2","rationalize":"B2","rebel":"B2","recommend":"B2",
  "regulate":"B2","reinforce":"B2","render":"B2","reproduce":"B2","resemble":"B2",
  "resign":"B2","restrain":"B2","restructure":"B2","resume":"B2","retreat":"B2",
  "revise":"B2","revive":"B2","sanction":"B2","simplify":"B2","simulate":"B2",
  "specialize":"B2","specify":"B2","stimulate":"B2","strengthen":"B2","substitute":"B2",
  "supplement":"B2","suppress":"B2","sustain":"B2","symbolize":"B2","terminate":"B2",
  "tolerate":"B2","undergo":"B2","undermine":"B2","unify":"B2","utilize":"B2",
  "validate":"B2","violate":"B2","visualize":"B2","withdraw":"B2","witness":"B2",
  // C1
  "abstract":"C1","accommodate":"C1","adhere":"C1","administer":"C1","aggregate":"C1",
  "alienate":"C1","alleviate":"C1","allocate":"C1","amend":"C1","amplify":"C1",
  "antagonize":"C1","articulate":"C1","ascertain":"C1","assimilate":"C1","audit":"C1",
  "authenticate":"C1","circumvent":"C1","coincide":"C1","commemorate":"C1","compel":"C1",
  "comply":"C1","concede":"C1","conceive":"C1","confer":"C1","conform":"C1",
  "congregate":"C1","conjure":"C1","connote":"C1","consign":"C1","consolidate":"C1",
  "conspire":"C1","contemplate":"C1","contend":"C1","convene":"C1","correlate":"C1",
  "corrupt":"C1","counteract":"C1","culminate":"C1","deduce":"C1","defer":"C1",
  "delegate":"C1","delineate":"C1","demolish":"C1","deploy":"C1","depreciate":"C1",
  "designate":"C1","deter":"C1","deviate":"C1","differentiate":"C1","diffuse":"C1",
  "dilute":"C1","discourse":"C1","discrepancy":"C1","dismantle":"C1","disperse":"C1",
  "displace":"C1","disseminate":"C1","dissipate":"C1","divert":"C1","elaborate":"C1",
  "elevate":"C1","elicit":"C1","embody":"C1","empower":"C1","encompass":"C1",
  "endorse":"C1","enlighten":"C1","entail":"C1","enumerate":"C1","envision":"C1",
  "eradicate":"C1","escalate":"C1","evoke":"C1","exacerbate":"C1","exemplify":"C1",
  "expedite":"C1","expire":"C1","exploit":"C1","fabricate":"C1","fluctuate":"C1",
  "formulate":"C1","foster":"C1","generalize":"C1","hypothesize":"C1","illuminate":"C1",
  "impart":"C1","impede":"C1","inaugurate":"C1","incite":"C1","incorporate":"C1",
  "infiltrate":"C1","infringe":"C1","inhabit":"C1","inhibit":"C1","innovate":"C1",
  "institutionalize":"C1","intensify":"C1","intercept":"C1","interrogate":"C1",
  "intersect":"C1","intimidate":"C1","invigorate":"C1","jeopardize":"C1","legitimize":"C1",
  "mediate":"C1","mobilize":"C1","negate":"C1","obscure":"C1","optimize":"C1",
  "orchestrate":"C1","oversee":"C1","perpetuate":"C1","persevere":"C1","petition":"C1",
  "placate":"C1","polarize":"C1","postulate":"C1","predispose":"C1","presume":"C1",
  "proclaim":"C1","proliferate":"C1","propagate":"C1","provoke":"C1","reconcile":"C1",
  "refine":"C1","reiterate":"C1","relinquish":"C1","replenish":"C1","repress":"C1",
  "rescind":"C1","resonate":"C1","revitalize":"C1","sabotage":"C1","scrutinize":"C1",
  "solidify":"C1","stagnate":"C1","stipulate":"C1","subdue":"C1","substantiate":"C1",
  "supersede":"C1","suppress":"C1","surpass":"C1","synthesize":"C1","undermine":"C1",
  "validate":"C1","vindicate":"C1",
  // C2
  "abrogate":"C2","absolve":"C2","admonish":"C2","annihilate":"C2","arrogate":"C2",
  "assuage":"C2","bifurcate":"C2","circumscribe":"C2","coerce":"C2","cogitate":"C2",
  "commensurate":"C2","conflagration":"C2","conjecture":"C2","corroborate":"C2",
  "decimate":"C2","deleterious":"C2","demagogue":"C2","denigrate":"C2","diatribe":"C2",
  "disenfranchise":"C2","disseminate":"C2","effervescent":"C2","emaciate":"C2",
  "enervate":"C2","ephemeral":"C2","equivocate":"C2","erudite":"C2","eviscerate":"C2",
  "excoriate":"C2","expunge":"C2","extrapolate":"C2","facetious":"C2","germane":"C2",
  "hegemony":"C2","iconoclast":"C2","idiosyncrasy":"C2","implacable":"C2",
  "inchoate":"C2","indefatigable":"C2","inscrutable":"C2","juxtapose":"C2",
  "laconic":"C2","magnanimous":"C2","malfeasance":"C2","mendacious":"C2","misanthrope":"C2",
  "nefarious":"C2","obfuscate":"C2","obsequious":"C2","opprobrium":"C2","panacea":"C2",
  "parsimonious":"C2","pejorative":"C2","perfunctory":"C2","philistine":"C2",
  "plenipotentiary":"C2","prevaricate":"C2","prognosticate":"C2","propitious":"C2",
  "pugnacious":"C2","quagmire":"C2","recalcitrant":"C2","recidivism":"C2","sanguine":"C2",
  "sycophant":"C2","tautology":"C2","tempestuous":"C2","ubiquitous":"C2","vacillate":"C2",
  "verisimilitude":"C2","vicissitude":"C2","vociferous":"C2"
};

function getCEFR(word: string): string {
  if (CEFR_MAP[word]) return CEFR_MAP[word];
  // Heuristic fallback
  if (word.length <= 3) return "A1";
  if (word.length <= 5) return "A2";
  if (word.length <= 7) return "B1";
  if (word.length <= 9) return "B2";
  if (word.length <= 11) return "C1";
  return "C2";
}

// ── Main handler ──
serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    // Init Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1) Fetch session — transcript is stored in transcript_text column
    const { data: session, error: sessErr } = await sb
      .from("sessions")
      .select("id, user_id, transcript_text, language_pair, words_count")
      .eq("id", session_id)
      .single();

    if (sessErr || !session) throw new Error("Session not found");
    if (!session.transcript_text) throw new Error("No transcript");

    // 2) Process transcript
    const tokens = tokenize(session.transcript_text);
    const mattr = computeMATTR(tokens);

    // CEFR breakdown
    const cefrCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    const seenByLevel: Record<string, Set<string>> = { A1: new Set(), A2: new Set(), B1: new Set(), B2: new Set(), C1: new Set(), C2: new Set() };
    for (const t of tokens) {
      const lvl = getCEFR(t);
      cefrCounts[lvl as keyof typeof cefrCounts]++;
      seenByLevel[lvl].add(t);
    }

    // 3) Update session with analytics (columns added by migration)
    try {
      await sb.from("sessions").update({
        mattr_score: mattr,
        cefr_a1_count: cefrCounts.A1,
        cefr_a2_count: cefrCounts.A2,
        cefr_b1_count: cefrCounts.B1,
        cefr_b2_count: cefrCounts.B2,
        cefr_c1_count: cefrCounts.C1,
        cefr_c2_count: cefrCounts.C2,
        vocab_size: Object.values(seenByLevel).reduce((s, set) => s + set.size, 0),
        transcript_processed: true,
      }).eq("id", session_id);
    } catch(_) {
      console.warn("Session analytics columns not yet available — run 20260707 migration first");
    }

    // 4) Upsert user_vocabulary — batch upsert using correct column names
    // user_vocabulary columns: id(UUID), user_id, word, lang, pos, cefr_level, usage_count, last_used, created_at
    // UNIQUE constraint: (user_id, word, lang)
    const now = new Date().toISOString();
    const vocabRows: any[] = [];
    const processed = new Set<string>();
    for (const t of tokens) {
      if (processed.has(t)) continue;
      processed.add(t);
      vocabRows.push({
        user_id: session.user_id,
        word: t,
        lang: "en",
        cefr_level: getCEFR(t),
        usage_count: 1,
        last_used: now,
      });
    }

    // Batch upsert in chunks of 100
    for (let i = 0; i < vocabRows.length; i += 100) {
      const chunk = vocabRows.slice(i, i + 100);
      // Upsert: on conflict (user_id, word, lang), increment usage_count
      const { error: upsertErr } = await sb.from("user_vocabulary").upsert(chunk, {
        onConflict: "user_id, word, lang",
        ignoreDuplicates: false,
      });
      if (upsertErr) console.warn("vocab upsert chunk error:", upsertErr.message);
    }

    // For existing words that weren't newly inserted, bump usage_count + last_used
    // Do this via individual updates since the RPC doesn't exist
    const wordList = vocabRows.map(r => r.word);
    if (wordList.length > 0) {
      // Update in batches to avoid too-large queries
      for (let i = 0; i < wordList.length; i += 50) {
        const batch = wordList.slice(i, i + 50);
        try {
          await sb.from("user_vocabulary")
            .update({ last_used: now })
            .eq("user_id", session.user_id)
            .eq("lang", "en")
            .in("word", batch);
          // Increment usage_count via raw SQL since Supabase JS doesn't support increment well
          await sb.rpc("increment_vocab_usage", {
            p_user_id: session.user_id,
            p_lang: "en",
            p_words: batch,
          }).catch(() => {
            // RPC may not exist — non-critical, vocab count will catch up next session
            console.warn("increment_vocab_usage RPC not available — skipping usage_count bump");
          });
        } catch(_) { /* non-critical */ }
      }
    }

    // 5) Update user_analytics_snapshot (create table if missing — handled by migration)
    let prevSessions = 0, prevTokens = 0, prevMATTR = 0;
    try {
      const { data: existingSnap } = await sb
        .from("user_analytics_snapshot")
        .select("total_sessions, total_tokens, mattr_avg")
        .eq("user_id", session.user_id)
        .single();
      prevSessions = existingSnap?.total_sessions || 0;
      prevTokens = existingSnap?.total_tokens || 0;
      prevMATTR = existingSnap?.mattr_avg || 0;
    } catch(_) {
      // Table may not exist yet — first run
    }

    const newTotalSessions = prevSessions + 1;
    const newTotalTokens = prevTokens + tokens.length;
    const newMATTRAvg = prevSessions > 0
      ? Math.round(((prevMATTR * prevSessions + mattr) / newTotalSessions) * 1000) / 1000
      : mattr;

    // Get cumulative CEFR counts from user_vocabulary
    let cumCefr: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    try {
      const { data: vocabStats } = await sb
        .from("user_vocabulary")
        .select("cefr_level")
        .eq("user_id", session.user_id)
        .eq("lang", "en");

      if (vocabStats) {
        for (const row of vocabStats) {
          const lvl = row.cefr_level;
          if (cumCefr[lvl] !== undefined) cumCefr[lvl]++;
        }
      }
    } catch(_) { /* non-critical */ }

    // Upsert snapshot — graceful if table missing
    try {
      await sb.from("user_analytics_snapshot").upsert({
        user_id: session.user_id,
        total_sessions: newTotalSessions,
        total_tokens: newTotalTokens,
        vocab_size: processed.size,
        mattr_avg: newMATTRAvg,
        cefr_a1: cumCefr.A1,
        cefr_a2: cumCefr.A2,
        cefr_b1: cumCefr.B1,
        cefr_b2: cumCefr.B2,
        cefr_c1: cumCefr.C1,
        cefr_c2: cumCefr.C2,
        updated_at: now,
      });
    } catch(_) {
      console.warn("user_analytics_snapshot table not available — skipping");
    }

    return new Response(JSON.stringify({
      success: true,
      mattr,
      tokenCount: tokens.length,
      cefrCounts,
      vocabSize: processed.size,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
