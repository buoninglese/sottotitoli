// js/panoramica/panels/report-ai.js — pnl-report-ai panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-report-ai" style="position:relative">
          <style>
            /* ── AI Reports: Tailwind → Vanilla CSS (rai- prefix) ── */
            #pnl-report-ai .rai-grid{display:grid}
            #pnl-report-ai .rai-grid-cols-12{grid-template-columns:repeat(12,1fr)}
            #pnl-report-ai .rai-grid-cols-1{grid-template-columns:1fr}
            #pnl-report-ai .rai-col-span-12{grid-column:span 12}
            #pnl-report-ai .rai-flex{display:flex}
            #pnl-report-ai .rai-flex-col{flex-direction:column}
            #pnl-report-ai .rai-flex-1{flex:1}
            #pnl-report-ai .rai-items-center{align-items:center}
            #pnl-report-ai .rai-items-start{align-items:flex-start}
            #pnl-report-ai .rai-items-end{align-items:flex-end}
            #pnl-report-ai .rai-justify-center{justify-content:center}
            #pnl-report-ai .rai-justify-between{justify-content:space-between}
            #pnl-report-ai .rai-gap-gutter{gap:24px}
            #pnl-report-ai .rai-gap-xl{gap:32px}
            #pnl-report-ai .rai-gap-md{gap:16px}
            #pnl-report-ai .rai-gap-sm{gap:8px}
            #pnl-report-ai .rai-gap-xs{gap:4px}
            #pnl-report-ai .rai-gap-3{gap:12px}
            #pnl-report-ai .rai-gap-2{gap:8px}
            #pnl-report-ai .rai-space-y-xl > * + * {margin-top:32px}
            #pnl-report-ai .rai-space-y-md > * + * {margin-top:16px}
            #pnl-report-ai .rai-w-8{width:2rem;height:2rem}
            #pnl-report-ai .rai-h-8{height:2rem}
            #pnl-report-ai .rai-w-24{width:6rem}
            #pnl-report-ai .rai-h-24{height:6rem}
            #pnl-report-ai .rai-w-10{width:2.5rem}
            #pnl-report-ai .rai-h-10{height:2.5rem}
            #pnl-report-ai .rai-w-full{width:100%}
            #pnl-report-ai .rai-h-full{height:100%}
            #pnl-report-ai .rai-min-w-70{min-width:70px}
            #pnl-report-ai .rai-p-xl{padding:32px}
            #pnl-report-ai .rai-p-md{padding:16px}
            #pnl-report-ai .rai-p-8{padding:2rem}
            #pnl-report-ai .rai-p-2{padding:.5rem}
            #pnl-report-ai .rai-px-4{padding-left:1rem;padding-right:1rem}
            #pnl-report-ai .rai-py-2{padding-top:.5rem;padding-bottom:.5rem}
            #pnl-report-ai .rai-py-6{padding-top:1.5rem;padding-bottom:1.5rem}
            #pnl-report-ai .rai-px-xl{padding-left:32px;padding-right:32px}
            #pnl-report-ai .rai-pl-3{padding-left:.75rem}
            #pnl-report-ai .rai-mb-lg{margin-bottom:24px}
            #pnl-report-ai .rai-mb-md{margin-bottom:16px}
            #pnl-report-ai .rai-mb-6{margin-bottom:1.5rem}
            #pnl-report-ai .rai-mb-2{margin-bottom:.5rem}
            #pnl-report-ai .rai-mt-lg{margin-top:24px}
            #pnl-report-ai .rai-mt-1{margin-top:.25rem}
            #pnl-report-ai .rai-text-3xl{font-size:1.875rem}
            #pnl-report-ai .rai-text-2xl{font-size:1.5rem}
            #pnl-report-ai .rai-text-5xl{font-size:3rem}
            #pnl-report-ai .rai-text-lg{font-size:1.125rem}
            #pnl-report-ai .rai-text-sm{font-size:.875rem}
            #pnl-report-ai .rai-font-bold{font-weight:700}
            #pnl-report-ai .rai-font-black{font-weight:900}
            #pnl-report-ai .rai-uppercase{text-transform:uppercase}
            #pnl-report-ai .rai-tracking-tight{letter-spacing:-.025em}
            #pnl-report-ai .rai-tracking-widest{letter-spacing:.1em}
            #pnl-report-ai .rai-text-left{text-align:left}
            #pnl-report-ai .rai-text-center{text-align:center}
            #pnl-report-ai .rai-bg-white{background:#fff}
            #pnl-report-ai .rai-text-on-primary{color:#fff}
            #pnl-report-ai .rai-text-success-emerald{color:#10B981}
            #pnl-report-ai .rai-text-warning-amber{color:#F59E0B}
            #pnl-report-ai .rai-border-2{border-width:2px;border-style:solid}
            #pnl-report-ai .rai-border-4{border-width:4px;border-style:solid}
            #pnl-report-ai .rai-border{border-width:1px;border-style:solid}
            #pnl-report-ai .rai-border-l-4{border-left-width:4px;border-left-style:solid}
            #pnl-report-ai .rai-border-primary{border-color:var(--cyan)}
            #pnl-report-ai .rai-border-border-brutal{border-color:var(--line)}
            #pnl-report-ai .rai-border-outline-variant{border-color:var(--line)}
            #pnl-report-ai .rai-border-success-emerald{border-color:#10B981}
            #pnl-report-ai .rai-border-warning-amber{border-color:#F59E0B}
            #pnl-report-ai .rai-rounded-lg{border-radius:.5rem}
            #pnl-report-ai .rai-shadow-md{box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}
            #pnl-report-ai .rai-transition-all{transition:all .2s}
            #pnl-report-ai .rai-transition-transform{transition:transform .2s}
            #pnl-report-ai .rai-duration-700{transition-duration:.7s}
            #pnl-report-ai .rai-opacity-80{opacity:.8}
            #pnl-report-ai .rai-opacity-10{opacity:.1}
            #pnl-report-ai .rai-relative{position:relative}
            #pnl-report-ai .rai-absolute{position:absolute}
            #pnl-report-ai .rai-inset-0{inset:0}
            #pnl-report-ai .rai-z-10{z-index:10}
            #pnl-report-ai .rai-overflow-hidden{overflow:hidden}
            #pnl-report-ai .rai-cursor-pointer{cursor:pointer}
            #pnl-report-ai .rai-block{display:block}
            #pnl-report-ai .rai-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
            /* group-hover */
            #pnl-report-ai .rai-group:hover .rai-group-hover-translate-x-2{transform:translateX(.5rem)}
            /* peer-checked */
            #pnl-report-ai .rai-peer:checked + .rai-peer-checked-bg-primary{background:var(--cyan)!important;color:#fff!important;border-color:var(--cyan)!important}
            #pnl-report-ai .rai-peer:checked + .rai-peer-checked-bg-primary .material-symbols-outlined{color:#fff!important}
            /* active scale */
            #pnl-report-ai .rai-active-scale-98:active{transform:scale(.98)}
            /* gradient shimmer */
            #pnl-report-ai .rai-bg-gradient-shimmer{background-image:linear-gradient(to right,transparent,rgba(255,255,255,.1),transparent)}
            #pnl-report-ai .rai--translate-x-full{transform:translateX(-100%)}
            #pnl-report-ai .rai-translate-x-full{transform:translateX(100%)}
            /* animate bounce */
            #pnl-report-ai .rai-animate-bounce{animation:rai-bounce 1s infinite}
            @keyframes rai-bounce{0%,100%{transform:translateY(0);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:translateY(-25%);animation-timing-function:cubic-bezier(0,0,.2,1)}}
            /* ── Preserved Tailwind classes (with inline style overrides) ── */
            #pnl-report-ai .bg-surface-container-lowest{background:var(--bg)}
            #pnl-report-ai .bg-surface-container-high{background:var(--card)}
            #pnl-report-ai .bg-surface-container-low{background:var(--bg)}
            #pnl-report-ai .bg-secondary-container{background:rgba(6,182,212,.08)}
            #pnl-report-ai .bg-white{background:#fff}
            #pnl-report-ai .bg-primary{background:var(--cyan)}
            #pnl-report-ai .bg-success-emerald{background:#10B981}
            #pnl-report-ai .bg-warning-amber\\/10{background:rgba(245,158,11,.1)}
            #pnl-report-ai .bg-primary\\/10{background:rgba(6,182,212,.1)}
            #pnl-report-ai .text-primary{color:var(--cyan)}
            #pnl-report-ai .text-secondary{color:var(--text-soft)}
            #pnl-report-ai .text-on-primary{color:#fff}
            #pnl-report-ai .text-white{color:#fff}
            #pnl-report-ai .text-success-emerald{color:#10B981}
            #pnl-report-ai .text-warning-amber{color:#F59E0B}
            #pnl-report-ai .text-headline-md{font-size:20px;font-weight:600}
            #pnl-report-ai .text-display-brutal{font-size:30px;font-weight:900;line-height:1.1}
            #pnl-report-ai .text-body-md{font-size:16px;line-height:24px}
            #pnl-report-ai .text-label-mono{font-size:10px;font-weight:700;font-family:'Manrope',sans-serif}
            #pnl-report-ai .text-caption{font-size:12px}
            #pnl-report-ai .font-headline-md{font-weight:600}
            #pnl-report-ai .font-label-mono{font-weight:700;font-family:'Manrope',sans-serif}
            #pnl-report-ai .font-caption{font-size:12px}
            #pnl-report-ai .border-border-brutal{border-color:var(--line)}
            #pnl-report-ai .border-outline-variant{border-color:var(--line)}
            #pnl-report-ai .border-success-emerald{border-color:#10B981}
            #pnl-report-ai .border-warning-amber{border-color:#F59E0B}
            #pnl-report-ai .brutal-shadow{box-shadow:0 4px 0 rgba(0,0,0,.05)}
            #pnl-report-ai .premium-glow{box-shadow:0 0 20px rgba(6,182,212,.15)}
            #pnl-report-ai .bg-gradient-to-r{background-image:linear-gradient(to right,var(--tw-gradient-stops))}
            #pnl-report-ai .from-transparent{--tw-gradient-from:transparent;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,rgba(0,0,0,0))}
            #pnl-report-ai .via-white\\/10{--tw-gradient-stops:var(--tw-gradient-from),rgba(255,255,255,.1),var(--tw-gradient-to,rgba(255,255,255,0))}
            #pnl-report-ai .to-transparent{--tw-gradient-to:transparent}
            /* responsive: md */
            @media(min-width:768px){
              #pnl-report-ai .rai-md-grid-cols-3{grid-template-columns:repeat(3,1fr)}
              #pnl-report-ai .rai-md-flex-row{flex-direction:row}
            }
            /* responsive: lg */
            @media(min-width:1024px){
              #pnl-report-ai .rai-lg-col-span-8{grid-column:span 8}
              #pnl-report-ai .rai-lg-col-span-4{grid-column:span 4}
              #pnl-report-ai .rai-lg-flex-row{flex-direction:row}
              #pnl-report-ai .rai-lg-w-1-3{width:33.333%}
              #pnl-report-ai .rai-lg-w-2-3{width:66.667%}
            }
          </style>
          <section class="panel-head"><h2>Report AI</h2></section>
          <section class="panel-tabs"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" class="tab-link active" data-subtab="rai-crea" data-i18n="rai_create">Crea Report</button><button role="tab" aria-selected="false" class="tab-link" data-subtab="rai-miei" data-i18n="rai_my_reports">I miei Report</button><button role="tab" aria-selected="false" class="tab-link" data-subtab="rai-impostazioni" data-i18n="rai_impostazioni">Impostazioni</button></div></section>

          <!-- ── Crea Report subtab — Brutalist preset grid ── -->
          <div role="tabpanel" class="subtab-pane active" id="sub-rai-crea">
            <!-- Bento Grid Configuration Area -->
            <div class="rai-grid rai-grid-cols-12 rai-gap-gutter" style="gap:24px">
              <!-- Step 1: Source Selection -->
              <section class="rai-col-span-12 rai-lg-col-span-8 bg-surface-container-lowest rai-border-2 border-border-brutal rai-p-xl brutal-shadow" style="background:var(--card);border-color:var(--line);padding:32px">
                <div class="rai-flex rai-items-center rai-gap-sm rai-mb-lg" style="margin-bottom:24px">
                  <div class="rai-w-8 rai-h-8 rai-border-2 border-border-brutal bg-primary text-on-primary rai-flex rai-items-center rai-justify-center rai-font-bold" style="background:var(--cyan);color:#fff;border-color:var(--cyan)">1</div>
                  <h3 class="text-headline-md font-headline-md rai-uppercase rai-tracking-tight" style="font-size:20px;font-weight:600" data-i18n="rai_step1">Select Analysis Preset</h3>
                </div>
                <!-- 9-Preset System: 3x3 Grid with Categories -->
                <div class="rai-space-y-xl">
                  <!-- Grammar Category -->
                  <div>
                    <div class="rai-flex rai-items-center rai-gap-2 rai-mb-md rai-border-l-4 rai-border-primary rai-pl-3" style="margin-bottom:16px;border-left:4px solid var(--cyan);padding-left:12px">
                      <h4 class="text-label-mono rai-font-bold rai-uppercase text-secondary rai-tracking-widest" style="font-size:14px;font-weight:500;color:var(--text-soft)" data-i18n="rai_grammar">Grammar</h4>
                    </div>
                    <div class="rai-grid rai-grid-cols-1 rai-md-grid-cols-3 rai-gap-md" style="gap:16px">
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="10" data-desc="A full structural audit of your grammatical accuracy across all known contexts." data-label="Holistic Scan" data-metrics='["Verb Tense Consistency", "Subject-Verb Agreement", "Clausal Complexity"]' name="reportType" type="radio" value="holistic">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">fact_check</span>
                            <span class="text-label-mono rai-font-bold">10cr</span>
                          </div>
                          <p class="rai-font-bold">Holistic Scan</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">General audit of all grammar used.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="15" data-desc="Linguistic analysis focused on your personal learning trajectory and long-term goals." data-label="Personalized Path" data-metrics='["Trajectory Alignment", "Goal Progress", "Learning Curve Map"]' name="reportType" type="radio" value="personalized">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">trending_up</span>
                            <span class="text-label-mono rai-font-bold">15cr</span>
                          </div>
                          <p class="rai-font-bold">Personalized Path</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Tailored to user trajectory and objectives.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input checked class="rai-peer rai-sr-only" data-cost="12" data-desc="Actionable insights on how to improve your current linguistic ceiling with exercises." data-label="Growth Report" data-metrics='["Specific Exercise Drills", "Error Recurrence", "Next-level Targets"]' name="reportType" type="radio" value="growth">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">auto_graph</span>
                            <span class="text-label-mono rai-font-bold">12cr</span>
                          </div>
                          <p class="rai-font-bold">Growth Report</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Next steps including specific exercises.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <!-- Vocabulary Category -->
                  <div>
                    <div class="rai-flex rai-items-center rai-gap-2 rai-mb-md rai-border-l-4 border-success-emerald rai-pl-3" style="margin-bottom:16px;border-left:4px solid #10B981;padding-left:12px">
                      <h4 class="text-label-mono rai-font-bold rai-uppercase text-secondary rai-tracking-widest" style="font-size:14px;font-weight:500;color:var(--text-soft)" data-i18n="rai_vocabulary">Vocabulary</h4>
                    </div>
                    <div class="rai-grid rai-grid-cols-1 rai-md-grid-cols-3 rai-gap-md" style="gap:16px">
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="20" data-desc="Map your lexicon against the Common European Framework of Reference for Languages." data-label="CEFR Extravaganza" data-metrics='["A1-C2 Lexicon Split", "Rare Word usage", "Academic Coverage"]' name="reportType" type="radio" value="cefr">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">library_books</span>
                            <span class="text-label-mono rai-font-bold">20cr</span>
                          </div>
                          <p class="rai-font-bold">CEFR Extravaganza</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">All-encompassing vocabulary audit.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="15" data-desc="Discover new ways to express ideas based on your current vocabulary strengths." data-label="Vocabulary Explorer" data-metrics='["Synonym Variety", "Collocation Map", "Thematic Clusters"]' name="reportType" type="radio" value="explorer">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">search_insights</span>
                            <span class="text-label-mono rai-font-bold">15cr</span>
                          </div>
                          <p class="rai-font-bold">Vocabulary Explorer</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Personalized builder/explorer report.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="8" data-desc="Generates targeted homework based on the words you've been struggling with most." data-label="Homework Builder" data-metrics='["Word Bank Density", "Retention Forecasting", "Review Cycles"]' name="reportType" type="radio" value="homework">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">edit_note</span>
                            <span class="text-label-mono rai-font-bold">8cr</span>
                          </div>
                          <p class="rai-font-bold">Homework Builder</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Based on selected vocabulary banks.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <!-- Training & Focus Category -->
                  <div>
                    <div class="rai-flex rai-items-center rai-gap-2 rai-mb-md rai-border-l-4 border-warning-amber rai-pl-3" style="margin-bottom:16px;border-left:4px solid #F59E0B;padding-left:12px">
                      <h4 class="text-label-mono rai-font-bold rai-uppercase text-secondary rai-tracking-widest" style="font-size:14px;font-weight:500;color:var(--text-soft)">Training &amp; Focus</h4>
                    </div>
                    <div class="rai-grid rai-grid-cols-1 rai-md-grid-cols-3 rai-gap-md" style="gap:16px">
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="25" data-desc="Simulates Cambridge-style speaking examination parameters for a score estimate." data-label="Cambridge Speaking" data-metrics='["Interactive Communication", "Discourse Mgmt", "Pronunciation"]' name="reportType" type="radio" value="cambridge">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">co_present</span>
                            <span class="text-label-mono rai-font-bold">25cr</span>
                          </div>
                          <p class="rai-font-bold">Cambridge Speaking</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Exam trainer and simulation report.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="18" data-desc="High-resolution mapping of phonemic accuracy, speech rate, and intonation." data-label="Speech Profile" data-metrics='["Prosody Analysis", "Fluency Markers", "Phoneme Accuracy"]' name="reportType" type="radio" value="speech">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">record_voice_over</span>
                            <span class="text-label-mono rai-font-bold">18cr</span>
                          </div>
                          <p class="rai-font-bold">Speech Profile</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Deep metrics on pronunciation and flow.</p>
                        </div>
                      </label>
                      <label class="rai-relative rai-cursor-pointer rai-group">
                        <input class="rai-peer rai-sr-only" data-cost="10" data-desc="Practice sessions designed around your specific identified linguistic weaknesses." data-label="Objective Drills" data-metrics='["Repeat Failure Points", "Isolation Efficiency", "Speed Drills"]' name="reportType" type="radio" value="drills">
                        <div class="rai-h-full rai-p-md rai-border-2 border-border-brutal bg-white rai-peer-checked-bg-primary rai-transition-all" style="padding:16px;border-color:var(--line);background:var(--card);transition:all .2s">
                          <div class="rai-flex rai-justify-between rai-items-start rai-mb-2">
                            <span class="material-symbols-outlined">fitness_center</span>
                            <span class="text-label-mono rai-font-bold">10cr</span>
                          </div>
                          <p class="rai-font-bold">Objective Drills</p>
                          <p class="text-caption rai-opacity-80 rai-mt-1" style="font-size:12px">Focused drills on specific goals.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Right Column: Source & Engine -->
              <section class="rai-col-span-12 rai-lg-col-span-4 rai-flex rai-flex-col rai-gap-gutter" style="gap:24px">
                <!-- Source Data Card -->
                <div class="bg-surface-container-high rai-p-xl rai-border-2 border-border-brutal brutal-shadow" style="background:var(--card);border-color:var(--line);padding:32px">
                  <div class="rai-flex rai-items-center rai-gap-sm rai-mb-lg" style="margin-bottom:24px">
                    <div class="rai-w-8 rai-h-8 rai-border-2 border-border-brutal bg-primary text-on-primary rai-flex rai-items-center rai-justify-center rai-font-bold" style="background:var(--cyan);color:#fff;border-color:var(--cyan)">2</div>
                    <h3 class="text-headline-md font-headline-md rai-uppercase rai-tracking-tight" style="font-size:20px;font-weight:600" data-i18n="rai_step2">Source Data</h3>
                  </div>
                  <div class="rai-space-y-md">
                    <button class="rai-w-full rai-p-md bg-secondary-container rai-border-2 rai-border-primary rai-flex rai-gap-md rai-items-center rai-cursor-pointer" id="openTranscriptPicker" style="padding:16px;background:rgba(6,182,212,.08);border-color:var(--cyan);text-align:left;font-family:inherit">
                      <span class="material-symbols-outlined text-primary" style="color:var(--cyan)">checklist</span>
                      <div>
                        <p class="rai-font-bold" style="color:var(--text)">Choose Transcripts</p>
                        <p class="text-caption font-caption text-secondary" style="font-size:12px;color:var(--text-soft)" id="transcriptSelectionLabel">Multi-select specific sessions</p>
                      </div>
                    </button>
                    <p style="font-size:10px;color:var(--text-soft);font-style:italic;padding:0 8px">Choose transcripts from your history to analyze. We recommend selecting at least 3 sessions for accurate trending.</p>
                  </div>
                </div>
                <!-- Engine Selection Card -->
                <div class="bg-surface-container-high rai-p-xl rai-border-2 border-border-brutal brutal-shadow rai-flex-1" style="background:var(--card);border-color:var(--line);padding:32px">
                  <div class="rai-flex rai-items-center rai-gap-sm rai-mb-lg" style="margin-bottom:24px">
                    <div class="rai-w-8 rai-h-8 rai-border-2 border-border-brutal bg-primary text-on-primary rai-flex rai-items-center rai-justify-center rai-font-bold" style="background:var(--cyan);color:#fff;border-color:var(--cyan)">3</div>
                    <h3 class="text-headline-md font-headline-md rai-uppercase rai-tracking-tight" style="font-size:20px;font-weight:600" data-i18n="rai_step3">Analysis Engine</h3>
                  </div>
                  <div class="rai-space-y-md">
                    <label class="rai-p-md bg-surface-container-lowest rai-border border-outline-variant rai-flex rai-gap-md rai-items-center rai-cursor-pointer" style="padding:16px;background:var(--bg);border-color:var(--line)">
                      <input checked class="rai-mt-1" name="engine" type="radio" value="0" style="flex-shrink:0">
                      <div>
                        <p class="rai-font-bold" style="color:var(--text)" data-i18n="rai_standard">Standard Synthesis</p>
                        <p class="text-caption font-caption text-secondary" style="font-size:12px;color:var(--text-soft)">Optimized for speed and pattern detection.</p>
                      </div>
                    </label>
                    <label class="rai-p-md bg-surface-container-lowest rai-border border-outline-variant rai-flex rai-gap-md rai-items-center rai-cursor-pointer" style="padding:16px;background:var(--bg);border-color:var(--line)">
                      <input class="rai-mt-1" name="engine" type="radio" value="5" style="flex-shrink:0">
                      <div>
                        <div class="rai-flex rai-items-center rai-gap-xs">
                          <p class="rai-font-bold" style="color:var(--text)" data-i18n="rai_neural">Neural Deep Dive</p>
                          <span style="font-size:10px;background:var(--cyan);color:#fff;padding:0 4px;font-weight:500" data-i18n="rai_premium_badge">PREMIUM (+5)</span>
                        </div>
                        <p class="text-caption font-caption text-secondary" style="font-size:12px;color:var(--text-soft)">Advanced structural mapping and nuances.</p>
                      </div>
                    </label>
                  </div>
                </div>
                <!-- Refined Generate Button -->
                <button class="bg-primary text-on-primary rai-border-2 border-border-brutal rai-py-6 rai-px-xl rai-flex rai-items-center rai-justify-between rai-group rai-relative rai-overflow-hidden premium-glow rai-transition-all rai-active-scale-98 rai-w-full" id="generateBtn" style="background:var(--cyan);color:#fff;border-color:var(--cyan);padding:24px 32px;font-family:Inter,sans-serif;cursor:pointer">
                  <div class="rai-flex rai-flex-col rai-items-start rai-text-left rai-relative rai-z-10">
                    <span class="text-label-mono font-label-mono" style="font-size:10px;opacity:.8;text-transform:uppercase;letter-spacing:.2em;margin-bottom:4px;font-family:'Manrope',sans-serif">Confirm Configuration</span>
                    <span class="rai-text-2xl rai-font-black rai-tracking-tight rai-flex rai-items-center rai-gap-3" style="font-size:24px;font-weight:900">
                      START ANALYSIS
                      <span class="material-symbols-outlined rai-text-2xl rai-group-hover-translate-x-2 rai-transition-transform" style="font-size:24px;transition:transform .2s">arrow_forward</span>
                    </span>
                  </div>
                  <div class="bg-white text-primary rai-px-4 rai-py-2 rai-border-2 border-border-brutal rai-text-lg rai-font-black rai-relative rai-z-10 brutal-shadow rai-flex rai-items-center rai-justify-center rai-min-w-70" id="btnPrice" style="background:#fff;color:var(--cyan);padding:8px 16px;border-color:var(--cyan);font-size:18px;font-weight:900;min-width:70px">
                    17 CR
                  </div>
                  <div class="rai-absolute rai-inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rai--translate-x-full rai-translate-x-full rai-transition-transform rai-duration-700"></div>
                </button>
              </section>

              <!-- Analysis Methodology (Dynamic Section) -->
              <section class="rai-col-span-12 bg-white rai-border-2 border-border-brutal rai-p-xl rai-overflow-hidden rai-relative" id="methodologySection" style="background:var(--card);border-color:var(--line);padding:32px">
                <div class="rai-flex rai-flex-col rai-lg-flex-row rai-gap-xl rai-items-start" style="gap:32px">
                  <div class="rai-lg-w-1/3">
                    <h3 class="text-display-brutal rai-text-3xl rai-mb-md rai-uppercase" id="selectedTitle" style="font-size:30px;font-weight:900;line-height:1.1;margin-bottom:16px">Growth Report</h3>
                    <p class="text-body-md text-secondary" id="selectedDescription" style="font-size:16px;line-height:24px;color:var(--text-soft)">Actionable insights on how to improve your current linguistic ceiling with exercises.</p>
                    <div class="rai-mt-lg" style="margin-top:24px">
                      <p class="text-label-mono rai-font-bold rai-uppercase" style="font-size:10px;font-weight:700;color:var(--cyan);margin-bottom:16px;letter-spacing:-0.02em">Primary Metrics Captured:</p>
                      <ul class="rai-space-y-md" id="metricsList" style="list-style:none;padding:0">
                        <li class="rai-flex rai-gap-sm rai-items-center" style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
                          <span class="material-symbols-outlined text-success-emerald" style="font-size:20px;color:#10B981">check_circle</span>
                          <span class="text-body-md" style="font-size:16px">Specific Exercise Drills</span>
                        </li>
                        <li class="rai-flex rai-gap-sm rai-items-center" style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
                          <span class="material-symbols-outlined text-success-emerald" style="font-size:20px;color:#10B981">check_circle</span>
                          <span class="text-body-md" style="font-size:16px">Error Recurrence</span>
                        </li>
                        <li class="rai-flex rai-gap-sm rai-items-center" style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
                          <span class="material-symbols-outlined text-success-emerald" style="font-size:20px;color:#10B981">check_circle</span>
                          <span class="text-body-md" style="font-size:16px">Next-level Targets</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div class="rai-lg-w-2/3 rai-w-full rai-relative rai-border-2 border-border-brutal bg-surface-container-low rai-p-md rai-overflow-hidden brutal-shadow" style="height:320px;border-color:var(--line);background:var(--bg);padding:16px">
                    <div class="rai-absolute rai-inset-0 rai-p-8 rai-flex rai-items-end rai-justify-between rai-gap-3 rai-opacity-10" style="padding:32px">
                      <div class="rai-flex-1 bg-primary rai-h-24" style="background:var(--cyan)"></div>
                      <div class="rai-flex-1 bg-primary rai-h-48" style="background:var(--cyan)"></div>
                      <div class="rai-flex-1 bg-primary rai-h-32" style="background:var(--cyan)"></div>
                      <div class="rai-flex-1 bg-primary rai-h-56" style="background:var(--cyan)"></div>
                      <div class="rai-flex-1 bg-primary rai-h-40" style="background:var(--cyan)"></div>
                      <div class="rai-flex-1 bg-primary rai-h-64" style="background:var(--cyan)"></div>
                    </div>
                    <div class="rai-relative rai-z-10 rai-h-full rai-flex rai-flex-col rai-justify-center rai-items-center rai-text-center">
                      <div class="rai-relative rai-mb-6" style="margin-bottom:24px">
                        <div class="rai-w-24 rai-h-24 bg-white rai-border-4 border-border-brutal rai-flex rai-items-center rai-justify-center brutal-shadow" style="width:96px;height:96px;background:var(--card);border-color:var(--line)">
                          <span class="material-symbols-outlined rai-text-5xl text-primary" id="selectedIcon" style="font-size:48px;color:var(--cyan)">auto_graph</span>
                        </div>
                        <div class="rai-absolute rai--top-3 rai--right-3 rai-w-10 rai-h-10 bg-success-emerald text-white rai-flex rai-items-center rai-justify-center rai-animate-bounce rai-border-4 border-border-brutal" style="width:40px;height:40px;background:#10B981;color:#fff;top:-12px;right:-12px;border-color:#10B981">
                          <span class="material-symbols-outlined">offline_bolt</span>
                        </div>
                      </div>
                      <h4 class="rai-text-2xl rai-font-black rai-uppercase rai-tracking-tight" style="font-size:24px;font-weight:900;color:var(--text)">Engine Prepared</h4>
                      <p style="font-size:14px;color:var(--text-soft);margin-top:8px;max-width:384px;font-family:'Manrope',sans-serif">Configuring synthesis weights for <span id="spanSelected" style="font-family:'Manrope',sans-serif">Growth Report</span>...</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Quick Tips -->
              <div class="rai-col-span-12 rai-flex rai-flex-col rai-md-flex-row rai-gap-gutter" style="gap:24px">
                <div class="rai-flex-1 rai-p-md bg-white rai-border-2 border-border-brutal rai-flex rai-gap-md rai-items-center brutal-shadow" style="padding:16px;background:var(--card);border-color:var(--line)">
                  <span class="material-symbols-outlined text-warning-amber rai-p-2 bg-warning-amber/10 rai-border-2 border-warning-amber" style="padding:8px;color:#F59E0B;background:rgba(245,158,11,.1);border-color:#F59E0B">info</span>
                  <div>
                    <p class="rai-font-bold rai-text-sm">Credits Info</p>
                    <p class="text-caption text-secondary" style="font-size:12px;color:var(--text-soft)">Credits are deducted only upon successful report generation.</p>
                  </div>
                </div>
                <div class="rai-flex-1 rai-p-md bg-white rai-border-2 border-border-brutal rai-flex rai-gap-md rai-items-center brutal-shadow" style="padding:16px;background:var(--card);border-color:var(--line)">
                  <span class="material-symbols-outlined text-primary rai-p-2 bg-primary/10 rai-border-2 rai-border-primary" style="padding:8px;color:var(--cyan);background:rgba(6,182,212,.1);border-color:var(--cyan)">speed</span>
                  <div>
                    <p class="rai-font-bold rai-text-sm">Generation Time</p>
                    <p class="text-caption text-secondary" style="font-size:12px;color:var(--text-soft)">Deep Dive engines may take up to 45 seconds longer.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── I miei Report subtab — Brutalist table redesign ── -->
          <div role="tabpanel" class="subtab-pane" id="sub-rai-miei">
            <!-- Action Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px">
              <div>
                <h3 style="font-size:20px;font-weight:600;margin:0" data-i18n="rai_recent">Recent Generations</h3>
                <p style="font-size:14px;color:var(--text-soft);margin:4px 0 0">AI analysis based on your recent sessions.</p>
              </div>
              <button style="display:flex;align-items:center;gap:8px;padding:8px 24px;background:var(--cyan);color:#fff;border:none;border-radius:8px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;font-size:14px;box-shadow:6px 6px 0 rgba(0,0,0,.15)" onclick="document.querySelector('[data-subtab=rai-crea]').click()">
                <span class="material-symbols-outlined" style="font-size:18px">add</span>
                Generate New Report
              </button>
            </div>

            <!-- Reports Table -->
            <div id="raiMieiList" style="background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)">
              <div style="overflow-x:auto">
                <table style="width:100%;text-align:left;border-collapse:collapse;font-size:14px">
                  <thead>
                    <tr style="background:var(--bg);border-bottom:1px solid var(--line)">
                      <th style="padding:14px 24px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em" data-i18n="rai_col_name">Report Name</th>
                      <th style="padding:14px 24px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Generated</th>
                      <th style="padding:14px 24px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Status</th>
                      <th style="padding:14px 24px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="raiReportsTbody">
                    <tr><td colspan="4" style="text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px">Loading reports…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination placeholder -->
            <div id="raiPagination" style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:20px"></div>

            <!-- Stats Cards -->
            <div class="rai-stat-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:32px" id="raiStatsRow">
              <div style="background:var(--card);padding:24px;border-radius:12px;border:1px solid var(--line);display:flex;align-items:center;gap:16px">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(6,182,212,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <span class="material-symbols-outlined" style="color:var(--cyan)">history_edu</span>
                </div>
                <div>
                  <p style="font-family:'Manrope',sans-serif;font-size:11px;color:var(--text-soft);text-transform:uppercase;margin:0">Total Reports</p>
                  <p style="font-size:20px;font-weight:700;margin:2px 0 0" id="raiStatTotal">—</p>
                </div>
              </div>
              <div style="background:var(--card);padding:24px;border-radius:12px;border:1px solid var(--line);display:flex;align-items:center;gap:16px">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <span class="material-symbols-outlined" style="color:#10B981">check_circle</span>
                </div>
                <div>
                  <p style="font-family:'Manrope',sans-serif;font-size:11px;color:var(--text-soft);text-transform:uppercase;margin:0">Completed</p>
                  <p style="font-size:20px;font-weight:700;margin:2px 0 0" id="raiStatCompleted">—</p>
                </div>
              </div>
              <div style="background:var(--card);padding:24px;border-radius:12px;border:1px solid var(--line);display:flex;align-items:center;gap:16px">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <span class="material-symbols-outlined" style="color:#F59E0B">avg_time</span>
                </div>
                <div>
                  <p style="font-family:'Manrope',sans-serif;font-size:11px;color:var(--text-soft);text-transform:uppercase;margin:0">Avg Score</p>
                  <p style="font-size:20px;font-weight:700;margin:2px 0 0" id="raiStatAvg">—</p>
                </div>
              </div>
            </div>

            <script>
              (function(){
                var tbody = document.getElementById('raiReportsTbody');
                var paginationEl = document.getElementById('raiPagination');
                var REPORTS_PER_PAGE = 10;
                var currentPage = 1;
                var allReports = [];

                function statusBadge(status) {
                  var map = {
                    completed: { label:'Completed', bg:'rgba(16,185,129,.1)', color:'#10B981' },
                    processing: { label:'Processing', bg:'rgba(245,158,11,.1)', color:'#F59E0B', pulse:true },
                    pending: { label:'Pending', bg:'rgba(107,114,128,.1)', color:'var(--text-soft)' },
                    failed: { label:'Failed', bg:'rgba(225,29,72,.1)', color:'#E11D48' }
                  };
                  var s = map[status] || map.pending;
                  var dot = s.pulse ? '<span style="display:inline-block;width:6px;height:6px;background:'+s.color+';border-radius:50%;margin-right:6px;animation:pulse 2s infinite"></span>' : '';
                  return '<span style="display:inline-flex;align-items:center;padding:4px 12px;background:'+s.bg+';color:'+s.color+';font-size:11px;font-weight:700;border-radius:99px;text-transform:uppercase;font-family:\\'Manrope\\',sans-serif">'+dot+s.label+'</span>';
                }

                function renderTable() {
                  if (!allReports.length) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px">No reports yet. <a href="javascript:void(0)" onclick="document.querySelector(\\'[data-subtab=rai-crea]\\').click()" style="color:var(--cyan);text-decoration:underline">Generate your first report</a>.</td></tr>';
                    paginationEl.innerHTML = '';
                    return;
                  }
                  var start = (currentPage - 1) * REPORTS_PER_PAGE;
                  var page = allReports.slice(start, start + REPORTS_PER_PAGE);
                  tbody.innerHTML = page.map(function(r){
                    var name = r.summary || r.report_type || 'Report ' + (r.id || '').substring(0,8);
                    var date = r.created_at ? new Date(r.created_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short', year:'numeric'}) : '—';
                    var status = r.status || 'completed';
                    var score = r.overall_score ? r.overall_score + '/10' : '';
                    var isDone = status === 'completed';
                    var isFailed = status === 'failed';
                    return '<tr style="border-bottom:1px solid var(--line);transition:background .15s" onmouseover="this.style.background=\\'var(--bg)\\'" onmouseout="this.style.background=\\'\\'">' +
                      '<td style="padding:16px 24px"><div style="font-weight:600">'+name+'</div>'+(score?'<div style="font-size:12px;color:var(--text-soft)">Score: '+score+'</div>':'')+'</td>' +
                      '<td style="padding:16px 24px;color:var(--text-soft);font-size:13px">'+date+'</td>' +
                      '<td style="padding:16px 24px">'+statusBadge(status)+'</td>' +
                      '<td style="padding:16px 24px;text-align:right">' +
                        '<div style="display:flex;justify-content:flex-end;gap:8px">' +
                          (isDone ? '<button title="Download PDF" style="padding:8px;background:none;border:1px solid var(--line);border-radius:8px;cursor:pointer;color:var(--text-soft)" onclick="event.stopPropagation();downloadReportPDF(\\''+(r.id||'')+'\\')"><span class="material-symbols-outlined" style="font-size:18px">download</span></button>' : '<button disabled style="padding:8px;background:none;border:1px solid var(--line);border-radius:8px;opacity:.3;cursor:not-allowed"><span class="material-symbols-outlined" style="font-size:18px">download</span></button>') +
                          (isDone ? '<button style="padding:6px 16px;background:var(--bg);color:var(--cyan);border:1px solid var(--cyan);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\\'Manrope\\',sans-serif" onclick="event.stopPropagation();viewReportDetail(\\''+(r.id||'')+'\\')">View</button>' :
                           isFailed ? '<button style="padding:6px 16px;background:none;color:#E11D48;border:1px solid #E11D48;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\\'Manrope\\',sans-serif" onclick="event.stopPropagation();retryReport(\\''+(r.id||'')+'\\')">Retry</button>' :
                           '<button disabled style="padding:6px 16px;background:none;color:var(--text-soft);border:1px solid var(--line);border-radius:8px;font-size:13px;opacity:.5;cursor:not-allowed;font-family:\\'Manrope\\',sans-serif">Pending</button>') +
                        '</div>' +
                      '</td>' +
                    '</tr>';
                  }).join('');

                  // Pagination
                  var totalPages = Math.ceil(allReports.length / REPORTS_PER_PAGE);
                  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
                  var html = '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft)" '+(currentPage===1?'disabled style="opacity:.3"':'onclick="void(0)"')+'><span class="material-symbols-outlined" style="font-size:16px">chevron_left</span></button>';
                  for (var i=1;i<=totalPages;i++){
                    html += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid '+(i===currentPage?'var(--cyan)':'var(--line)')+';border-radius:8px;background:'+(i===currentPage?'var(--cyan)':'none')+';color:'+(i===currentPage?'#fff':'var(--text)')+';font-size:13px;font-weight:600;cursor:pointer" data-page="'+i+'">'+i+'</button>';
                  }
                  html += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft)" '+(currentPage===totalPages?'disabled style="opacity:.3"':'')+'><span class="material-symbols-outlined" style="font-size:16px">chevron_right</span></button>';
                  paginationEl.innerHTML = html;
                }

                function updateStats() {
                  var total = allReports.length;
                  var completed = allReports.filter(function(r){ return r.status === 'completed'; }).length;
                  var scores = allReports.filter(function(r){ return r.overall_score; }).map(function(r){ return r.overall_score; });
                  var avg = scores.length ? (scores.reduce(function(a,b){return a+b;},0)/scores.length).toFixed(1) : '—';
                  document.getElementById('raiStatTotal').textContent = total;
                  document.getElementById('raiStatCompleted').textContent = completed;
                  document.getElementById('raiStatAvg').textContent = avg !== '—' ? avg + '/10' : '—';
                }

                function loadReports() {
                  if (window.reports && window.reports.length) {
                    allReports = window.reports;
                  }
                  // Also try SottotitoliData
                  if (window.SottotitoliData && window.SottotitoliData.getAIReports) {
                    window.SottotitoliData.getAIReports().then(function(data){
                      allReports = data || [];
                      updateStats();
                      renderTable();
                    }).catch(function(){
                      updateStats();
                      renderTable();
                    });
                  } else {
                    updateStats();
                    renderTable();
                  }
                }

                // Pagination click delegation
                paginationEl.addEventListener('click', function(e){
                  var btn = e.target.closest('button');
                  if (!btn || btn.disabled) return;
                  var page = parseInt(btn.getAttribute('data-page'));
                  if (page) { currentPage = page; renderTable(); return; }
                  var icon = btn.querySelector('.material-symbols-outlined');
                  if (icon && icon.textContent === 'chevron_left') { if (currentPage>1) { currentPage--; renderTable(); } }
                  if (icon && icon.textContent === 'chevron_right') { var tp=Math.ceil(allReports.length/REPORTS_PER_PAGE); if (currentPage<tp) { currentPage++; renderTable(); } }
                });

                // View report detail — opens a modal with the full report
                window.viewReportDetail = function(id) {
                  var report = allReports.find(function(r){ return r.id == id; });
                  if (!report) { alert('Report non trovato.'); return; }
                  var summary = report.summary || report.summary_text || 'Nessun contenuto disponibile.';
                  var score = report.overall_score || report.confidence || 'N/A';
                  var date = report.created_at ? new Date(report.created_at).toLocaleString('it-IT') : '—';
                  var status = report.status || 'completed';
                  var content = '<div style="font-family:Inter,sans-serif;max-height:70vh;overflow-y:auto;padding:8px">' +
                    '<p style="font-size:12px;color:var(--text-dim);margin:0 0 4px">Report ID: ' + id + ' · ' + date + '</p>' +
                    '<p style="font-size:12px;color:var(--text-dim);margin:0 0 16px">Status: ' + status + ' · Score: ' + score + '</p>' +
                    '<div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:var(--text);background:var(--bg);padding:16px;border-radius:12px;border:1px solid var(--line)">' + escapeHtml(summary) + '</div>' +
                  '</div>';
                  showModal('Report Detail', content);
                };
                window.retryReport = function(id) {
                  if (!confirm('Riprova questo report? I crediti verranno dedotti nuovamente.')) return;
                  var sb = window.sottotitoliSupabase;
                  if (!sb) return;
                  sb.auth.getSession().then(async function(r){
                    if (!r.data?.session) return;
                    var uid = r.data.session.user.id;
                    // Reset the request status to queued
                    await sb.from('ai_report_requests').update({ status: 'queued' }).eq('id', id).eq('user_id', uid);
                    // Delete the old report
                    await sb.from('session_ai_reports').delete().eq('request_id', id);
                    showToastMsg('🔄 Report re-queued. Controlla tra poco.');
                    loadReports();
                  }).catch(function(e){ console.warn('retryReport:', e); });
                };

                // ── Simple modal helper (if not already defined) ──
                window.showModal = function(title, content) {
                  var existing = document.getElementById('raiDetailModal');
                  if (existing) existing.remove();
                  var modal = document.createElement('div');
                  modal.id = 'raiDetailModal';
                  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px';
                  modal.innerHTML = '<div style="background:var(--card);border:2px solid var(--line);border-radius:20px;padding:28px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.4)">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
                      '<h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text)">' + title + '</h3>' +
                      '<button onclick="this.closest(\\'#raiDetailModal\\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-dim);padding:4px 8px">&times;</button>' +
                    '</div>' +
                    content +
                  '</div>';
                  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
                  document.body.appendChild(modal);
                };

                function escapeHtml(str) {
                  if (!str) return '';
                  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                }

                // ── PDF Download ──
                window.downloadReportPDF = function(id) {
                  var report = allReports.find(function(r){ return r.id == id; });
                  if (!report) { alert('Report non trovato.'); return; }
                  var summary = report.summary || report.summary_text || '';
                  var score = report.overall_score || '';
                  var date = report.created_at ? new Date(report.created_at).toLocaleDateString('it-IT') : '';
                  // Build a simple HTML doc and trigger print-to-PDF
                  var w = window.open('', '_blank', 'width=800,height=600');
                  if (!w) { alert('⚠️ Popup bloccato. Consenti i popup per scaricare il PDF.'); return; }
                  w.document.write('<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Report AI - Sottotitoli</title>');
                  w.document.write('<style>body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#111;line-height:1.7}' +
                    'h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;color:#666;margin:0 0 20px}.meta{font-size:12px;color:#888;margin-bottom:24px}' +
                    '.content{white-space:pre-wrap;font-size:14px;border-top:1px solid #ddd;padding-top:20px}' +
                    '@media print{body{margin:0;padding:20px}}</style>');
                  w.document.write('</head><body>');
                  w.document.write('<h1>🤖 Report AI</h1><h2>Sottotitoli — Analisi Linguistica</h2>');
                  w.document.write('<div class="meta">Generato: ' + date + (score ? ' · Score: ' + score : '') + ' · ID: ' + id + '</div>');
                  w.document.write('<div class="content">' + escapeHtml(summary) + '</div>');
                  w.document.write('<p style="margin-top:40px;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:12px">Powered by Sottotitoli AI · sottotitoli.ai</p>');
                  w.document.write('</body></html>');
                  w.document.close();
                  setTimeout(function(){ w.print(); }, 500);
                };

                // Load on tab activation
                var observer = new MutationObserver(function(mutations){
                  mutations.forEach(function(m){
                    if (m.target.id === 'sub-rai-miei' && m.target.classList.contains('active')) {
                      loadReports();
                    }
                  });
                });
                var subRaiMiei = document.getElementById('sub-rai-miei');
                if (subRaiMiei) {
                  observer.observe(subRaiMiei, { attributes: true, attributeFilter: ['class'] });
                  // Also reload when renderAIReports() dispatches fresh data
                  subRaiMiei.addEventListener('reports-loaded', function(){ loadReports(); });
                }

                // Initial load
                loadReports();
              })();
            </script>
          </div>

          <!-- ── Impostazioni subtab — Brutalist settings redesign ── -->
          <div role="tabpanel" class="subtab-pane" id="sub-rai-impostazioni">
            <p style="font-size:14px;color:var(--text-soft);margin:0 0 28px;max-width:680px;line-height:1.6">Personalizza i parametri del motore di analisi per ottimizzare la generazione dei tuoi report linguistici.</p>

            <!-- AI Tone -->
            <section style="margin-bottom:36px">
              <h3 style="font-size:20px;font-weight:600;margin:0 0 20px;display:flex;align-items:center;gap:12px">
                <span class="material-symbols-outlined" style="color:var(--cyan)">psychology</span>
                Tono dell'IA
              </h3>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" id="raiToneCards">
                <button class="rai-tone-btn active" data-tone="academic" style="background:var(--card);border:2px solid var(--cyan);border-radius:16px;padding:28px;text-align:left;cursor:pointer;transition:all .2s;font-family:inherit">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                    <span class="material-symbols-outlined" style="color:var(--cyan);font-size:28px">school</span>
                    <span class="rai-dot" style="width:24px;height:24px;border-radius:50%;border:4px solid var(--cyan);display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span></span>
                  </div>
                  <p style="font-weight:700;color:var(--text);margin:0 0 4px">Academic</p>
                  <p style="font-size:12px;color:var(--text-soft);margin:0">Correzioni formali e spiegazioni teoriche approfondite.</p>
                </button>
                <button class="rai-tone-btn" data-tone="professional" style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:28px;text-align:left;cursor:pointer;transition:all .2s;font-family:inherit">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                    <span class="material-symbols-outlined" style="color:var(--text-soft);font-size:28px">work</span>
                    <span class="rai-dot" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center"></span>
                  </div>
                  <p style="font-weight:700;color:var(--text);margin:0 0 4px">Professional</p>
                  <p style="font-size:12px;color:var(--text-soft);margin:0">Linguaggio business e focus sulla chiarezza comunicativa.</p>
                </button>
                <button class="rai-tone-btn" data-tone="casual" style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:28px;text-align:left;cursor:pointer;transition:all .2s;font-family:inherit">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                    <span class="material-symbols-outlined" style="color:var(--text-soft);font-size:28px">coffee</span>
                    <span class="rai-dot" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center"></span>
                  </div>
                  <p style="font-weight:700;color:var(--text);margin:0 0 4px">Casual</p>
                  <p style="font-size:12px;color:var(--text-soft);margin:0">Spiegazioni amichevoli e uso di espressioni idiomatiche.</p>
                </button>
              </div>
            </section>

            <!-- Priority -->
            <section style="margin-bottom:36px">
              <h3 style="font-size:20px;font-weight:600;margin:0 0 20px;display:flex;align-items:center;gap:12px">
                <span class="material-symbols-outlined" style="color:var(--cyan)">target</span>
                Priorità di Correzione
              </h3>
              <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px">
                <div style="display:flex;flex-direction:column;gap:4px" id="raiPriorityList">
                  <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:14px 16px;border-radius:12px;transition:background .15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
                    <input checked class="rai-priority-radio" name="rai-priority" type="radio" value="accuracy" style="accent-color:var(--cyan);width:18px;height:18px">
                    <div>
                      <p style="font-weight:700;color:var(--text);margin:0">Accuracy (Accuratezza)</p>
                      <p style="font-size:13px;color:var(--text-soft);margin:2px 0 0">Focus millimetrico sulla grammatica e la sintassi perfetta.</p>
                    </div>
                  </label>
                  <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:14px 16px;border-radius:12px;transition:background .15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
                    <input class="rai-priority-radio" name="rai-priority" type="radio" value="fluency" style="accent-color:var(--cyan);width:18px;height:18px">
                    <div>
                      <p style="font-weight:700;color:var(--text);margin:0">Fluency (Fluidità)</p>
                      <p style="font-size:13px;color:var(--text-soft);margin:2px 0 0">Focus sul ritmo del parlato e sulla naturalezza dell'esposizione.</p>
                    </div>
                  </label>
                  <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:14px 16px;border-radius:12px;transition:background .15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
                    <input class="rai-priority-radio" name="rai-priority" type="radio" value="vocabulary" style="accent-color:var(--cyan);width:18px;height:18px">
                    <div>
                      <p style="font-weight:700;color:var(--text);margin:0">Vocabulary Expansion (Vocabolario)</p>
                      <p style="font-size:13px;color:var(--text-soft);margin:2px 0 0">Suggerimento di sinonimi e termini più sofisticati o specifici.</p>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            <!-- Language -->
            <section style="margin-bottom:36px">
              <h3 style="font-size:20px;font-weight:600;margin:0 0 20px;display:flex;align-items:center;gap:12px">
                <span class="material-symbols-outlined" style="color:var(--cyan)">language</span>
                Lingua dei Report
              </h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" id="raiLangCards">
                <button class="rai-lang-btn active" data-lang="it" style="background:var(--card);border:2px solid var(--cyan);border-radius:16px;padding:24px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left">
                  <span style="font-size:28px">🇮🇹</span>
                  <div style="flex:1">
                    <p style="font-weight:700;color:var(--cyan);margin:0">Italiano</p>
                    <p style="font-size:12px;color:var(--text-soft);margin:2px 0 0">Ricevi i report in lingua italiana.</p>
                  </div>
                  <span class="rai-dot" style="width:24px;height:24px;border-radius:50%;border:4px solid var(--cyan);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span></span>
                </button>
                <button class="rai-lang-btn" data-lang="en" style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:24px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left">
                  <span style="font-size:28px">🇬🇧</span>
                  <div style="flex:1">
                    <p style="font-weight:700;color:var(--text);margin:0">English</p>
                    <p style="font-size:12px;color:var(--text-soft);margin:2px 0 0">Receive your reports in English.</p>
                  </div>
                  <span class="rai-dot" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0"></span>
                </button>
              </div>
            </section>

            <!-- Save Button -->
            <div style="display:flex;justify-content:flex-end">
              <button id="raiSaveSettings" style="display:flex;align-items:center;gap:8px;padding:12px 28px;background:var(--cyan);color:#fff;border:none;border-radius:99px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;font-size:14px">
                <span class="material-symbols-outlined" style="font-size:18px">save</span>
                Salva Impostazioni
              </button>
            </div>

            <script>
              (function(){
                // ── Tone cards ──
                var toneBtns = document.querySelectorAll('#raiToneCards .rai-tone-btn');
                toneBtns.forEach(function(btn){
                  btn.addEventListener('click', function(){
                    toneBtns.forEach(function(b){
                      b.classList.remove('active');
                      b.style.borderColor = 'var(--line)';
                      var dot = b.querySelector('.rai-dot');
                      if (dot) { dot.style.border = '2px solid var(--line)'; dot.innerHTML = ''; }
                      var icon = b.querySelector('.material-symbols-outlined');
                      if (icon) icon.style.color = 'var(--text-soft)';
                      var label = b.querySelector('p');
                      if (label) label.style.color = 'var(--text)';
                    });
                    this.classList.add('active');
                    this.style.borderColor = 'var(--cyan)';
                    var dot = this.querySelector('.rai-dot');
                    if (dot) { dot.style.border = '4px solid var(--cyan)'; dot.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span>'; }
                    var icon = this.querySelector('.material-symbols-outlined');
                    if (icon) icon.style.color = 'var(--cyan)';
                    var label = this.querySelector('p');
                    if (label) label.style.color = 'var(--cyan)';
                  });
                });

                // ── Language cards ──
                var langBtns = document.querySelectorAll('#raiLangCards .rai-lang-btn');
                langBtns.forEach(function(btn){
                  btn.addEventListener('click', function(){
                    langBtns.forEach(function(b){
                      b.classList.remove('active');
                      b.style.borderColor = 'var(--line)';
                      var dot = b.querySelector('.rai-dot');
                      if (dot) { dot.style.border = '2px solid var(--line)'; dot.innerHTML = ''; }
                      var label = b.querySelector('p');
                      if (label) label.style.color = 'var(--text)';
                    });
                    this.classList.add('active');
                    this.style.borderColor = 'var(--cyan)';
                    var dot = this.querySelector('.rai-dot');
                    if (dot) { dot.style.border = '4px solid var(--cyan)'; dot.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span>'; }
                    var label = this.querySelector('p');
                    if (label) label.style.color = 'var(--cyan)';
                  });
                });

                // ── Save ──
                document.getElementById('raiSaveSettings').addEventListener('click', async function(){
                  var toneBtn = document.querySelector('#raiToneCards .rai-tone-btn.active');
                  var langBtn = document.querySelector('#raiLangCards .rai-lang-btn.active');
                  var priorityRadio = document.querySelector('#raiPriorityList input:checked');
                  var tone = toneBtn ? toneBtn.getAttribute('data-tone') : 'academic';
                  var lang = langBtn ? langBtn.getAttribute('data-lang') : 'it';
                  var priority = priorityRadio ? priorityRadio.value : 'accuracy';

                  // Save to localStorage (instant, works offline)
                  localStorage.setItem('rai-tone', tone);
                  localStorage.setItem('rai-lang', lang);
                  localStorage.setItem('rai-priority', priority);

                  // Save to Supabase user_preferences (persistent across devices)
                  try {
                    if (window.SottotitoliData && window.SottotitoliData.getUserId && window.sottotitoliSupabase) {
                      var uid = await window.SottotitoliData.getUserId();
                      if (uid) {
                        var upsertData = { user_id: uid, rai_tone: tone, rai_lang: lang, rai_priority: priority, updated_at: new Date().toISOString() };
                        var res = await window.sottotitoliSupabase.from('user_preferences').upsert(upsertData, { onConflict: 'user_id' });
                        if (res.error) console.warn('Supabase settings save failed:', res.error.message);
                      }
                    }
                  } catch(e) { console.warn('Supabase settings sync error:', e); }

                  showToastMsg('✅ Impostazioni salvate!');
                });

                // ── Restore saved settings ──
                (function restoreSettings(){
                  var tone = localStorage.getItem('rai-tone') || 'academic';
                  var lang = localStorage.getItem('rai-lang') || 'it';
                  var priority = localStorage.getItem('rai-priority') || 'accuracy';

                  // Tone
                  var toneBtn = document.querySelector('#raiToneCards .rai-tone-btn[data-tone="'+tone+'"]');
                  if (toneBtn) toneBtn.click();

                  // Language
                  var langBtn = document.querySelector('#raiLangCards .rai-lang-btn[data-lang="'+lang+'"]');
                  if (langBtn) langBtn.click();

                  // Priority
                  var priRadio = document.querySelector('#raiPriorityList input[value="'+priority+'"]');
                  if (priRadio) priRadio.checked = true;

                  // Also try to load from Supabase (overrides localStorage if fresher)
                  if (window.SottotitoliData && window.SottotitoliData.getUserId && window.sottotitoliSupabase) {
                    window.SottotitoliData.getUserId().then(function(uid){
                      if (!uid) return;
                      window.sottotitoliSupabase.from('user_preferences').select('rai_tone,rai_lang,rai_priority,updated_at').eq('user_id', uid).maybeSingle().then(function(res){
                        if (res.data && res.data.rai_tone) {
                          // Supabase has data — use it
                          if (res.data.rai_tone !== tone) {
                            localStorage.setItem('rai-tone', res.data.rai_tone);
                            var tb = document.querySelector('#raiToneCards .rai-tone-btn[data-tone="'+res.data.rai_tone+'"]');
                            if (tb) tb.click();
                          }
                          if (res.data.rai_lang !== lang) {
                            localStorage.setItem('rai-lang', res.data.rai_lang);
                            var lb = document.querySelector('#raiLangCards .rai-lang-btn[data-lang="'+res.data.rai_lang+'"]');
                            if (lb) lb.click();
                          }
                          if (res.data.rai_priority && res.data.rai_priority !== priority) {
                            localStorage.setItem('rai-priority', res.data.rai_priority);
                            var pr = document.querySelector('#raiPriorityList input[value="'+res.data.rai_priority+'"]');
                            if (pr) pr.checked = true;
                          }
                        }
                      }).catch(function(){});
                    }).catch(function(){});
                  }
                })();
              })();
            </script>
          </div>

          <!-- ── Success Modal ── -->
          <div class="fixed inset-0 bg-on-background/90 backdrop-blur-md z-[100] hidden flex items-center justify-center p-md" id="loadingOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(25,28,30,.9);z-index:100;align-items:center;justify-content:center;padding:16px">
            <div class="bg-white border-4 border-border-brutal p-xl max-w-md w-full brutal-shadow" style="background:var(--card);border-color:var(--line);padding:32px;max-width:448px">
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 border-8 border-primary border-t-transparent animate-spin mb-lg" style="width:64px;height:64px;border-width:8px;border-color:var(--cyan);border-top-color:transparent;margin-bottom:24px;animation:spin 1s linear infinite"></div>
                <h3 style="font-size:24px;font-weight:900;line-height:1.1;text-transform:uppercase" data-i18n="rai_synthesis_started">Synthesis Initialized</h3>
                <p style="font-size:16px;line-height:24px;color:var(--text-soft);margin-top:16px">Please wait while our linguistic neural net processes your selected transcript history.</p>
                <div class="w-full h-4 bg-surface-container-highest mt-xl border-2 border-border-brutal relative overflow-hidden" style="width:100%;height:16px;background:var(--bg);margin-top:32px;border-color:var(--line)">
                  <div class="absolute inset-0 bg-primary w-1/3" id="loadingBar" style="background:var(--cyan);width:33%;animation:loading 2s ease-in-out infinite"></div>
                </div>
                <button class="mt-xl text-label-mono font-bold uppercase text-secondary hover:text-error transition-colors" id="cancelBtn" style="margin-top:32px;font-size:14px;font-weight:500;color:var(--text-soft);background:none;border:none;cursor:pointer" data-i18n="rai_abort">Abort Analysis</button>
              </div>
            </div>
          </div>

          <script>
            (function(){
              var generateBtn = document.getElementById('generateBtn');
              var loadingOverlay = document.getElementById('loadingOverlay');
              var cancelBtn = document.getElementById('cancelBtn');
              var btnPrice = document.getElementById('btnPrice');
              var selectedTitle = document.getElementById('selectedTitle');
              var selectedDescription = document.getElementById('selectedDescription');
              var metricsList = document.getElementById('metricsList');
              var selectedIcon = document.getElementById('selectedIcon');
              var spanSelected = document.getElementById('spanSelected');

              // Peer-checked radio styling
              var styleEl = document.createElement('style');
              styleEl.textContent = '#pnl-report-ai input[name="reportType"]:checked + div { background: var(--cyan) !important; color: #fff !important; border-color: var(--cyan) !important; }' +
                '#pnl-report-ai input[name="reportType"]:checked + div .material-symbols-outlined { color: #fff !important; }' +
                '#pnl-report-ai input[name="reportType"]:checked + div .text-label-mono { color: rgba(255,255,255,.85) !important; }' +
                '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
                '@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }';
              document.head.appendChild(styleEl);

              var reportRadios = document.querySelectorAll('#pnl-report-ai input[name="reportType"]');
              var engineRadios = document.querySelectorAll('#pnl-report-ai input[name="engine"]');

              function updateView() {
                var selectedPreset;
                reportRadios.forEach(function(r){ if(r.checked) selectedPreset = r; });
                if (!selectedPreset) return;
                var label = selectedPreset.getAttribute('data-label');
                var desc = selectedPreset.getAttribute('data-desc');
                var cost = parseInt(selectedPreset.getAttribute('data-cost'));
                var metrics = JSON.parse(selectedPreset.getAttribute('data-metrics'));
                var iconEl = selectedPreset.parentElement.querySelector('.material-symbols-outlined');
                var icon = iconEl ? iconEl.textContent : 'auto_graph';
                selectedTitle.textContent = label;
                selectedDescription.textContent = desc;
                spanSelected.textContent = label;
                selectedIcon.textContent = icon;
                metricsList.innerHTML = '';
                metrics.forEach(function(m){
                  var li = document.createElement('li');
                  li.className = 'flex gap-sm items-center';
                  li.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:16px';
                  li.innerHTML = '<span class="material-symbols-outlined text-success-emerald" style="font-size:20px;color:#10B981">check_circle</span><span style="font-size:16px;line-height:24px">' + m + '</span>';
                  metricsList.appendChild(li);
                });
                var engineCost = 0;
                engineRadios.forEach(function(r){ if(r.checked) engineCost = parseInt(r.value); });
                btnPrice.textContent = (cost + engineCost) + ' CR';
              }

              reportRadios.forEach(function(r){ r.addEventListener('change', updateView); });
              engineRadios.forEach(function(r){ r.addEventListener('change', updateView); });

              // ═══ Preset → Module mapping (sync with ai_configs preset_pricing) ═══
              var PRESET_MAP = {
                holistic:     { moduleId: 1, moduleKey: '1', credits: 3 },
                personalized: { moduleId: 1, moduleKey: '1', credits: 3 },
                growth:       { moduleId: 1, moduleKey: '1', credits: 3 },
                cefr:         { moduleId: 4, moduleKey: '4', credits: 4 },
                explorer:     { moduleId: 3, moduleKey: '3', credits: 2 },
                homework:     { moduleId: 3, moduleKey: '3', credits: 2 },
                cambridge:    { moduleId: 11, moduleKey: '11', credits: 4 },
                speech:       { moduleId: 4, moduleKey: '4', credits: 4 },
                drills:       { moduleId: 2, moduleKey: '2', credits: 2 }
              };

              generateBtn.addEventListener('click', async function(){
                // ── Validation ──
                var sb = window.sottotitoliSupabase;
                if (!sb) { showToastMsg('⚠️ Effettua il login per generare report.'); return; }
                var r = await sb.auth.getSession();
                if (!r.data?.session) { showToastMsg('⚠️ Sessione scaduta. Rieffettua il login.'); return; }
                var uid = r.data.session.user.id;

                // Get selected preset
                var selectedPreset;
                reportRadios.forEach(function(rd){ if(rd.checked) selectedPreset = rd; });
                if (!selectedPreset) { showToastMsg('⚠️ Seleziona un tipo di analisi.'); return; }
                var presetKey = selectedPreset.value;
                var mapping = PRESET_MAP[presetKey];
                if (!mapping) { showToastMsg('⚠️ Tipo di analisi non riconosciuto.'); return; }

                // Get selected sessions from transcript picker
                var sessionIds = selectedTranscriptIds.slice();
                if (!sessionIds.length) {
                  // Fallback: try to use sessions from the panorama list
                  if (allSessions && allSessions.length) {
                    sessionIds = [allSessions[0].id];
                  }
                }
                if (!sessionIds.length) { showToastMsg('⚠️ Seleziona almeno una sessione da analizzare.'); return; }

                // Get engine (0=standard, 5=neural deep dive)
                var engineCost = 0;
                engineRadios.forEach(function(er){ if(er.checked) engineCost = parseInt(er.value); });
                var totalCredits = mapping.credits + engineCost;

                // ── Credit Check ──
                var balance = 0;
                try {
                  var tokenRes = await sb.rpc('get_token_balance', { p_user_id: uid });
                  if (tokenRes.data !== null && tokenRes.data !== undefined) {
                    balance = tokenRes.data;
                  }
                } catch(e) { console.warn('RPC get_token_balance failed:', e.message); }

                // Fallback to direct query if RPC didn't give us a balance
                if (balance === 0) {
                  try {
                    var tb = await sb.from('user_tokens').select('balance').eq('user_id', uid).single();
                    if (!tb.error && tb.data) balance = tb.data.balance;
                  } catch(e2) { console.warn('Token direct query failed:', e2); }
                }

                if (balance < totalCredits) {
                  showToastMsg('⚠️ Crediti insufficienti. Hai ' + balance + ' crediti, servono ' + totalCredits + '.');
                  if (confirm('Ti servono ' + totalCredits + ' crediti ma ne hai solo ' + balance + '. Vuoi acquistare altri crediti?')) {
                    window.location.href = 'wallet.html';
                  }
                  return;
                }

                // ── Show loading ──
                loadingOverlay.style.display = 'flex';
                generateBtn.disabled = true;

                try {
                  // ── Atomic token deduction ──
                  var deductResult = await sb.rpc('deduct_tokens', {
                    p_user_id: uid,
                    p_amount: totalCredits,
                    p_reference: 'report_' + presetKey + '_' + Date.now()
                  });
                  if (deductResult.error) {
                    console.warn('Deduct error:', deductResult.error);
                    // Fallback: try direct update
                    var upd = await sb.from('user_tokens').update({ balance: balance - totalCredits, updated_at: new Date().toISOString() }).eq('user_id', uid).eq('balance', balance);
                    if (upd.error || !upd.data || upd.data.length === 0) {
                      loadingOverlay.style.display = 'none';
                      generateBtn.disabled = false;
                      showToastMsg('⚠️ Impossibile dedurre i crediti. Riprova.');
                      return;
                    }
                    // Log transaction
                    await sb.from('token_transactions').insert({
                      user_id: uid, amount: -totalCredits, type: 'report_usage',
                      reference: 'report_' + presetKey, balance_after: balance - totalCredits
                    });
                  }

                  // ── Insert request ──
                  var ins = await sb.from('ai_report_requests').insert({
                    user_id: uid,
                    session_ids: sessionIds,
                    module_id: mapping.moduleId,
                    module_key: mapping.moduleKey,
                    scope_type: sessionIds.length > 1 ? 'multi_session' : 'single_session',
                    status: 'queued'
                  });
                  if (ins.error) {
                    console.warn('Insert error:', ins.error.message);
                    loadingOverlay.style.display = 'none';
                    generateBtn.disabled = false;
                    showToastMsg('⚠️ Errore: ' + ins.error.message);
                    return;
                  }
                  var requestId = ins.data && ins.data[0] ? ins.data[0].id : null;

                  // ── Trigger edge function ──
                  try {
                    var token = r.data.session.access_token;
                    await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requestId: requestId })
                    });
                  } catch(efErr) {
                    console.warn('Edge function trigger failed (will be picked up by cron):', efErr);
                  }

                  // ── Poll for completion ──
                  var pollCount = 0;
                  var maxPolls = 30; // 30 × 2s = 60s max
                  var pollInterval = setInterval(async function(){
                    pollCount++;
                    try {
                      var check = await sb.from('session_ai_reports')
                        .select('id,summary,overall_score,status')
                        .eq('user_id', uid)
                        .order('created_at', { ascending: false })
                        .limit(1);
                      if (check.data && check.data.length && check.data[0].status === 'completed') {
                        clearInterval(pollInterval);
                        loadingOverlay.style.display = 'none';
                        generateBtn.disabled = false;
                        var report = check.data[0];
                        showToastMsg('✅ Report completato! Score: ' + (report.overall_score || 'N/A'));
                        // Refresh "I miei Report" tab if visible
                        var mieiPanel = document.getElementById('sub-rai-miei');
                        if (mieiPanel) mieiPanel.dispatchEvent(new Event('reports-loaded'));
                      }
                    } catch(e) {}
                    if (pollCount >= maxPolls) {
                      clearInterval(pollInterval);
                      loadingOverlay.style.display = 'none';
                      generateBtn.disabled = false;
                      showToastMsg('⏳ Report in elaborazione. Controlla "I miei Report" tra poco.');
                    }
                  }, 2000);

                } catch(e) {
                  console.error('Generate report error:', e);
                  loadingOverlay.style.display = 'none';
                  generateBtn.disabled = false;
                  showToastMsg('❌ Errore: ' + (e.message || 'Sconosciuto'));
                }
              });

              cancelBtn.addEventListener('click', function(){
                loadingOverlay.style.display = 'none';
              });

              updateView();

              // ── Transcript Picker ──
              var selectedTranscriptIds = [];
              var allSessions = [];
              var pickerBuilt = false; // Only build DOM once

              function buildTranscriptPickerOnce() {
                var listEl = document.getElementById('transcriptPickerList');
                if (!listEl || pickerBuilt) return;
                if (!allSessions.length) {
                  listEl.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:20px">No sessions found. Record some sessions first.</p>';
                  pickerBuilt = true;
                  return;
                }
                listEl.innerHTML = '';
                allSessions.forEach(function(s){
                  var name = s.name || ('Session ' + new Date(s.started_at).toLocaleDateString('it-IT'));
                  var dateStr = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'}) : '';
                  var checked = selectedTranscriptIds.indexOf(s.id) !== -1;
                  var isFav = s.favorite;
                  var favIcon = isFav ? '★' : '☆';
                  var favColor = isFav ? 'color:#f59e0b' : 'color:var(--text-soft)';
                  var row = document.createElement('label');
                  row.setAttribute('data-sid', s.id);
                  row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid ' + (checked ? 'var(--cyan)' : 'var(--line)') + ';border-radius:12px;cursor:pointer;background:' + (checked ? 'rgba(6,182,212,.06)' : 'var(--bg)') + ';transition:all .15s';
                  row.innerHTML = '<span onclick="event.stopPropagation();trToggleFav(\\'' + s.id + '\\')" style="font-size:16px;cursor:pointer;' + favColor + ';flex-shrink:0" title="Toggle favorite">' + favIcon + '</span>' +
                    '<input type="checkbox" value="' + s.id + '" ' + (checked ? 'checked' : '') + ' style="accent-color:var(--cyan);width:18px;height:18px;cursor:pointer;flex-shrink:0">' +
                    '<span style="flex:1;font-size:14px;font-weight:600;color:var(--text)">' + name + '</span>' +
                    '<span style="font-size:12px;color:var(--text-soft);white-space:nowrap">' + dateStr + '</span>';
                  // Hover effects
                  row.addEventListener('mouseenter', function(){
                    var cb = this.querySelector('input');
                    if (!cb.checked) { this.style.borderColor = 'var(--cyan)'; this.style.background = 'rgba(6,182,212,.04)'; }
                  });
                  row.addEventListener('mouseleave', function(){
                    var cb = this.querySelector('input');
                    if (!cb.checked) { this.style.borderColor = 'var(--line)'; this.style.background = 'var(--bg)'; }
                  });
                  // Checkbox change — toggle inline, no re-render
                  row.querySelector('input').addEventListener('change', function(){
                    var sid = this.value;
                    if (this.checked) {
                      if (selectedTranscriptIds.indexOf(sid) === -1) selectedTranscriptIds.push(sid);
                      row.style.borderColor = 'var(--cyan)';
                      row.style.background = 'rgba(6,182,212,.06)';
                    } else {
                      selectedTranscriptIds = selectedTranscriptIds.filter(function(id){ return id !== sid; });
                      row.style.borderColor = 'var(--line)';
                      row.style.background = 'var(--bg)';
                    }
                    refreshPickerCount();
                  });
                  listEl.appendChild(row);
                });
                pickerBuilt = true;
              }

              function refreshPickerCount() {
                var countEl = document.getElementById('transcriptPickerCount');
                if (countEl) countEl.textContent = selectedTranscriptIds.length + ' selezionati';
                var label = document.getElementById('transcriptSelectionLabel');
                if (label) {
                  if (selectedTranscriptIds.length) {
                    // Show abbreviated session names
                    var names = [];
                    allSessions.forEach(function(s){
                      if (selectedTranscriptIds.indexOf(s.id) !== -1) {
                        var n = s.name || new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short'});
                        names.push(n);
                      }
                    });
                    label.textContent = selectedTranscriptIds.length + ' sessioni: ' + names.join(', ');
                  } else {
                    label.textContent = 'Multi-select specific sessions';
                  }
                }
              }

              // Also update label when modal opens
              function openPicker() {
                var modal = document.getElementById('transcriptPickerModal');
                if (!modal) return;
                modal.style.display = 'flex';
                buildTranscriptPickerOnce();
                refreshPickerCount();
                // Sync checkboxes with selectedTranscriptIds
                var rows = document.querySelectorAll('#transcriptPickerList label[data-sid]');
                rows.forEach(function(row){
                  var sid = row.getAttribute('data-sid');
                  var cb = row.querySelector('input');
                  var isSelected = selectedTranscriptIds.indexOf(sid) !== -1;
                  if (cb) cb.checked = isSelected;
                  row.style.borderColor = isSelected ? 'var(--cyan)' : 'var(--line)';
                  row.style.background = isSelected ? 'rgba(6,182,212,.06)' : 'var(--bg)';
                });
                refreshPickerCount();
              }

              var openBtn = document.getElementById('openTranscriptPicker');
              var closeBtn = document.getElementById('closeTranscriptPicker');
              var clearBtn = document.getElementById('clearTranscriptSelection');
              var confirmBtn = document.getElementById('confirmTranscriptSelection');

              if (openBtn) openBtn.addEventListener('click', openPicker);

              if (closeBtn) closeBtn.addEventListener('click', function(){
                document.getElementById('transcriptPickerModal').style.display = 'none';
              });

              if (clearBtn) clearBtn.addEventListener('click', function(){
                selectedTranscriptIds = [];
                // Uncheck all checkboxes in the modal
                var rows = document.querySelectorAll('#transcriptPickerList label[data-sid]');
                rows.forEach(function(row){
                  var cb = row.querySelector('input');
                  if (cb) cb.checked = false;
                  row.style.borderColor = 'var(--line)';
                  row.style.background = 'var(--bg)';
                });
                refreshPickerCount();
                showToastMsg('🗑️ Selezione cancellata.');
              });

              if (confirmBtn) confirmBtn.addEventListener('click', function(){
                if (!selectedTranscriptIds.length) {
                  showToastMsg('⚠️ Seleziona almeno una sessione.');
                  return;
                }
                document.getElementById('transcriptPickerModal').style.display = 'none';
                refreshPickerCount();
                showToastMsg('✅ ' + selectedTranscriptIds.length + ' sessione/i selezionata/e.');
              });

              // Load sessions
              if(window.SottotitoliData && window.SottotitoliData.getSessions){
                window.SottotitoliData.getSessions().then(function(sessions){
                  allSessions = sessions || [];
                  renderTranscriptPickerList();
                }).catch(function(){
                  document.getElementById('transcriptPickerList').innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:20px">Unable to load sessions. Try again later.</p>';
                });
              } else {
                // Retry
                var retries = 0;
                var loadInterval = setInterval(function(){
                  if(window.SottotitoliData && window.SottotitoliData.getSessions){
                    clearInterval(loadInterval);
                    window.SottotitoliData.getSessions().then(function(sessions){
                      allSessions = sessions || [];
                      renderTranscriptPickerList();
                    }).catch(function(){});
                  }
                  if (++retries > 20) clearInterval(loadInterval);
                }, 300);
              }

              // Stub for legacy generateReport calls from grammar panel
              window.generateReport = function(type) {
                var sb = window.sottotitoliSupabase;
                if (!sb) { alert('Accedi per generare report.'); return; }
                sb.auth.getSession().then(async function(r) {
                  if (!r.data?.session) { alert('Sessione scaduta. Rieffettua il login.'); return; }
                  var token = r.data.session.access_token;
                  var sessionEl = document.getElementById('gramSessionSelect');
                  var sessionId = sessionEl ? sessionEl.value : '';
                  if (!sessionId) { alert('Seleziona una sessione.'); return; }
                  try {
                    var funcUrl = type === 'grammar-full'
                      ? 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-grammar-report'
                      : 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports';
                    var body = JSON.stringify({ sessionId: sessionId, contentLanguage: 'en', explanationLanguage: 'it' });
                    var resp = await fetch(funcUrl, {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                      body: body
                    });
                    var result = await resp.json();
                    if (resp.ok && !result.error) {
                      showToastMsg('✅ Report generato!');
                    } else {
                      showToastMsg('❌ ' + (result.error || 'Errore nella generazione.'));
                    }
                  } catch(e) {
                    showToastMsg('❌ Errore di rete: ' + e.message);
                  }
                }).catch(function(e) {
                  showToastMsg('❌ ' + e.message);
                });
              };

              // deleteAllReports kept for Impostazioni danger zone
              window.deleteAllReports = async function() {
                var sb = window.sottotitoliSupabase;
                if (!sb) { alert('Accedi per gestire i report.'); return; }
                var r = await sb.auth.getSession();
                if (!r.data?.session) { alert('Sessione scaduta.'); return; }
                var uid = r.data.session.user.id;
                var dr = await sb.from('session_ai_reports').delete().eq('user_id', uid);
                if (dr.error) { alert('Errore: ' + dr.error.message); return; }
                alert('Tutti i report eliminati.');
                window.location.reload();
              };
            })();
          </script>
        </div>
