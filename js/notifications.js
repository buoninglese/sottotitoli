/**
 * notifications.js — Shared Notification Center
 * Include on every page that needs the notification bell.
 * Requires: supabase-js, js/auth.js (for window.sottotitoliSupabase)
 */

(function () {
  'use strict';

  class NotificationCenter {
    constructor() {
      this.unreadCount = 0;
      this.notifications = [];
      this.bellEl = null;
      this.badgeEl = null;
      this.panelEl = null;
      this.supabase = null;
      this.channel = null;
      this._userId = null;
      this._initialized = false;
    }

    async init() {
      if (this._initialized) return;
      this._initialized = true;

      // ── DOM refs + click handler — always, even without auth ──
      this.bellEl = document.querySelector('.topbar-bell');
      this.badgeEl = document.querySelector('.topbar-bell .badge');
      this.panelEl = document.getElementById('notifDropdown');

      if (this.bellEl) {
        this.bellEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePanel();
        });
      }

      // Outside click to close
      document.addEventListener('click', (e) => {
        if (this.panelEl && this.panelEl.style.opacity === '1' &&
            this.bellEl && !this.bellEl.contains(e.target) &&
            !this.panelEl.contains(e.target)) {
          this.closePanel();
        }
      });

      // ── Auth-dependent setup ──
      this.supabase = await this._getSupabase();
      if (!this.supabase) { this._renderUnauth('Supabase non disponibile'); return; }

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) { this._renderUnauth('Accedi per vedere le notifiche'); return; }
      this._userId = user.id;

      this._maybeSendWelcome();
      await this.loadHistory();
      this.setupRealtime();
    }

    async _getSupabase() {
      // Wait up to 5s for supabase client to be available
      if (window.sottotitoliSupabase) return window.sottotitoliSupabase;
      return new Promise((resolve) => {
        let tries = 0;
        const check = setInterval(() => {
          if (window.sottotitoliSupabase) {
            clearInterval(check);
            resolve(window.sottotitoliSupabase);
          }
          if (++tries > 50) { clearInterval(check); resolve(null); }
        }, 100);
      });
    }

    setupRealtime() {
      if (!this.supabase || !this._userId) return;
      try {
        this.channel = this.supabase
          .channel('notifications:' + this._userId)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: 'user_id=eq.' + this._userId,
          }, (payload) => {
            this.receiveNotification(payload.new);
          })
          .subscribe();
      } catch (e) {
        console.warn('NotificationCenter: realtime unavailable', e.message);
      }
    }

    async loadHistory() {
      if (!this.supabase || !this._userId) return;
      try {
        const { data } = await this.supabase
          .from('notifications')
          .select('*')
          .eq('user_id', this._userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(50);

        this.notifications = data || [];
        this.updateBadge();
        this.renderPanel();
      } catch (e) {
        console.warn('NotificationCenter: load failed', e.message);
      }
    }

    receiveNotification(notif) {
      // Avoid duplicates
      if (this.notifications.some((n) => n.id === notif.id)) return;

      this.notifications.unshift(notif);
      this.updateBadge();
      this.renderPanel();
      this.showToast(notif);
    }

    updateBadge() {
      if (!this.badgeEl) return;
      const count = this.notifications.filter((n) => !n.read).length;
      this.badgeEl.textContent = count > 99 ? '99+' : count;
      this.badgeEl.style.display = count > 0 ? 'flex' : 'none';
    }

    showToast(notif) {
      const toast = document.createElement('div');
      toast.className = 'notif-toast';
      toast.innerHTML =
        '<strong>' + this._esc(notif.title) + '</strong>' +
        (notif.message ? '<span>' + this._esc(notif.message) + '</span>' : '');
      document.body.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('show'));

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    togglePanel() {
      if (!this.panelEl) return;
      const isOpen = this.panelEl.style.opacity === '1';
      if (isOpen) {
        this.closePanel();
      } else {
        this.panelEl.style.opacity = '1';
        this.panelEl.style.pointerEvents = 'auto';
        this.panelEl.style.transform = 'translateY(0)';
        this.panelEl.classList.add('open');
        this.markAllRead();
      }
    }

    closePanel() {
      if (!this.panelEl) return;
      this.panelEl.style.opacity = '0';
      this.panelEl.style.pointerEvents = 'none';
      this.panelEl.style.transform = 'translateY(-8px)';
      this.panelEl.classList.remove('open');
    }

    async markAllRead() {
      const unreadIds = this.notifications.filter((n) => !n.read).map((n) => n.id);
      if (!unreadIds.length) return;

      try {
        await this.supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);

        this.notifications.forEach((n) => { n.read = true; });
        this.updateBadge();
        this.renderPanel();
      } catch (_) { /* silent */ }
    }

    _renderUnauth(msg) {
      if (this.panelEl) {
        this.panelEl.innerHTML = '<div class="dropdown-item" style="color:var(--text-faint);cursor:default;text-align:center;padding:20px">🔔 ' + this._esc(msg) + '</div>';
      }
    }

    renderPanel() {
      if (!this.panelEl) return;
      if (!this.notifications.length) {
        this.panelEl.innerHTML =
          '<div class="dropdown-item" style="color:var(--text-faint);cursor:default;text-align:center;padding:20px">🔔 Nessuna notifica recente</div>';
        return;
      }
      this.panelEl.innerHTML = this.notifications.slice(0, 20).map((n) =>
        '<div class="notif-item ' + (n.read ? 'read' : 'unread') + '" data-type="' + n.type + '">' +
          '<div class="notif-icon">' + this._icon(n.type) + '</div>' +
          '<div class="notif-body">' +
            '<div class="notif-title">' + this._esc(n.title) + '</div>' +
            (n.message ? '<div class="notif-msg">' + this._esc(n.message) + '</div>' : '') +
            '<div class="notif-time">' + this._ago(n.created_at) + '</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    _esc(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    _icon(type) {
      const m = { system: '🔔', welcome: '👋', metric: '📊', boost: '🚀', motivational: '💡' };
      return m[type] || '•';
    }

    _ago(date) {
      if (!date) return '';
      const diff = Date.now() - new Date(date).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'ora';
      if (min < 60) return min + 'm fa';
      const hr = Math.floor(min / 60);
      if (hr < 24) return hr + 'h fa';
      return Math.floor(hr / 24) + 'g fa';
    }

    async _maybeSendWelcome() {
      var key = 's8t-welcome-sent-' + this._userId;
      if (localStorage.getItem(key)) return;
      try {
        var res = await this.supabase.auth.getSession();
        var token = res?.data?.session?.access_token;
        if (!token) return;
        await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/welcome-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ user_id: this._userId })
        });
        localStorage.setItem(key, '1');
      } catch (_) { /* silent */ }
    }
  }

  // ── Bootstrap ──
  window.SottotitoliNotifications = new NotificationCenter();

  // Wait for auth then init
  function boot() {
    if (window.sottotitoliSupabase) {
      window.SottotitoliNotifications.init();
    } else {
      setTimeout(boot, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
