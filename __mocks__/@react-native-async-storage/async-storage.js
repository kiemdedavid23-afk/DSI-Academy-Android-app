/**
 * Mock AsyncStorage pour Jest (mémoire).
 */
const store = new Map();

module.exports = {
  __esModule: true,
  default: {
    getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      store.delete(key);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
  },
  /** Aide tests : vide le magasin. */
  __reset: () => store.clear(),
  __store: store,
};