`;
}

export async function init() {
  if (window._raiInitDone) return;
  window._raiInitDone = true;

  // Tab switching
  var tabs = document.getElementById('raiTabs');
  if (tabs) {
    tabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.rai-tab-btn');
      if (!btn) return;
      tabs.querySelectorAll('.rai-tab-btn').forEach(function(b) {
        b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
        b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
        b.style.border = b === btn ? 'none' : '1px solid var(--line)';
      });
      renderRaiContent(btn.getAttribute('data-tab'));
    });
  }

  // Generate report button
  var genBtn = document.getElementById('raiGenerateBtn');
  if (genBtn) genBtn.addEventListener('click', generateReport);

  // Load existing reports
  loadReports();
  renderRaiContent('rai-crea');
}

export function destroy() { container = null; window._raiInitDone = false; }

async function loadReports() {
  var sb = window.sottotitoliSupabase;
  if (!sb) { window._raiReports = []; return; }
  try {
    var resp = await sb.from('session_ai_reports').select('id, created_at, overall_score, summary, status, session_count').order('created_at',{ascending:false}).limit(50);
    window._raiReports = resp.data || [];
  } catch(e) { window._raiReports = []; }
}

function renderRaiContent(tab) {
  var content = document.getElementById('raiContent');
  if (!content) return;

  if (tab === 'rai-miei') {
    var reports = window._raiReports || [];
    if (!reports.length) { content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Nessun report. <a href="javascript:void(0)" onclick="document.querySelector(\'.rai-tab-btn[data-tab=rai-crea]\').click()" style="color:var(--cyan)">Genera il tuo primo report</a>.</p>'; return; }
    content.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--line)"><th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase">Data</th><th style="padding:10px 12px;text-align:left">Punteggio</th><th style="padding:10px 12px;text-align:left">Sessioni</th><th style="padding:10px 12px;text-align:left">Stato</th><th></th></tr></thead><tbody>' +
      reports.map(function(r) { return '<tr style="border-bottom:1px solid var(--line)"><td style="padding:10px 12px;color:var(--text)">' + (r.created_at?new Date(r.created_at).toLocaleDateString('it-IT'):'—') + '</td><td style="padding:10px 12px;font-weight:700">' + (r.overall_score||'—') + '</td><td style="padding:10px 12px;color:var(--text-soft)">' + (r.session_count||'—') + '</td><td style="padding:10px 12px">' + raiStatusBadge(r.status) + '</td><td style="padding:10px 12px"><button onclick="window._raiViewReport(\'' + r.id + '\')" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text-soft)">Dettagli</button></td></tr>'; }).join('') +
      '</tbody></table>';
    window._raiViewReport = viewReport;
  }
}

function raiStatusBadge(status) {
  var map = { completed:{l:'Completed',bg:'rgba(16,185,129,.1)',c:'#10B981'}, processing:{l:'Processing',bg:'rgba(245,158,11,.1)',c:'#F59E0B'}, pending:{l:'Pending',bg:'rgba(107,114,128,.1)',c:'var(--text-soft)'}, failed:{l:'Failed',bg:'rgba(225,29,72,.1)',c:'#E11D48'} };
  var s = map[status] || map.pending;
  return '<span style="display:inline-flex;align-items:center;padding:4px 12px;background:'+s.bg+';color:'+s.c+';font-size:11px;font-weight:700;border-radius:99px;text-transform:uppercase">'+s.l+'</span>';
}

async function generateReport() {
  var msg = document.getElementById('raiGenerateMsg');
  var btn = document.getElementById('raiGenerateBtn');
  var sb = window.sottotitoliSupabase;
  if (!sb) { if (msg) msg.textContent = 'Accedi per generare report.'; return; }
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generazione in corso...'; }
    if (msg) msg.textContent = 'Analisi in corso...';
    var lang = document.getElementById('raiLang'); var sc = document.getElementById('raiSessionCount');
    var resp = await sb.functions.invoke('generate-ai-report', { body: { language: lang?lang.value:'en', session_count: sc?parseInt(sc.value):1 } });
    if (resp.error) throw resp.error;
    if (msg) msg.textContent = 'Report generato!';
    if (btn) { btn.disabled = false; btn.textContent = 'Genera Report'; }
    await loadReports();
    var tabBtn = document.querySelector('.rai-tab-btn[data-tab="rai-miei"]');
    if (tabBtn) tabBtn.click();
  } catch(e) { console.error('Report gen:', e); if (msg) msg.textContent = 'Errore: ' + e.message; if (btn) { btn.disabled = false; btn.textContent = 'Genera Report'; } }
}

function viewReport(id) {
  var r = (window._raiReports||[]).find(function(x) { return x.id === id; });
  if (!r) return;
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">Report AI</h3><button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim)">&times;</button></div><p style="font-size:12px;color:var(--text-soft);margin:0 0 8px">Punteggio: ' + (r.overall_score||'—') + ' · ' + (r.session_count||'—') + ' sessioni</p><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)">' + esc(r.summary||'Nessun riepilogo.') + '</div></div>';
  modal.addEventListener('click', function(e) { if (e.target===modal||e.target.closest('button')) modal.remove(); });
  document.body.appendChild(modal);
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
