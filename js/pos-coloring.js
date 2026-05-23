// js/pos-coloring.js
(function (w) {
  "use strict";

  function posToClass(pos) {
    if (!pos) return null;
    const p = pos.toLowerCase();
    if (p.startsWith("v")) return "pos-verb";
    if (p.startsWith("n")) return "pos-noun";
    if (p.startsWith("adj")) return "pos-adj";
    if (p.startsWith("adv")) return "pos-adv";
    return null;
  }

  function renderColoredCaption(container, tokens) {
    if (!container) return;
    container.innerHTML = "";

    tokens.forEach((tok, idx) => {
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
    renderColoredCaption
  };
})(window);
