export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  is_recurring?: boolean;
  entry_type?: "Income" | "Expense" | "Lent" | "Debt/Loan" | "Saving"; // ⬅️ add
};
