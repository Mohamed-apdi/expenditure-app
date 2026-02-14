import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface CSVReportData {
  title: string;
  dateRange?: string;
  summary: Array<{ label: string; value: string }>;
  tables: Array<{ title: string; headers: string[]; rows: string[][] }>;
}

export const generateCSVReport = async (data: CSVReportData): Promise<string> => {
  try {
    let csvContent = '';

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
      data.summary.forEach(item => {
        csvContent += `"${item.label}","${item.value}"\n`;
      });
      csvContent += `\n`;
    }

    // Add tables
    data.tables.forEach((table, index) => {
      if (index > 0) csvContent += `\n`;
      csvContent += `${table.title.toUpperCase()}\n`;

      // Add headers
      csvContent += table.headers.map(header => `"${header}"`).join(',') + '\n';

      // Add rows
      table.rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.csv`;

    // Save to documents directory
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error('Documents directory not available');
    }

    const fileUri = `${documentsDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Function to share the generated CSV (opens native share sheet so user can save to Files/Downloads)
export const shareCSV = async (fileUri: string): Promise<void> => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  let shareUri = fileUri;
  // On iOS, copy to cache directory first for reliable sharing (workaround for permission issues)
  if (Platform.OS === 'ios') {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      const filename = fileUri.split('/').pop() || 'report.csv';
      const cachePath = `${cacheDir}${filename}`;
      await FileSystem.copyAsync({ from: fileUri, to: cachePath });
      shareUri = cachePath;
    }
  }

  // Ensure URI has file:// prefix for Android
  if (Platform.OS === 'android' && !shareUri.startsWith('file://')) {
    shareUri = `file://${shareUri}`;
  }

  // Small delay to avoid share sheet hang (known expo-sharing iOS issue)
  await new Promise((r) => setTimeout(r, 300));

  await Sharing.shareAsync(shareUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Save CSV Report',
    UTI: Platform.OS === 'ios' ? 'public.comma-separated-values-text' : undefined,
  });
};

// Function to save CSV to downloads directory (Android)
export const saveCSVToDownloads = async (fileUri: string, filename: string) => {
  try {
    // For Android, we can use the MediaLibrary API or Storage Access Framework
    // For now, we'll save to the documents directory which is accessible
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error('Documents directory not available');
    }

    const downloadsPath = `${documentsDir}Downloads/`;

    // Create Downloads directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(downloadsPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadsPath, { intermediates: true });
    }

    const newUri = `${downloadsPath}${filename}`;
    await FileSystem.copyAsync({
      from: fileUri,
      to: newUri
    });

    return newUri;
  } catch (error) {
    console.error('Error saving CSV to downloads:', error);
    throw error;
  }
};
