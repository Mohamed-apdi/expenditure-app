/**
 * Profile stack: update profile and related profile screens
 */
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UpdateProfileScreen" />
    </Stack>
  );
}
