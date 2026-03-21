/**
 * Optional compile path for contracts/ (OpenZeppelin v5).
 * Run: npm install && npm run contracts:compile
 */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
  },
};
