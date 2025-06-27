module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
      'module:react-native-dotenv',
      {
        moduleName: '@env', // This matches your import statement
        path: '.env',
        allowUndefined: true,
        safe: false,
      },
    ],
    ]
  };
};
