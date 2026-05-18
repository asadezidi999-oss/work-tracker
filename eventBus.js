/**
 * WorkTracker Event Bus
 * --------------------
 * Lightweight pub/sub system. Decouples UI renders from state mutations.
 *
 * Usage:
 *   AppEvents.on("log:created", ({ branchId, log }) => renderLogs());
 *   AppEvents.emit("log:created", { branchId, log });
 *   const unsub = AppEvents.on("job:changed", handler);
 *   unsub(); // remove listener
 */
(function(global) {
  "use strict";

  function createEventBus() {
    /** @type {Record<string, Function[]>} */
    const listeners = Object.create(null);

    return {
      /**
       * Subscribe to an event.
       * @param {string} event
       * @param {Function} fn
       * @returns {Function} unsubscribe
       */
      on(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
        return () => this.off(event, fn);
      },

      /**
       * Subscribe once – auto-removes after first emit.
       * @param {string} event
       * @param {Function} fn
       * @returns {Function} unsubscribe
       */
      once(event, fn) {
        const wrapper = (payload) => {
          fn(payload);
          this.off(event, wrapper);
        };
        wrapper.__original = fn;
        return this.on(event, wrapper);
      },

      /**
       * Remove a specific listener.
       * @param {string} event
       * @param {Function} fn
       */
      off(event, fn) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(
          (l) => l !== fn && l.__original !== fn
        );
        if (listeners[event].length === 0) delete listeners[event];
      },

      /**
       * Emit an event with optional payload.
       * All listeners are called synchronously.
       * @param {string} event
       * @param {*} payload
       */
      emit(event, payload) {
        const fns = listeners[event];
        if (!fns || fns.length === 0) return;
        fns.slice().forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {
            console.error("[EventBus] Error in listener for:", event, e);
          }
        });
      },

      /**
       * List all registered event names (useful for debugging).
       * @returns {string[]}
       */
      events() {
        return Object.keys(listeners);
      },

      /**
       * Remove all listeners (for testing/cleanup).
       */
      clear() {
        Object.keys(listeners).forEach((k) => delete listeners[k]);
      }
    };
  }

  global.WorkTrackerEvents = { createEventBus };

})(window);
