#!/usr/bin/env python3
"""Build panoramica.html from mockups/sotto-supreme.html + shared theme files."""

with open('mockups/sotto-supreme.html', 'r') as f:
    content = f.read()

# Extract the SVG icons block
svg_start = content.find('<svg xmlns="http://www.w3.org/2000/svg"')
svg_end = content.find('</svg>') + 6
svg_block = content[svg_start:svg_end]

# Extract the HTML body (from <body> to just before the first <script>)
body_start = content.find('<body data-theme="light">')
script_start = content.find('  <script>', body_start)
body_html = content[body_start:script_start]
body_html = body_html.replace('<body data-theme="light">\n', '', 1)

# Extract toast div
toast_start = content.find('<div class="toast" id="toastMsg">')
toast_end = content.find('</div>', toast_start) + 6
toast_div = content[toast_start:toast_end]

# Build panoramica.html
head = '''<!DOCTYPE html>
<html lang="it" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Panoramica · Sottotitoli</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="css/theme-2.css">
</head>
<body data-theme="light">
'''

scripts = '''
  <!-- Dependencies (order matters) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="config.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/theme-2.js"></script>

  <!-- Page-specific: Supabase data fetching -->
  <script>
    (async function(){
      var maxTries=50,tries=0;
      while(!window.sottotitoliSupabase&&tries<maxTries){await new Promise(function(r){setTimeout(r,100)});tries++}
      if(!window.sottotitoliSupabase){console.warn("Supabase not loaded");return}
      var sb=window.sottotitoliSupabase;
      var result=await sb.auth.getSession();
      var session=result.data.session;
      if(!session){console.warn("No session");return}
      var user=session.user;
      var userName=user.user_metadata&&user.user_metadata.full_name?user.user_metadata.full_name:(user.email?user.email.split("@")[0]:"Utente");
      var userEmail=user.email||"";
      var dd=document.getElementById("userDropdown");
      if(dd){
        var items=dd.querySelectorAll(".dropdown-item");
        if(items.length>0)items[0].textContent=userName;
        if(items.length>1)items[1].textContent=userEmail;
      }
      var heroEm=document.querySelector(".hero-content h2 em");
      if(heroEm)heroEm.textContent=userName;
      var result2=await sb.from("profiles").select("*").eq("id",user.id).single();
      var profile=result2.data;
      if(profile){
        document.querySelectorAll(".alt-card").forEach(function(card){
          var h3=card.querySelector("h3");
          if(!h3)return;
          if(h3.textContent.indexOf("Seba B.")!==-1){
            h3.textContent=profile.full_name||userName;
            var rows=card.querySelectorAll('[style*="justify-content:space-between"]');
            rows.forEach(function(row){
              var spans=row.querySelectorAll("span");
              if(spans.length<2)return;
              var label=spans[0].textContent.trim();
              if(label==="Membro da")spans[1].textContent=profile.created_at?new Date(profile.created_at).toLocaleDateString("it-IT",{month:"long",year:"numeric"}):"—";
              if(label==="Piano")spans[1].textContent=profile.plan||"Standard";
              if(label==="Madrelingua")spans[1].textContent=profile.madrelingua||"—";
            });
          }
        });
        var heroP=document.querySelector(".hero-content p");
        if(heroP&&profile.sessioni_totali){
          heroP.innerHTML="Hai dettato <strong>"+profile.sessioni_totali+" sessioni</strong> per un totale di <strong>"+profile.ore_parlate+" ore</strong>. Il tuo vocabolario attivo conta <strong>"+profile.parole_uniche+" parole</strong> uniche.";
        }
      }
    })();
  </script>
</body>
</html>
'''

full = head + '\n  ' + svg_block + '\n' + body_html + '\n  ' + toast_div + '\n' + scripts

with open('panoramica.html', 'w') as f:
    f.write(full)

lines = full.count('\n')
print(f"Created panoramica.html ({lines} lines, {len(full)} chars)")
