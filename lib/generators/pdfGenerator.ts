import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface PDFReportData {
  title: string;
  subtitle?: string;
  dateRange?: string;
  summary: Array<{ label: string; value: string }>;
  charts: any[];
  tables: Array<{ title: string; headers: string[]; rows: string[][] }>;
}

export const generatePDFReport = async (data: PDFReportData): Promise<string> => {
  const htmlContent = generateHTMLContent(data);

  try {
    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Move PDF to Documents directory for consistency
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error('Documents directory not available');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.pdf`;
    const documentsPath = `${documentsDir}${filename}`;

    // Copy from temp location to Documents directory
    await FileSystem.copyAsync({
      from: uri,
      to: documentsPath
    });

    return documentsPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Function to share the generated PDF
export const sharePDF = async (fileUri: string) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF Report'
      });
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
  }
};

// Function to save PDF to documents directory
export const savePDFToDocuments = async (fileUri: string, fileName: string): Promise<string> => {
  try {
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error('Documents directory not available');
    }

    const newUri = `${documentsDir}${fileName}.pdf`;
    await FileSystem.copyAsync({
      from: fileUri,
      to: newUri
    });

    return newUri;
  } catch (error) {
    console.error('Error saving PDF to documents:', error);
    throw error;
  }
};

const generateHTMLContent = (data: PDFReportData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.title} Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 20px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #6c757d;
          margin-bottom: 5px;
        }
        .date-range {
          font-size: 14px;
          color: #6c757d;
        }
        .summary-section {
          margin-bottom: 30px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        .summary-card {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border-left: 4px solid #007bff;
        }
        .summary-label {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 15px;
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 10px;
        }
        .table-container {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }
        th {
          background-color: #f8f9fa;
          font-weight: bold;
          color: #2c3e50;
        }
        tr:hover {
          background-color: #f8f9fa;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #6c757d;
          font-size: 12px;
          border-top: 1px solid #e9ecef;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">${data.title}</div>
          <div class="subtitle">Financial Report</div>
          ${data.dateRange ? `<div class="date-range">Period: ${data.dateRange}</div>` : ''}
          <div class="date-range">Generated: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="summary-section">
          <div class="section-title">Summary</div>
          <div class="summary-grid">
            ${data.summary.map(item => `
              <div class="summary-card">
                <div class="summary-label">${item.label}</div>
                <div class="summary-value">${item.value}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${data.tables.map(table => `
          <div class="table-container">
            <div class="section-title">${table.title}</div>
            <table>
              <thead>
                <tr>
                  ${table.headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${table.rows.map(row => `
                  <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="footer">
          <p>Generated by Expenditure App</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper function to format values for PDF display
const formatValueForPDF = (key: string, value: any): string => {
  if (typeof value === 'number') {
    if (key.includes('amount') || key.includes('cost') || key.includes('balance') || key.includes('budget')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    } else if (key.includes('percentage') || key.includes('progress')) {
      return `${value.toFixed(1)}%`;
    } else {
      return value.toLocaleString();
    }
  }
  return String(value);
};

// Helper function to format currency for PDF
export const formatCurrencyForPDF = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to format percentage for PDF
export const formatPercentageForPDF = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
