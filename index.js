import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";

// Hermes engine polyfills to fix "property is not configurable" error
if (global.HermesInternal) {
  // Polyfill for Object.defineProperty issues in Hermes
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj, prop, descriptor) {
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      if (error.message.includes("property is not configurable")) {
        // Skip the error for non-configurable properties
        return obj;
      }
      throw error;
    }
  };
}

import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

// https://docs.expo.dev/router/reference/troubleshooting/#expo_router_app_root-not-defined

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
