// js/panoramica/shared/components.js — Reusable UI component factories
// These patterns existed 3-4× each in the monolith. Now defined ONCE as factory functions.

/**
 * Create a tab system.
 * @param {Element} container
 * @param {Array<{name: string, label: string, paneId?: string}>} tabs
 * @param {Function} [onSwitch] — called with tab name when switched
 * @returns {{ switchTo: Function, getActive: Function, destroy: Function }}
 */
export function createTabSystem(container, tabs, onSwitch) {
  // Build tab bar
  var tabBar = document.createElement('div');
  tabBar.className = 'tabs';
  tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap';

  var panes = {};
  tabs.forEach(function (tab) {
    var btn = document.createElement('button');
    btn.className = 'tab-link';
    btn.setAttribute('data-subtab', tab.name);
    btn.setAttribute('type', 'button');
    btn.textContent = tab.label;
    btn.style.cssText = 'padding:8px 16px;border:none;border-radius:100px;font-size:13px;font-weight:600;font-family:Manrope,sans-serif;cursor:pointer;background:var(--card);color:var(--text-soft);transition:all .2s';
    btn.addEventListener('click', function () { switchTo(tab.name); });
    tabBar.appendChild(btn);

    // Ensure pane exists
    var paneId = tab.paneId || ('subtab-' + tab.name);
    var pane = document.getElementById(paneId);
    if (!pane) {
      pane = document.createElement('div');
      pane.id = paneId;
      pane.className = 'subtab-pane';
      pane.style.display = 'none';
      container.appendChild(pane);
    }
    panes[tab.name] = { btn: btn, pane: pane };
  });

  // Insert tab bar at top of container
  container.insertBefore(tabBar, container.firstChild);

  function switchTo(name) {
    Object.keys(panes).forEach(function (key) {
      var p = panes[key];
      var isActive = key === name;
      p.btn.style.background = isActive ? 'var(--cyan)' : 'var(--card)';
      p.btn.style.color = isActive ? '#fff' : 'var(--text-soft)';
      p.pane.style.display = isActive ? '' : 'none';
    });
    if (onSwitch) onSwitch(name);
  }

  function getActive() {
    return Object.keys(panes).find(function (k) { return panes[k].pane.style.display !== 'none'; }) || tabs[0].name;
  }

  function destroy() {
    tabBar.remove();
  }

  // Activate first tab
  switchTo(tabs[0].name);

  return { switchTo: switchTo, getActive: getActive, destroy: destroy };
}

/**
 * Create pagination controls.
 * @param {Element} container
 * @param {Object} opts
 * @param {number} opts.total — total items
 * @param {number} opts.perPage — items per page
 * @param {Function} opts.onPage — called with page number (1-based)
 * @returns {{ update: Function, getPage: Function }}
 */
export function createPagination(container, opts) {
  var total = opts.total || 0;
  var perPage = opts.perPage || 10;
  var currentPage = 1;

  function render() {
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    var html = '<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:16px">';
    html += '<button class="page-btn" data-page="prev" ' + (currentPage <= 1 ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text-soft);cursor:pointer;font-size:12px;font-weight:600">&laquo;</button>';

    for (var i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        html += '<button class="page-btn" data-page="' + i + '" style="padding:6px 12px;border:1px solid ' + (i === currentPage ? 'var(--cyan)' : 'var(--line)') + ';border-radius:8px;background:' + (i === currentPage ? 'var(--cyan)' : 'var(--card)') + ';color:' + (i === currentPage ? '#fff' : 'var(--text-soft)') + ';cursor:pointer;font-size:12px;font-weight:600">' + i + '</button>';
      } else if (i === 2 || i === totalPages - 1) {
        html += '<span style="color:var(--text-faint);padding:0 4px">...</span>';
      }
    }

    html += '<button class="page-btn" data-page="next" ' + (currentPage >= totalPages ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text-soft);cursor:pointer;font-size:12px;font-weight:600">&raquo;</button>';
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var page = btn.getAttribute('data-page');
        if (page === 'prev') goTo(currentPage - 1);
        else if (page === 'next') goTo(currentPage + 1);
        else goTo(parseInt(page, 10));
      });
    });
  }

  function goTo(page) {
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
    if (opts.onPage) opts.onPage(currentPage);
  }

  function update(newTotal, newPerPage) {
    if (newTotal !== undefined) total = newTotal;
    if (newPerPage !== undefined) perPage = newPerPage;
    if (currentPage > Math.ceil(total / perPage)) currentPage = 1;
    render();
  }

  render();

  return { update: update, getPage: function () { return currentPage; }, goTo: goTo };
}

/**
 * Create a filter chip bar.
 * @param {Element} container
 * @param {Array<{key: string, label: string, count?: number}>} options
 * @param {Function} onChange — called with selected keys array
 * @param {Object} [opts]
 * @param {boolean} [opts.multi] — allow multi-select (default true)
 * @returns {{ getSelected: Function, setSelected: Function }}
 */
