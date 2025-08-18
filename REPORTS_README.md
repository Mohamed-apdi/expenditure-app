# Reports System Documentation

## Overview

The Reports System provides comprehensive financial analysis and reporting capabilities for the Household Expenditure App. It includes multiple report types with interactive charts, detailed tables, and export functionality.

## Features

### 📊 Report Types

1. **Transactions Report**
   - Spending by category breakdown
   - Daily spending trends
   - Transaction summary statistics
   - Date range filtering

2. **Accounts Report**
   - Account balance overview
   - Balance distribution by account type
   - Individual account details

3. **Budget Report**
   - Budget vs actual spending comparison
   - Category-wise budget analysis
   - Progress tracking with visual indicators

4. **Subscriptions Report**
   - Monthly and yearly subscription costs
   - Cost breakdown by category
   - Individual subscription details

5. **Goals Report**
   - Goal progress tracking
   - Savings overview
   - Individual goal details with progress bars

### 📈 Charts and Visualizations

- **Pie Charts**: Category breakdowns and distributions
- **Bar Charts**: Trends and comparisons
- **Progress Bars**: Budget usage and goal progress
- **Summary Cards**: Key metrics at a glance

### 📤 Export Features

- **CSV Export**: Download data in spreadsheet format
- **PDF Export**: Generate professional PDF reports
- **Date Range Filtering**: Custom date ranges for transaction reports

## API Endpoints

### Backend API (FastAPI)

```python
# Transaction Reports
GET /reports/transactions?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

# Account Reports
GET /reports/accounts

# Budget Reports
GET /reports/budget

# Subscription Reports
GET /reports/subscriptions

# Goal Reports
GET /reports/goals

# Download Reports
GET /reports/download/{report_type}?format=csv|pdf&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

### Frontend API Functions

```typescript
// Fetch report data
getTransactionReports(startDate: string, endDate: string): Promise<TransactionReport>
getAccountReports(): Promise<AccountReport>
getBudgetReports(): Promise<BudgetReport>
getSubscriptionReports(): Promise<SubscriptionReport>
getGoalReports(): Promise<GoalReport>

// Download reports
downloadReport(reportType: string, format: 'csv' | 'pdf', startDate?: string, endDate?: string)
generateLocalPDFReport(reportType: string, data: any, dateRange?: { startDate: string; endDate: string })
```

## Data Structures

### TransactionReport
```typescript
interface TransactionReport {
  summary: {
    total_amount: number;
    total_transactions: number;
    average_transaction: number;
    period: string;
  };
  category_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  daily_trends: Array<{
    date: string;
    amount: number;
  }>;
  monthly_trends: Array<{
    month: string;
    amount: number;
  }>;
  transactions: any[];
}
```

### AccountReport
```typescript
interface AccountReport {
  summary: {
    total_accounts: number;
    total_balance: number;
    account_types: number;
  };
  accounts: any[];
  by_type: Record<string, {
    count: number;
    total_balance: number;
    accounts: any[];
  }>;
}
```

### BudgetReport
```typescript
interface BudgetReport {
  summary: {
    total_budget: number;
    total_spent: number;
    total_remaining: number;
    overall_percentage_used: number;
  };
  budget_analysis: Array<{
    category: string;
    budget_amount: number;
    spent_amount: number;
    remaining: number;
    percentage_used: number;
  }>;
  budgets: any[];
}
```

### SubscriptionReport
```typescript
interface SubscriptionReport {
  summary: {
    total_subscriptions: number;
    total_monthly_cost: number;
    total_yearly_cost: number;
  };
  subscriptions: any[];
  by_category: Record<string, {
    count: number;
    total_monthly_cost: number;
    subscriptions: any[];
  }>;
}
```

### GoalReport
```typescript
interface GoalReport {
  summary: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    total_target: number;
    total_saved: number;
    total_progress: number;
  };
  goals: any[];
  active_goals: any[];
  completed_goals: any[];
}
```

## Usage

### Basic Usage

```typescript
import { getTransactionReports, downloadReport } from '~/lib/api';

// Fetch transaction reports
const transactionData = await getTransactionReports('2024-01-01', '2024-01-31');

// Download CSV report
await downloadReport('transactions', 'csv', '2024-01-01', '2024-01-31');

// Generate PDF report
await generateLocalPDFReport('transactions', transactionData, {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### In ReportsScreen Component

The ReportsScreen component automatically handles:
- Tab navigation between different report types
- Data fetching for each report type
- Date range selection for transaction reports
- Chart rendering and data visualization
- Export functionality (CSV and PDF)

## Dependencies

### Required Packages

```json
{
  "react-native-html-to-pdf": "^0.12.0",
  "react-native-chart-kit": "^6.12.0",
  "react-native-paper-dates": "^0.18.0"
}
```

### Backend Dependencies

```python
fastapi==0.104.1
supabase==2.0.0
python-dotenv==1.0.0
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install react-native-html-to-pdf react-native-chart-kit react-native-paper-dates
   ```

2. **Start Backend API**
   ```bash
   cd householdAPI
   python main.py
   ```

3. **Configure API URL**
   Update `API_BASE_URL` in `lib/api.ts` to match your backend URL.

4. **Run the App**
   ```bash
   npx expo start
   ```

## Customization

### Adding New Report Types

1. Add new endpoint in `householdAPI/main.py`
2. Create interface in `lib/api.ts`
3. Add tab configuration in `ReportsScreen.tsx`
4. Implement render function for the new tab

### Customizing Charts

The charts use `react-native-chart-kit` and can be customized by modifying:
- Chart colors and styling
- Data formatting
- Chart dimensions and layout

### PDF Template Customization

PDF reports are generated using HTML templates in `lib/pdfGenerator.ts`. You can customize:
- Styling and layout
- Content structure
- Branding and colors

## Error Handling

The system includes comprehensive error handling:
- Network request failures
- Data validation errors
- PDF generation errors
- File download errors

All errors are logged and displayed to users via Alert dialogs.

## Performance Considerations

- Data is cached per tab to avoid unnecessary API calls
- Charts are rendered only when data is available
- PDF generation is done locally to reduce server load
- Large datasets are paginated where appropriate

## Security

- All API endpoints require authentication
- User data is filtered by user ID
- Sensitive data is not logged
- File downloads are validated

## Troubleshooting

### Common Issues

1. **Charts not rendering**: Check if data is properly formatted
2. **PDF generation fails**: Ensure react-native-html-to-pdf is properly installed
3. **API calls failing**: Verify backend is running and API_BASE_URL is correct
4. **Date picker not working**: Check react-native-paper-dates installation

### Debug Mode

Enable debug logging by setting:
```typescript
console.log('Debug mode enabled');
```

## Future Enhancements

- Real-time data updates
- Advanced filtering options
- Custom chart types
- Email report delivery
- Scheduled report generation
- Data export to other formats (Excel, JSON)
- Interactive drill-down capabilities
- Comparative analysis features

