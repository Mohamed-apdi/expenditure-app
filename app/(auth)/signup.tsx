import { Redirect } from "expo-router";

/**
 * Sign up is hidden; all auth goes through the login screen
 * (email/password + Sign in with Google for both new and existing users).
 */
export default function SignupScreen() {
  return <Redirect href="/login" />;
}
