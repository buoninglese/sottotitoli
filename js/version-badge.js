/* version-badge.js — show, in the corner, which build this page is running.
 *
 * Green  v a1b2c3d    this matches a commit exactly
 * Orange v a1b2c3d±   there are uncommitted changes on top of that commit
 *
 * The orange state matters: while work is in progress it is the honest answer,
 * and it stops a stale tab being mistaken for current. Hover for the build time.
 *
 * Reads window.APP_VERSION, written by dev/stamp-version.py.
 */
(function () {
  'use strict';

  var v = window.APP_VERSION || { sha: 'unknown', dirty: true, built: '' };
  var okColour = '#8ef0c8';
  var warnColour = '#ffb020';
  var colour = v.dirty ? warnColour : okColour;

  function render() {
    if (document.getElementById('appVersionBadge')) return;
    if (!document.body) return;

    var el = document.createElement('div');
    el.id = 'appVersionBadge';
    el.textContent = 'v ' + v.sha + (v.dirty ? '±' : '');
    el.title = 'commit ' + v.sha +
      (v.dirty ? '\n+ modifiche non committate' : '\nnessuna modifica locale') +
      (v.built ? '\nbuild ' + v.built : '') +
      '\nclic per ricaricare senza cache';
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:fixed', 'top:6px', 'left:6px', 'z-index:2147483647',
      'font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace',
      'letter-spacing:.06em', 'padding:5px 8px', 'border-radius:6px',
      'background:rgba(8,14,22,.88)', 'color:' + colour,
      'border:1px solid ' + colour + '66',
      'cursor:pointer', 'user-select:none', 'text-decoration:none'
    ].join(';');

    /* A cache-buster reload is the whole point of the badge: one click and you
       know the next render came off the network. */
    el.addEventListener('click', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('_bust', String(Date.now()));
      window.location.replace(url.toString());
    });

    document.body.appendChild(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
