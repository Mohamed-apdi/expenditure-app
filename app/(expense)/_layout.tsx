import { Stack } from "expo-router";

export default function ExpenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddExpense" />
      <Stack.Screen name="expense-detail" />
      <Stack.Screen name="edit-expense" />
    </Stack>
  );
}
