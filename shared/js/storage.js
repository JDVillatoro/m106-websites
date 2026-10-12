// Saving data in the browser (localStorage), under one name prefix per mode.
//
// Values are stored as JSON. Reading and writing never throw: if the browser
// blocks storage (private windows, some school setups), reads return the
// fallback and writes are skipped, and the page keeps working without saving.

/**
 * @param {string} prefix  e.g. 'm106:graph-theory:eulerian:'
 */
export function createStorage(prefix) {
  return {
    get(name, fallback = null) {
      try {
        const raw = localStorage.getItem(prefix + name);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(name, value) {
      try {
        localStorage.setItem(prefix + name, JSON.stringify(value));
      } catch {
        // Storage unavailable or full: nothing is saved.
      }
    },

    remove(name) {
      try {
        localStorage.removeItem(prefix + name);
      } catch {
        // Storage unavailable: nothing to remove.
      }
    },
  };
}
