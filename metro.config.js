const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add resolver configuration for better Hermes compatibility
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs"],
  assetExts: [...config.resolver.assetExts, "db"],
};

// Add transformer configuration for Hermes
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
