// lib/compare.ts
import { getItemAsync } from "expo-secure-store";
import { API_URL } from "../services/api";

export async function compareExpenses(data: any, token: string) {
  const response = await fetch(`${API_URL}/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Comparison failed");
  }

  return await response.json();
}
