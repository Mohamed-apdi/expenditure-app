export default ({ config }) => ({
  ...config,
  name: "Qoondeeye",
  slug: "qoondeeye",
  version: "1.8.1",
  orientation: "portrait",
  icon: "./assets/images/adaptive-icon.png",
  scheme: "qoondeeye",
  platforms: ["ios", "android", "web"],
  userInterfaceStyle: "automatic",

  splash: {
    image: "./assets/images/splash-icon-dark.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },

  assetBundlePatterns: ["**/*"],

  ios: {
    supportsTablet: true,
    jsEngine: "hermes",
    // iOS only accepts ONE app icon
    icon: {
      dark:"./assets/images/ios-dark.png",
      light:"./assets/images/ios-light.png",
      tinted:"./assets/images/ios-tinted.png"
    }
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
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
    favicon: "./assets/images/favicon.png"
  },

  plugins: [
    "expo-router",
    "expo-secure-store",

    // Notifications plugin config
    [
      "expo-notifications",
      {
        color: "#ffffff",
        icon: "./assets/qoondeeye-notification.png",
        sounds: ["./assets/sounds/notification.wav"]
      }
    ],

    // Splash screen plugin config
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon-dark.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/images/splash-icon-light.png",
          backgroundColor: "#000000"
        }
      }
    ],

    "expo-font"
  ],

  experiments: {
    typedRoutes: true
  },

  extra: {
    router: {},
    eas: {
      projectId: "731ac4ba-e439-4651-87c7-1739515acf33"
    },
    // ✅ Add Supabase env vars for EAS builds
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
});
