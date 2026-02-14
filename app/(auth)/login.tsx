import { Redirect } from "expo-router";

/**
 * Auth is handled on the "Ready to get started?" screen (AuthGateScreen)
 * with Sign with Google only—no redirect to a separate login screen.
 */
export default function LoginScreen() {
  return <Redirect href="/(onboarding)/AuthGateScreen" />;
}
