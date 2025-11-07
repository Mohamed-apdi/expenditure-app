module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Add react-native-reanimated plugin for Hermes compatibility
      "react-native-reanimated/plugin",
    ],
  };
};
