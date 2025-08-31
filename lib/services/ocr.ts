// lib/ocr.ts
import { supabase } from "../database/supabase";

export async function scanReceiptWithOCR(
  imageUri: string
): Promise<ScannedData> {
  // No need to upload to Supabase first with OCR.space
  const apiKey = process.env.OCR_SPACE_API_KEY || "K89208548388957"; // Your OCR.space API key
  const apiUrl = "https://api.ocr.space/parse/image";

  // Prepare the form data
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg",
  } as any);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("isTable", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); // Engine 2 is more accurate

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage || "OCR processing failed");
    }

    // Parse the OCR results into structured data
    return parseOCRData(result.ParsedResults[0]?.ParsedText || "");
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}

function parseOCRData(text: string): ScannedData {
  const lines = text.split("\n").filter((line) => line.trim());

  // Enhanced receipt parsing logic
  const result: ScannedData = {
    merchant: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    items: [],
    category: "Other",
    tax: 0,
  };

  // Merchant detection (usually first line)
  if (lines.length > 0) {
    result.merchant = lines[0].trim();
  }

  // Amount detection (look for the largest number that could be a total)
  const amounts: number[] = [];
  lines.forEach((line) => {
    const moneyMatches = line.match(/\d+\.\d{2}/g);
    if (moneyMatches) {
      moneyMatches.forEach((match) => {
        amounts.push(parseFloat(match));
      });
    }
  });

  if (amounts.length > 0) {
    result.amount = Math.max(...amounts);
    // Assume tax is about 5-15% of total
    result.tax = parseFloat((result.amount * 0.1).toFixed(2));
  }

  // Date detection (common date formats)
  const datePatterns = [
    /\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    /\w{3} \d{2}, \d{4}/, // MMM DD, YYYY
  ];

  for (const pattern of datePatterns) {
    const dateMatch = text.match(pattern);
    if (dateMatch) {
      result.date = new Date(dateMatch[0]).toISOString().split("T")[0];
      break;
    }
  }

  // Item detection (lines with prices)
  const itemLines = lines.filter((line) => {
    const hasPrice = /\d+\.\d{2}/.test(line);
    const notTotal = !/total|subtotal|tax|balance/i.test(line.toLowerCase());
    return hasPrice && notTotal && line.trim().length > 3;
  });

  result.items = itemLines.map((line) => {
    const priceMatch = line.match(/\d+\.\d{2}/);
    const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
    const name = line.replace(/\d+\.\d{2}/, "").trim();

    return { name, price };
  });

  // Category detection based on merchant or items
  const categoryKeywords: Record<string, string[]> = {
    Food: ["walmart", "kroger", "safeway", "restaurant", "cafe"],
    Transport: ["shell", "chevron", "gas", "taxi", "uber"],
    Shopping: ["target", "amazon", "best buy", "walmart"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (
      keywords.some(
        (keyword) =>
          result.merchant.toLowerCase().includes(keyword) ||
          result.items.some((item) => item.name.toLowerCase().includes(keyword))
      )
    ) {
      result.category = category;
      break;
    }
  }

  return result;
}
