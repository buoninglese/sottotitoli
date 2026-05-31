(function (w) {
  'use strict';

  function noop() {}

  function normalizeError(err) {
    if (!err) return 'unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.type) return err.type;
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  }

  function parseMs(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function createWSPublisher(options) {
    options = options || {};

    var url = options.url || 'wss://sottotitoli-websocket.onrender.com';
    var room = options.room || '';
    var maxQueue = parseMs(options.maxQueue, 200);
    var baseDelayMs = parseMs(options.baseDelayMs, 1000);
    var maxDelayMs = parseMs(options.maxDelayMs, 30000);

    var onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : noop;
    var onStats = typeof options.onStats === 'function' ? options.onStats : noop;
    var onError = typeof options.onError === 'function' ? options.onError : noop;
    var onMessage = typeof options.onMessage === 'function' ? options.onMessage : noop;

    var socket = null;
    var queue = [];
    var retryCount = 0;
    var reconnectTimer = null;
    var heartbeatTimer = null;
    var manualClose = false;
    var state = 'idle';

    var HEARTBEAT_INTERVAL_MS = 30000; // send a keepalive every 30s

    function now() {
      return Date.now();
    }

    function getRetryDelay() {
      if (retryCount === 0) return 0;
      return Math.min(baseDelayMs * Math.pow(2, retryCount - 1), maxDelayMs);
    }

    function getSnapshot() {
      return {
        url: url,
        room: room,
        state: state,
        retryCount: retryCount,
        queueLength: queue.length
      };
    }

    function emitState(nextState) {
      if (state !== nextState) {
        state = nextState;
        onStateChange(nextState, getSnapshot());
      }
      onStats(getSnapshot());
    }

    function emitError(err) {
      onError(normalizeError(err), getSnapshot());
      onStats(getSnapshot());
    }

    function enqueue(payload) {
      if (queue.length >= maxQueue) queue.shift();
      queue.push(payload);
      onStats(getSnapshot());
    }

    function startHeartbeat() {
      stopHeartbeat();
      heartbeatTimer = setInterval(function () {
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
          } catch (e) {
            // If sending fails, the socket is probably dead — reconnect will handle it
          }
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    function cleanupSocket() {
      stopHeartbeat();
      if (!socket) return;
      try {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.close();
      } catch (e) {}
      socket = null;
    }

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function flushQueue() {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      while (queue.length) {
        var payload = queue.shift();
        try {
          socket.send(JSON.stringify(payload));
        } catch (err) {
          emitError(err);
          queue.unshift(payload);
          break;
        }
      }
      onStats(getSnapshot());
    }

    function connect() {
      manualClose = false;
      clearReconnectTimer();
      cleanupSocket();
      emitState('connecting');

      try {
        socket = new WebSocket(url + (room ? ('?room=' + encodeURIComponent(room)) : ''));
      } catch (err) {
        emitError(err);
        scheduleReconnect();
        return;
      }

      socket.onopen = function () {
        retryCount = 0;
        emitState('connected');
        startHeartbeat();
        if (room) {
          try {
            socket.send(JSON.stringify({ join: room }));
          } catch (err) {
            emitError(err);
          }
        }
        flushQueue();
      };

      socket.onmessage = function (event) {
        onMessage(event, getSnapshot());
      };

      socket.onerror = function (event) {
        emitError(event && event.error ? event.error : event);
        emitState('error');
      };

      socket.onclose = function () {
        if (manualClose) {
          emitState('closed');
          return;
        }
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (manualClose || reconnectTimer) return;
      var delay = getRetryDelay();
      emitState('reconnecting');
      reconnectTimer = setTimeout(function () {
        reconnectTimer = null;
        retryCount += 1;
        connect();
      }, delay);
    }

    function publish(payload) {
      if (!payload || typeof payload !== 'object') return false;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        enqueue(payload);
        if (!reconnectTimer && !manualClose) connect();
        return false;
      }

      try {
        socket.send(JSON.stringify(payload));
        onStats(getSnapshot());
        return true;
      } catch (err) {
        emitError(err);
        enqueue(payload);
        return false;
      }
    }

    function disconnect() {
      manualClose = true;
      clearReconnectTimer();
      stopHeartbeat();
      cleanupSocket();
      emitState('closed');
    }

    function setRoom(nextRoom) {
      room = nextRoom || '';
    }

    function isOpen() {
      return !!socket && socket.readyState === WebSocket.OPEN;
    }

    return {
      connect: connect,
      disconnect: disconnect,
      publish: publish,
      flush: flushQueue,
      getSnapshot: getSnapshot,
      isOpen: isOpen,
      setRoom: setRoom,
      get ws() { return socket; }
    };
  }

  w.createWSPublisher = createWSPublisher;
})(window);