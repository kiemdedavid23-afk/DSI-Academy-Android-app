/**
 * Mock react-native-keychain pour Jest (mémoire process).
 */
const stores = new Map();

module.exports = {
  setGenericPassword: jest.fn(async (username, password, options = {}) => {
    const service = options.service || 'default';
    stores.set(service, {username, password});
    return true;
  }),
  getGenericPassword: jest.fn(async (options = {}) => {
    const service = options.service || 'default';
    const entry = stores.get(service);
    if (!entry) {
      return false;
    }
    return entry;
  }),
  resetGenericPassword: jest.fn(async (options = {}) => {
    const service = options.service || 'default';
    stores.delete(service);
    return true;
  }),
  __reset: () => stores.clear(),
  __stores: stores,
};
