import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export interface CSVReportData {
  title: string;
  dateRange?: string;
  summary: Array<{ label: string; value: string }>;
  tables: Array<{ title: string; headers: string[]; rows: string[][] }>;
}

export const generateCSVReport = async (
  data: CSVReportData
): Promise<string> => {
  try {
    let csvContent = "";

    // Add title and date range
    csvContent += `${data.title}\n`;
    if (data.dateRange) {
      csvContent += `Report Period: ${data.dateRange}\n`;
    }
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Add summary section
    if (data.summary && data.summary.length > 0) {
      csvContent += `SUMMARY\n`;
      csvContent += `Metric,Value\n`;
      data.summary.forEach((item) => {
        csvContent += `"${item.label}","${item.value}"\n`;
      });
      csvContent += `\n`;
    }

    // Add tables
    data.tables.forEach((table, index) => {
      if (index > 0) csvContent += `\n`;
      csvContent += `${table.title.toUpperCase()}\n`;

      // Add headers
      csvContent +=
        table.headers.map((header) => `"${header}"`).join(",") + "\n";

      // Add rows
      table.rows.forEach((row) => {
        csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
      });
    });

    // Generate unique filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filename = `${data.title.toLowerCase().replace(/\s+/g, "_")}_${timestamp}.csv`;

    // Save to local storage based on platform
    const savedUri = await saveCSVToLocalStorage(csvContent, filename);
    return savedUri;
  } catch (error) {
    console.error("Error generating CSV:", error);
    throw new Error("Failed to generate CSV report");
  }
};

// Function to share the generated CSV
export const shareCSV = async (fileUri: string) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Share CSV Report",
      });
    } else {
      console.log("Sharing not available on this platform");
    }
  } catch (error) {
    console.error("Error sharing CSV:", error);
    throw error;
  }
};

// Function to save CSV to local storage (platform-specific)
export const saveCSVToLocalStorage = async (
  csvContent: string,
  filename: string
): Promise<string> => {
  try {
    if (Platform.OS === "android") {
      // For Android, use Storage Access Framework to save to Downloads folder
      const result =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!result.granted) {
        // Fallback to documents directory if SAF is not granted
        return await saveCSVToDocuments(csvContent, filename);
      }

      // Type guard: result.granted is true, so directoryUri exists
      const directoryUri = (result as { granted: true; directoryUri: string })
        .directoryUri;

      // Create file in user-selected directory
      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        filename,
        "text/csv"
      );

      return safUri;
    } else {
      // For iOS, save to documents directory
      return await saveCSVToDocuments(csvContent, filename);
    }
  } catch (error) {
    console.error("Error saving CSV to local storage:", error);
    // Fallback to documents directory
    return await saveCSVToDocuments(csvContent, filename);
  }
};

// Function to save CSV to documents directory
export const saveCSVToDocuments = async (
  csvContent: string,
  filename: string
): Promise<string> => {
  try {
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error("Documents directory not available");
    }

    const fileUri = `${documentsDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log("CSV saved to documents directory:", fileUri);
    return fileUri;
  } catch (error) {
    console.error("Error saving CSV to documents:", error);
    throw error;
  }
};

// Function to get user-friendly save location message for CSV
export const getCSVSaveLocationMessage = (
  fileUri: string,
  fileName: string
): string => {
  if (Platform.OS === "android") {
    if (fileUri.includes("content://")) {
      return `CSV saved to Downloads folder as ${fileName}`;
    } else {
      return `CSV saved to app documents as ${fileName}`;
    }
  } else {
    return `CSV saved to app documents as ${fileName}`;
  }
};
