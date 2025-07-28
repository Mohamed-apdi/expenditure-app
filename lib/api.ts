import { getItemAsync } from "expo-secure-store";

export const API_URL = "http://192.168.18.124:8000"; // Use your Windows Wi-Fi IP 192.168.18.124

export async function predictExpenditure(inputData: Record<string, any>) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(inputData),
  });

  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Prediction failed");
    } else {
      const text = await response.text(); // <-- fallback
      throw new Error(`Server error: ${text}`);
    }
  }

  const data = await response.json();
  return data;
}


// Expense Analytics API
export async function fetchExpenseOverview(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/expense-overview?period=${period}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense overview");
  }

  return await response.json();
}

export async function fetchExpenseCategories(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/expense-categories?period=${period}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense categories");
  }

  return await response.json();
}

export async function fetchExpenseTrends(period: string) {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/expense-trends?period=${period}&granularity=daily`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expense trends");
  }

  return await response.json();
}



// Prediction Analytics API
export async function fetchPredictionOverview() {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/prediction-overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch prediction overview");
  }

  return await response.json();
}

export async function fetchPredictionCategories() {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/prediction-categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch prediction categories");
  }

  return await response.json();
}

export async function fetchPredictionTrends() {
  const token = await getItemAsync("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/analytics/prediction-trends`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch prediction trends");
  }

  return await response.json();
}