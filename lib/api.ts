import { getItemAsync } from "expo-secure-store";

export const API_URL = "https://expenditure-api-ez17.onrender.com";


// Expense Analytics API
export async function fetchExpenseOverview(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(
    `${API_URL}/analytics/expense-overview?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense overview");
  }

  return await response.json();
}

export async function fetchExpenseCategories(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(
    `${API_URL}/analytics/expense-categories?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense categories");
  }

  return await response.json();
}

export async function fetchExpenseTrends(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(
    `${API_URL}/analytics/expense-trends?period=${period}&granularity=daily`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense trends");
  }

  return await response.json();
}
