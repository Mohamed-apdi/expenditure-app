const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs", "cjs"],
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Fix for path aliases
  alias: {
    '~': path.resolve(__dirname),
  },
  // Resolve modules from project root
  extraNodeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        if (target[name]) {
          return target[name];
        }
        // Redirect imports starting with ~ to the project root
        if (name.startsWith('~')) {
          const moduleName = name.substring(1);
          return path.join(__dirname, moduleName);
        }
        return path.join(__dirname, 'node_modules', name);
      },
    }
  ),
  // Enable hierarchical lookup
  disableHierarchicalLookup: false,
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

config.transformer.minifierPath = require.resolve('metro-minify-terser');

module.exports = withNativeWind(config, { input: "./global.css" });
