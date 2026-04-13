/**
 * Expense flow stack: add/edit expense, receipt scanner, detail screens
 */
import { Stack } from "expo-router";

export default function ExpenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddExpense" />
      <Stack.Screen name="ReceiptScanner" />
      <Stack.Screen name="expense-detail" />
      <Stack.Screen name="edit-expense" />
    </Stack>
  );
}
