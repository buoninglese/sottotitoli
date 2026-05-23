// js/pos-coloring.js
(function (w) {
  "use strict";

  function posToClass(pos) {
    if (!pos) return null;
    const p = String(pos).toLowerCase();
    if (p === "verb" || p.startsWith("v")) return "pos-verb";
    if (p === "noun" || p.startsWith("n")) return "pos-noun";
    if (p === "adj" || p === "adjective") return "pos-adj";
    if (p === "adv" || p === "adverb") return "pos-adv";
    return null;
  }

  function renderColoredCaption(container, tokens) {
    if (!container) return;
    container.innerHTML = "";

    tokens.forEach(function (tok, idx) {
      const span = document.createElement("span");
      const cls = posToClass(tok.pos);
      if (cls) span.className = cls;
      span.textContent = tok.text;
      container.appendChild(span);
      if (idx < tokens.length - 1) {
        container.appendChild(document.createTextNode(" "));
      }
    });
  }

  w.SottotitoliPosColoring = {
    renderColoredCaption: renderColoredCaption
  };
})(window);
