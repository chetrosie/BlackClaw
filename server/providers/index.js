const config = require("../config");
const mockProvider = require("./mockProvider");
const httpProvider = require("./httpProvider");

const providers = {
  mock: mockProvider,
  http: httpProvider,
};

function getProvider() {
  const provider = providers[config.provider.driver];
  if (!provider) {
    throw new Error(
      `unsupported provider driver: ${config.provider.driver}. supported: ${Object.keys(providers).join(", ")}`
    );
  }
  return provider;
}

function listProviders() {
  return Object.keys(providers);
}

module.exports = {
  getProvider,
  listProviders,
};
