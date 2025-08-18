import RNHTMLtoPDF from 'react-native-html-to-pdf';

export interface PDFReportData {
  title: string;
  summary: any;
  charts: any[];
  tables: any[];
  dateRange?: string;
}

export const generatePDFReport = async (data: PDFReportData): Promise<string> => {
  const htmlContent = generateHTMLContent(data);
  
  try {
    const options = {
      html: htmlContent,
      fileName: `${data.title.toLowerCase().replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}`,
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file.filePath || '';
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
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
          padding-bottom: 10px;
          border-bottom: 1px solid #e9ecef;
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
          color: #495057;
        }
        tr:hover {
          background-color: #f8f9fa;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 5px;
        }
        .progress-fill {
          height: 100%;
          background-color: #007bff;
          border-radius: 4px;
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
          <div class="title">${data.title} Report</div>
          <div class="subtitle">Financial Analysis Report</div>
          ${data.dateRange ? `<div class="date-range">${data.dateRange}</div>` : ''}
        </div>

        <div class="summary-section">
          <div class="section-title">Summary</div>
          <div class="summary-grid">
            ${generateSummaryCards(data.summary)}
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
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Household Expenditure App - Financial Reports</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateSummaryCards = (summary: any): string => {
  const cards = [];
  
  for (const [key, value] of Object.entries(summary)) {
    if (typeof value === 'number') {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' && value >= 1000 
        ? `$${value.toLocaleString()}`
        : typeof value === 'number' && value < 1
        ? `${(value * 100).toFixed(1)}%`
        : value;
      
      cards.push(`
        <div class="summary-card">
          <div class="summary-label">${label}</div>
          <div class="summary-value">${formattedValue}</div>
        </div>
      `);
    }
  }
  
  return cards.join('');
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

