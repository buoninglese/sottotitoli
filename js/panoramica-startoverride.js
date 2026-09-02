// ═══ Override Start Session: 7 languages + Llama model selector ═══
(function(){
  var LANGUAGES = [
    {code:'en',flag:'🇬🇧',name:'English'},
    {code:'it',flag:'🇮🇹',name:'Italiano'},
    {code:'fr',flag:'🇫🇷',name:'Français'},
    {code:'de',flag:'🇩🇪',name:'Deutsch'},
    {code:'es',flag:'🇪🇸',name:'Español'},
    {code:'nl',flag:'🇳🇱',name:'Nederlands'},
    {code:'pl',flag:'🇵🇱',name:'Polski'}
  ];

  // Override the shared ssFlags
  window._ssFlagsOverride = LANGUAGES;

  // Replace spinner grids with our languages
  setTimeout(function(){
    // Override the theme-2.js spinner by redefining ssFlags
    if (typeof ssFlags !== 'undefined') {
      ssFlags.length = 0;
      LANGUAGES.forEach(function(l){ ssFlags.push(l); });
      updSSFlags();
    }
  }, 300);
})();
