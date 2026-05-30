// security-utils.js — Sottotitoli room security
// Validates room IDs and warns when a predictable ID is in use.

(function (w) {
  'use strict';

  var INSECURE_PATTERNS = [
    'test', 'demo', 'guest', 'user', 'admin', 'default',
    'sample', 'example', 'temp', 'temporary', 'public',
    'room', 'stream', 'live', 'broadcast', 'channel',
    'password', '1234', '0000', 'abcd', 'qwerty',
    'welcome', 'hello', 'anonymous', 'anon', 'visitor',
    'caption', 'captions', 'english', 'show', 'a',
    'video', 'audio', 'media', 'session', 'meeting',
    'class', 'lecture', 'presentation', 'webinar', 'event',
    'main', 'primary', 'secondary', 'backup', 'alt',
    'new', 'old', 'first', 'last', 'next', 'previous'
  ];

  function validateRoom(roomId) {
    if (!roomId) return { valid: false, warning: 'No room ID specified.' };
    var lower = String(roomId).toLowerCase().trim();
    if (lower.length < 4) return { valid: false, warning: 'Room ID is too short. Use a longer, unpredictable ID.' };
    if (/^\d+$/.test(lower)) return { valid: false, warning: 'Room ID is purely numeric. Use letters too.' };
    if (/^(.)\1{3,}$/.test(lower)) return { valid: false, warning: 'Room ID is repetitive. Use a more random ID.' };
    for (var i = 0; i < INSECURE_PATTERNS.length; i++) {
      if (lower === INSECURE_PATTERNS[i]) return { valid: false, warning: '"' + roomId + '" is too predictable. Anyone can guess it.' };
      var escaped = INSECURE_PATTERNS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('^' + escaped + '\\d+$', 'i').test(lower)) {
        return { valid: false, warning: '"' + roomId + '" looks predictable. Use a random ID instead.' };
      }
    }
    return { valid: true, warning: null };
  }

  var warningStylesInjected = false;
  var activeWarning = null;

  function injectStyles() {
    if (warningStylesInjected) return;
    warningStylesInjected = true;
    var style = document.createElement('style');
    style.id = 'sottotitoli-security-styles';
    style.textContent = [
      '.sottotitoli-security-banner {',
      '  position:fixed;top:20px;left:50%;transform:translateX(-50%);',
      '  background:#dc3545;color:#fff;padding:14px 20px;border-radius:10px;',
      '  box-shadow:0 6px 24px rgba(220,53,69,.35);z-index:10000;',
      '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      '  font-size:14px;line-height:1.5;max-width:min(90vw,520px);',
      '  display:flex;align-items:flex-start;gap:10px;',
      '  animation:sottotitoli-slide-in .35s ease-out;',
      '}',
      '@keyframes sottotitoli-slide-in{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}',
      '.sottotitoli-security-banner .s-msg{flex:1;font-weight:500}',
      '.sottotitoli-security-banner .s-dismiss{background:none;border:1px solid rgba(255,255,255,.4);color:#fff;cursor:pointer;font-size:16px;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;padding:0;transition:background .15s}',
      '.sottotitoli-security-banner .s-dismiss:hover{background:rgba(255,255,255,.15)}',
      '.sottotitoli-security-banner .s-fix-btn{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s}',
      '.sottotitoli-security-banner .s-fix-btn:hover{background:rgba(255,255,255,.25)}',
      '@media(max-width:600px){.sottotitoli-security-banner{top:10px;left:10px;right:10px;transform:none;max-width:none;flex-wrap:wrap}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function showWarning(message, options) {
    options = options || {};
    dismissWarning();
    injectStyles();

    var banner = document.createElement('div');
    banner.className = 'sottotitoli-security-banner';
    banner.id = 'sottotitoli-security-banner';

    var icon = document.createElement('span');
    icon.textContent = '\u26A0\uFE0F';
    icon.style.cssText = 'font-size:18px;flex-shrink:0;line-height:1.4';

    var msg = document.createElement('span');
    msg.className = 's-msg';
    msg.textContent = message;

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;align-items:center;flex-shrink:0';

    if (typeof options.onFix === 'function') {
      var fixBtn = document.createElement('button');
      fixBtn.className = 's-fix-btn';
      fixBtn.textContent = options.fixLabel || 'Fix';
      fixBtn.onclick = function () { banner.remove(); activeWarning = null; options.onFix(); };
      actions.appendChild(fixBtn);
    }

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 's-dismiss';
    dismissBtn.textContent = '\u00D7';
    dismissBtn.title = 'Dismiss';
    dismissBtn.onclick = function () { banner.remove(); activeWarning = null; };
    actions.appendChild(dismissBtn);

    banner.appendChild(icon);
    banner.appendChild(msg);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    activeWarning = banner;

    if (options.duration > 0) {
      setTimeout(function () {
        if (activeWarning === banner) { banner.remove(); activeWarning = null; }
      }, options.duration);
    }

    return banner;
  }

  function dismissWarning() {
    if (activeWarning) { activeWarning.remove(); activeWarning = null; }
  }

  function autoCheck() {
    var params = new URLSearchParams(window.location.search);
    var room = params.get('room');
    if (!room) return;
    var result = validateRoom(room);
    if (!result.valid) {
      showWarning(result.warning, {
        duration: 12000,
        fixLabel: 'New room',
        onFix: function () {
          var url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.location.href = url.toString();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoCheck);
  } else {
    autoCheck();
  }

  w.SottotitoliSecurity = {
    validateRoom: validateRoom,
    showWarning: showWarning,
    dismissWarning: dismissWarning
  };
})(window);
<style>
.security-warning {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #dc3545;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
    min-width: 350px;
    border: 2px solid #c82333;
}

.security-warning-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.security-warning-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.security-warning-message {
    flex-grow: 1;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 500;
}

.security-warning-dismiss {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s;
    flex-shrink: 0;
    line-height: 1;
}

.security-warning-dismiss:hover {
    opacity: 1;
}

@keyframes slideDown {
    from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    to {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
    }
}

/* Mobile responsive */
@media (max-width: 600px) {
    .security-warning {
        top: 10px;
        left: 10px;
        right: 10px;
        transform: none;
        max-width: none;
        min-width: auto;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
}
</style>
`;

// Function to inject styles if not already present
function injectSecurityStyles() {
    if (!document.getElementById('security-warning-styles')) {
        // Create a proper style element
        const styleElement = document.createElement('style');
        styleElement.id = 'security-warning-styles';
        styleElement.textContent = securityWarningStyles.replace('<style>', '').replace('</style>', '');
        document.head.appendChild(styleElement);
    }
}