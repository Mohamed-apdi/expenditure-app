export default ({ config }) => ({
  ...config,
  name: "Qoondeeye",
  slug: "qoondeeye",
  version: "2.3.2",
  orientation: "portrait",
  icon: "./assets/images/adaptive-icon.png",
  scheme: "qoondeeye",
  platforms: ["ios", "android", "web"],
  userInterfaceStyle: "automatic",

  splash: {
    image: "./assets/images/splash-icon-light.png",
    resizeMode: "contain",
    backgroundColor: "#00BFFF"
  },

  assetBundlePatterns: ["**/*"],

  ios: {
    bundleIdentifier: "com.mohamed-99.qoondeeye",
    supportsTablet: true,
    jsEngine: "hermes",
    buildNumber: "26",
    icon: {
      dark: "./assets/images/ios-light.png",
      light: "./assets/images/ios-light.png",
      tinted: "./assets/images/ios-light.png"
    }
  },

  android: {
    versionCode: 26,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#00BFFF"
    },
    jsEngine: "hermes",
    package: "com.mohamed_99.qoondeeye",
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "VIBRATE",
      "RECEIVE_BOOT_COMPLETED"
    ]
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/adaptive-icon.png"
  },

  plugins: [
    "expo-router",
    "expo-secure-store",

    // Notifications plugin config
    [
      "expo-notifications",
      {
        color: "#ffffff",
        icon: "./assets/images/notification-icon.png",
        sounds: ["./assets/sounds/notification_alert.wav"]
      }
    ],

    // Splash screen plugin config
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon-light.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#00BFFF",
        dark: {
          image: "./assets/images/splash-icon-light.png",
          backgroundColor: "#00BFFF"
        }
      }
    ],

    "expo-font",
    ["@journeyapps/react-native-quick-sqlite", { staticLibrary: true }]
  ],

  experiments: {
    typedRoutes: true
  },

  extra: {
    router: {},
    eas: {
      projectId: "731ac4ba-e439-4651-87c7-1739515acf33"
    },
    // Supabase env vars for EAS builds
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
});
