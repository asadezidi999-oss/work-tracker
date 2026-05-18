/**
 * WorkTracker Store
 * -----------------
 * Thin reactive wrapper around the existing state object.
 * Does NOT copy state – patches it in-place so existing code keeps working.
 *
 * Why not a full copy?
 *   The app has hundreds of direct `state.X` reads. A full migration would
 *   touch every call site. This wrapper is additive: new code uses setState /
 *   subscribe, old code still works against the same object.
 *
 * Usage:
 *   const store = AppStore.createStore(state, AppEvents);
 *
 *   // Mutate + notify:
 *   store.setState({ selectedDay: "2026-05-04" });
 *   store.setState((s) => ({ weekGoal: s.weekGoal + 5 }));
 *
 *   // React to mutations:
 *   const unsub = store.subscribe((state, changed) => {
 *     if (changed.includes("selectedDay")) renderWeekBar();
 *   });
 *   unsub(); // cleanup
 */
(function(global) {
  "use strict";

  /**
   * @param {object} initialState  – the live state object from index.html
   * @param {object} [eventBus]    – optional WorkTrackerEvents bus instance
   */
  function createStore(initialState, eventBus) {
    const state = initialState;
    /** @type {Array<(state: object, changedKeys: string[]) => void>} */
    const subscribers = [];

    function notify(changedKeys) {
      subscribers.slice().forEach((fn) => {
        try {
          fn(state, changedKeys);
        } catch (e) {
          console.error("[Store] subscriber error", e);
        }
      });

      // Also emit a generic event so the event bus can react
      if (eventBus) {
        eventBus.emit("state:changed", { state, changedKeys });
      }
    }

    return {
      /**
       * Read-only reference to the live state (same object).
       */
      get state() {
        return state;
      },

      /**
       * Patch state and notify subscribers.
       * @param {object | ((s: object) => object)} patch
       * @param {string} [source]  – optional label for debugging
       */
      setState(patch, source) {
        const resolved = typeof patch === "function" ? patch(state) : patch;
        const changedKeys = Object.keys(resolved);

        Object.assign(state, resolved);

        if (changedKeys.length > 0) {
          notify(changedKeys);
        }

        return state;
      },

      /**
       * Subscribe to all state changes.
       * @param {(state: object, changedKeys: string[]) => void} fn
       * @returns {Function} unsubscribe
       */
      subscribe(fn) {
        subscribers.push(fn);
        return () => {
          const idx = subscribers.indexOf(fn);
          if (idx >= 0) subscribers.splice(idx, 1);
        };
      },

      /**
       * Subscribe only when specific keys change.
       * @param {string[]} keys
       * @param {(state: object) => void} fn
       * @returns {Function} unsubscribe
       */
      watch(keys, fn) {
        return this.subscribe((s, changedKeys) => {
          if (keys.some((k) => changedKeys.includes(k))) {
            fn(s);
          }
        });
      },

      /**
       * Number of active subscribers (useful for debugging).
       */
      get subscriberCount() {
        return subscribers.length;
      }
    };
  }

  global.WorkTrackerStore = { createStore };

})(window);