export function createFilterChips(container, options, onChange, opts) {
  opts = opts || {};
  var multi = opts.multi !== false;
  var selected = [];

  function render() {
    container.innerHTML = '';
    options.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.className = 'fchip';
      var isActive = selected.indexOf(opt.key) !== -1;
      chip.style.cssText = 'padding:6px 14px;border:1.5px solid ' + (isActive ? 'var(--cyan)' : 'var(--line)') + ';border-radius:100px;background:' + (isActive ? 'rgba(6,182,212,.1)' : 'var(--card)') + ';color:' + (isActive ? 'var(--cyan)' : 'var(--text-soft)') + ';font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:Manrope,sans-serif';
      chip.textContent = opt.label + (opt.count !== undefined ? ' (' + opt.count + ')' : '');
      chip.addEventListener('click', function () {
        if (multi) {
          var idx = selected.indexOf(opt.key);
          if (idx === -1) { selected.push(opt.key); }
          else { selected.splice(idx, 1); }
        } else {
          selected = selected[0] === opt.key ? [] : [opt.key];
        }
        render();
        if (onChange) onChange(selected.slice());
      });
      container.appendChild(chip);
    });
  }

  render();

  return {
    getSelected: function () { return selected.slice(); },
    setSelected: function (keys) { selected = Array.isArray(keys) ? keys.slice() : [keys]; render(); }
  };
}

/**
 * Create a metric card element.
 * @param {Object} opts
 * @param {string} opts.icon — material-symbols-outlined icon name
 * @param {string} opts.label
 * @param {string|number} opts.value
 * @param {string} [opts.trend] — e.g. '+12%', '-3%'
 * @param {string} [opts.trendDir] — 'up' (green) or 'down' (red)
 * @returns {HTMLElement}
 */
export function createMetricCard(opts) {
  var card = document.createElement('article');
  card.className = 'metric-card';
  card.setAttribute('data-metric', opts.label.toLowerCase().replace(/\s+/g, '-'));
  card.style.cssText = 'background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;min-height:90px;transition:border-color .2s';

  var trendColor = opts.trendDir === 'up' ? '#10B981' : opts.trendDir === 'down' ? '#EF4444' : 'var(--text-soft)';
  var trendArrow = opts.trendDir === 'up' ? '↑' : opts.trendDir === 'down' ? '↓' : '';

  card.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px">' +
    '<span class="material-symbols-outlined" style="font-size:20px;color:var(--cyan)">' + (opts.icon || 'bar_chart') + '</span>' +
    '<span style="font-size:12px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.03em">' + opts.label + '</span>' +
    '</div>' +
    '<div style="font-size:28px;font-weight:800;color:var(--text);font-family:Manrope,sans-serif">' + opts.value + '</div>' +
    (opts.trend ? '<div style="font-size:12px;font-weight:700;color:' + trendColor + '">' + trendArrow + ' ' + opts.trend + '</div>' : '');

  return card;
}

/**
 * Create a bulk action bar (appears when items are selected).
 * @param {Element} container
 * @param {Object} opts
 * @param {Function} opts.onDelete
 * @param {Function} [opts.onExport]
 * @param {Function} [opts.onDeselect]
 * @returns {{ show: Function, hide: Function, setCount: Function }}
 */
export function createBulkActionBar(container, opts) {
  var bar = document.createElement('div');
  bar.className = 'bulk-action-bar';
  bar.style.cssText = 'display:none;align-items:center;gap:12px;padding:12px 20px;background:var(--cyan);color:#fff;border-radius:12px;margin-bottom:12px;font-size:13px;font-weight:700;font-family:Manrope,sans-serif';
  bar.innerHTML = '<span id="bulkCount">0 selezionati</span>' +
    '<div style="flex:1"></div>' +
    '<button id="bulkDeselect" style="padding:6px 14px;border:1px solid rgba(255,255,255,.4);border-radius:100px;background:transparent;color:#fff;font-size:12px;font-weight:600;cursor:pointer">Annulla</button>' +
    (opts.onExport ? '<button id="bulkExport" style="padding:6px 14px;border:1px solid rgba(255,255,255,.4);border-radius:100px;background:transparent;color:#fff;font-size:12px;font-weight:600;cursor:pointer">Esporta</button>' : '') +
    '<button id="bulkDelete" style="padding:6px 14px;border:none;border-radius:100px;background:rgba(255,255,255,.25);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Elimina</button>';

  container.insertBefore(bar, container.firstChild);

  var countEl = bar.querySelector('#bulkCount');
  bar.querySelector('#bulkDelete').addEventListener('click', function () { if (opts.onDelete) opts.onDelete(); });
  bar.querySelector('#bulkDeselect').addEventListener('click', function () { if (opts.onDeselect) opts.onDeselect(); });
  if (opts.onExport) bar.querySelector('#bulkExport').addEventListener('click', function () { if (opts.onExport) opts.onExport(); });

  return {
    show: function (count) { bar.style.display = 'flex'; countEl.textContent = count + ' selezionati'; },
    hide: function () { bar.style.display = 'none'; },
    setCount: function (count) { countEl.textContent = count + ' selezionati'; }
  };
}
