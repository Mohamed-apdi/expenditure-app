/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)",
    "**/*.(test|spec).(ts|tsx|js|jsx)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
    "react-native-url-polyfill/auto": "<rootDir>/lib/__mocks__/react-native-url-polyfill.js",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!uuid|react-native-url-polyfill)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/", "/android/", "/ios/"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "!lib/**/*.d.ts",
    "!lib/**/__tests__/**",
  ],
};
