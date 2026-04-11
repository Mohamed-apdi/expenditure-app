/**
 * CSV report generator for exporting report data
 * Writes CSV to app documents and supports sharing
 */
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
  if (!data || !data.title) {
    throw new Error('Invalid report data: title is required');
  }

  try {
    let csvContent = '';

    csvContent += `${data.title}\n`;
    if (data.dateRange) {
      csvContent += `Report Period: ${data.dateRange}\n`;
    }
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (data.summary && data.summary.length > 0) {
      csvContent += `SUMMARY\n`;
      csvContent += `Metric,Value\n`;
      data.summary.forEach(item => {
        const safeLabel = String(item.label ?? '').replace(/"/g, '""');
        const safeValue = String(item.value ?? '').replace(/"/g, '""');
        csvContent += `"${safeLabel}","${safeValue}"\n`;
      });
      csvContent += `\n`;
    }

    if (data.tables && data.tables.length > 0) {
      data.tables.forEach((table, index) => {
        if (index > 0) csvContent += `\n`;
        csvContent += `${(table.title ?? 'Data').toUpperCase()}\n`;

        if (table.headers && table.headers.length > 0) {
          csvContent += table.headers.map(header => {
            const safeHeader = String(header ?? '').replace(/"/g, '""');
            return `"${safeHeader}"`;
          }).join(',') + '\n';
        }

        if (table.rows && table.rows.length > 0) {
          table.rows.forEach(row => {
            csvContent += row.map(cell => {
              const safeCell = String(cell ?? '').replace(/"/g, '""');
              return `"${safeCell}"`;
            }).join(',') + '\n';
          });
        }
      });
    }

    const sanitizedTitle = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${sanitizedTitle}_${timestamp}.csv`;

    const documentsDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
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
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate CSV report');
  }
};

export const shareCSV = async (fileUri: string): Promise<void> => {
  if (!fileUri) {
    throw new Error('No file to share');
  }

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error('CSV file not found');
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  let shareUri = fileUri;
  if (Platform.OS === 'ios') {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      const filename = fileUri.split('/').pop() || 'report.csv';
      const cachePath = `${cacheDir}${filename}`;
      try {
        await FileSystem.copyAsync({ from: fileUri, to: cachePath });
        shareUri = cachePath;
      } catch (copyError) {
        console.warn('Could not copy to cache, using original path:', copyError);
      }
    }
  }

  if (Platform.OS === 'android' && !shareUri.startsWith('file://')) {
    shareUri = `file://${shareUri}`;
  }

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
    // Prefer documents directory; fall back to cache (e.g. Expo Go / simulators)
    const documentsDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
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
