module.exports = {
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  composeAsync: jest.fn(() => Promise.resolve({ status: 'sent' })),
};
