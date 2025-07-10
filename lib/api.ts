import { getItemAsync } from "expo-secure-store";

export const API_URL = "http://192.168.100.83:8000"; // Use your Windows Wi-Fi IP
//export const API_URL = "http://10.35.128.149:8000"; // Use your Windows phone IP

export async function predictExpenditure(inputData: Record<string, any>) {
  console.log("Sending payload to backend:", inputData);

  const token = await getItemAsync("token");
  console.log("Retrieved token:", token);

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
