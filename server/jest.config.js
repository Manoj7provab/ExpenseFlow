module.exports = {
  testEnvironment: "node",

  testMatch: ["**/tests/**/*.test.js"],

  clearMocks: true,
  restoreMocks: true,

  // Allow MongoDB Memory Server to start
  testTimeout: 30000,

  // Run tests sequentially
  maxWorkers: 1,
};