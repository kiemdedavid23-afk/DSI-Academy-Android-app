let listener = null;
const state = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

const NetInfo = {
  fetch: jest.fn(() => Promise.resolve({...state})),
  addEventListener: jest.fn(cb => {
    listener = cb;
    return () => {
      listener = null;
    };
  }),
  configure: jest.fn(),
};

module.exports = NetInfo;
module.exports.default = NetInfo;
