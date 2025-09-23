# Qoondeeye - Personal Finance Management App

<div align="center">
  <img src="./assets/images/icon.png" alt="Qoondeeye Logo" width="120" height="120">
  <h3>Smart Expense Tracking & Financial Analytics</h3>
  <p>Cross-platform mobile application for comprehensive personal finance management</p>
</div>

## 🚀 Features

### 💰 Core Financial Management

- **Expense & Income Tracking**: Add, edit, and categorize daily expenses and income
- **Account Management**: Multiple account support with real-time balance tracking
- **Transaction History**: Comprehensive transaction logs with advanced filtering
- **Account Transfers**: Seamless money transfers between accounts
- **Recurring Transactions**: Set up automatic recurring income and expenses

### 📊 Advanced Analytics & Reporting

- **Interactive Dashboard**: Real-time financial overview with key metrics
- **Financial Charts**: Multiple chart types including pie charts, line graphs, and bar charts
- **Custom Reports**: Generate detailed financial reports and insights
- **Data Export**: CSV and PDF export functionality for all financial data
- **Month/Year Navigation**: Easy browsing through historical data

### 🎯 Goal & Savings Management

- **Savings Goals**: Set financial targets with visual progress tracking
- **Goal Categories**: Predefined goal categories with custom icons and colors
- **Investment Tracking**: Monitor investment accounts and returns
- **Debt Management**: Track personal loans (given/taken) with repayment schedules
- **Subscription Monitoring**: Manage recurring subscriptions with payment reminders

### 💳 Account & Budget Management

- **Multiple Account Types**: Support for various account types (checking, savings, credit, etc.)
- **Budget Categories**: Flexible budget categories with spending limits
- **Budget Periods**: Weekly, monthly, yearly, and custom budget periods
- **Account-Specific Budgets**: Set budgets for individual accounts
- **Essential vs Non-Essential**: Categorize expenses for better financial planning

### 🔔 Smart Notifications

- **Push Notifications**: Real-time notifications for important events
- **Bill Reminders**: Never miss a payment deadline
- **Budget Alerts**: Get notified when approaching spending limits
- **Goal Milestones**: Celebrate financial achievements
- **Subscription Alerts**: Upcoming subscription payment reminders

### 🌐 Multi-Platform Support

- **iOS & Android**: Native mobile applications with platform-specific optimizations
- **Web Platform**: Responsive web interface for desktop access
- **Cross-Platform Sync**: Real-time data synchronization across all devices
- **Offline Support**: Basic functionality without internet connection
- **Expo Go Integration**: Easy testing and development with Expo Go app

### 🎨 Modern UI/UX

- **Dark/Light Theme**: Automatic theme switching based on system preferences
- **Intuitive Navigation**: Tab-based navigation with smooth transitions
- **Responsive Design**: Optimized for all screen sizes and orientations
- **Accessibility**: Built with accessibility best practices
- **Smooth Animations**: Delightful micro-interactions and transitions

## 🛠️ Technology Stack

### Frontend

- **React Native 0.79.5** - Cross-platform mobile development
- **Expo SDK 53** - Development platform and tools
- **TypeScript 5.8.3** - Type-safe JavaScript development
- **NativeWind 4.1.23** - Tailwind CSS for React Native
- **Expo Router 5.1.6** - File-based navigation and routing
- **React 19.0.0** - Latest React with concurrent features

### UI Components

- **@rn-primitives** - Modern UI primitives (Avatar, Checkbox, Progress, Select, Switch, Tooltip)
- **Lucide React Native 0.511.0** - Beautiful icon library
- **React Native Reanimated 3.17.4** - Smooth animations and gestures
- **@gorhom/bottom-sheet 5.1.6** - Interactive bottom sheet components
- **React Native Paper Dates 0.22.49** - Date picker components

### Charts & Visualization

- **React Native Chart Kit 6.12.0** - Chart components
- **React Native Gifted Charts 1.4.63** - Advanced charting solutions
- **React Native Circular Progress 1.4.1** - Progress indicators
- **React Native SVG 15.11.2** - SVG support for charts

### Backend & Data

- **Supabase 2.50.2** - Backend-as-a-Service with PostgreSQL
- **TanStack React Query 5.85.5** - Data fetching and state management
- **Zustand 5.0.8** - Lightweight state management
- **Expo Secure Store 14.2.4** - Secure data storage
- **Expo File System 18.1.11** - File operations

### Authentication & Security

- **@react-native-google-signin/google-signin 15.0.0** - Google Sign-In integration
- **Expo Auth Session 6.2.1** - OAuth authentication
- **Expo Secure Store** - Secure credential storage

### Notifications & Background Tasks

- **Expo Notifications 0.31.4** - Push notifications
- **Expo Background Fetch 13.1.6** - Background task execution
- **Expo Task Manager 13.1.6** - Task scheduling

### Development Tools

- **Metro** - JavaScript bundler
- **Babel 7.26.0** - JavaScript compiler
- **Prettier with Tailwind Plugin** - Code formatting
- **React Native Dotenv 3.4.11** - Environment variable management

## 📱 Screenshots

<div align="center">
  <h3>App Screenshots</h3>
  <p><em>Screenshots showcasing the app's interface and features</em></p>

  <!-- Screenshots will be added here -->
  <p><strong>Coming Soon:</strong> Screenshots of the main dashboard, expense tracking, budget management, and other key features will be added here.</p>

  <h4>Key Screens to be Featured:</h4>
  <ul style="text-align: left; display: inline-block;">
    <li>📊 Dashboard with financial overview</li>
    <li>💰 Add Expense/Income screen</li>
    <li>🏦 Account management interface</li>
    <li>📈 Budget tracking and analytics</li>
    <li>🎯 Goals and savings progress</li>
    <li>📱 Settings and profile management</li>
  </ul>
</div>

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Expo Go app** (for testing on physical devices)
- **iOS Simulator** (for iOS development - macOS only)
- **Android Studio** (for Android development)
- **EAS CLI** (`npm install -g eas-cli`) - for building and deployment

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Mohamed-apdi/expenditure-app
   cd expenditure-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
     ```

4. **Start development server**

   ```bash
   # Start Expo development server with cache clearing
   npm run dev

   # Run on specific platform
   npm run ios         # iOS simulator
   npm run android     # Android emulator
   npm run web         # Web browser
   ```

5. **Test on physical device**
   - Install Expo Go app on your phone
   - Scan the QR code from the terminal
   - The app will load on your device

### Build & Deploy

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to EAS
eas login

# Configure build
eas build:configure

# Build for production
eas build --platform android
eas build --platform ios

# Build for web
expo export:web

# Submit to app stores
eas submit --platform android
eas submit --platform ios
```

## 🏗️ Project Structure

```
expenditure-app/
├── app/                           # Main application screens (Expo Router)
│   ├── (auth)/                   # Authentication screens
│   │   ├── _layout.tsx           # Auth layout wrapper
│   │   ├── login.tsx             # Login screen
│   │   └── signup.tsx            # Registration screen
│   ├── (expense)/                # Expense management screens
│   │   ├── _layout.tsx           # Expense layout wrapper
│   │   └── AddExpense.tsx        # Add/edit expense screen
│   ├── (main)/                   # Main dashboard and navigation
│   │   ├── _layout.tsx           # Main layout with tab navigation
│   │   ├── Dashboard.tsx         # Main dashboard screen
│   │   ├── Accounts.tsx          # Account management
│   │   ├── BudgetScreen.tsx     # Budget tracking
│   │   ├── ReportsScreen.tsx    # Financial reports
│   │   ├── SettingScreen.tsx    # App settings
│   │   └── notifications.tsx    # Notification center
│   ├── (onboarding)/             # User onboarding flow
│   │   ├── _layout.tsx           # Onboarding layout
│   │   ├── welcomeScreen.tsx     # Welcome screen
│   │   ├── AuthGateScreen.tsx    # Authentication gate
│   │   ├── profile-setup.tsx     # Profile setup
│   │   ├── account-setup.tsx     # Account setup
│   │   └── inputCategoriesScreen.tsx # Category selection
│   ├── (profile)/                # Profile management
│   │   ├── _layout.tsx           # Profile layout
│   │   └── UpdateProfileScreen.tsx # Profile editing
│   ├── (transactions)/           # Transaction management
│   │   ├── edit-transaction/     # Transaction editing
│   │   └── transaction-detail/   # Transaction details
│   ├── account-details/          # Account detail screens
│   │   ├── [id].tsx             # Dynamic account details
│   │   ├── add-account.tsx      # Add new account
│   │   └── edit/                # Account editing
│   ├── components/               # Screen-specific components
│   │   ├── Debt_Loan.tsx        # Debt/loan management
│   │   ├── Investments.tsx      # Investment tracking
│   │   ├── SavingsScreen.tsx    # Savings management
│   │   ├── SubscriptionsScreen.tsx # Subscription tracking
│   │   └── TransactionsScreen.tsx # Transaction listing
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # App entry point
│   └── +not-found.tsx           # 404 error screen
├── components/                   # Shared UI components
│   ├── (Dashboard)/             # Dashboard-specific components
│   │   ├── DashboardHeader.tsx  # Dashboard header
│   │   ├── MemoizedTransactionItem.tsx # Transaction list item
│   │   ├── MonthYearScroll.tsx  # Date picker component
│   │   └── WalletDropdown.tsx   # Account selector
│   ├── ui/                      # Reusable UI primitives
│   │   ├── avatar.tsx           # Avatar component
│   │   ├── button.tsx           # Button component
│   │   ├── card.tsx             # Card component
│   │   ├── checkbox.tsx         # Checkbox component
│   │   ├── input.tsx            # Input component
│   │   ├── progress.tsx         # Progress indicator
│   │   ├── select.tsx           # Select dropdown
│   │   ├── switch.tsx           # Toggle switch
│   │   ├── text.tsx             # Text component
│   │   └── tooltip.tsx          # Tooltip component
│   ├── CustomTabBar.tsx         # Custom tab bar
│   ├── ExpoGoWarning.tsx        # Expo Go warning component
│   ├── FinancialCharts.tsx      # Chart components
│   └── NotificationPermissionRequest.tsx # Notification permission
├── lib/                         # Core utilities and services
│   ├── config/                  # Configuration files
│   │   ├── language/            # Internationalization
│   │   ├── storage/             # Storage configuration
│   │   └── theme/               # Theme configuration
│   ├── database/                # Database connection
│   │   └── supabase.ts          # Supabase client
│   ├── generators/              # Report generators
│   │   ├── csvGenerator.ts      # CSV export
│   │   └── pdfGenerator.ts      # PDF export
│   ├── hooks/                   # Custom React hooks
│   │   ├── useDashboardData.ts  # Dashboard data hook
│   │   └── useNotifications.ts  # Notification hook
│   ├── icons/                   # Icon components
│   ├── providers/               # Context providers
│   │   ├── AccountContext.tsx   # Account state management
│   │   └── LanguageProvider.tsx # Language state management
│   ├── services/                # Business logic services
│   ├── store/                   # State management
│   ├── types/                   # TypeScript type definitions
│   │   └── types.ts             # Main type definitions
│   └── utils/                   # Utility functions
├── assets/                      # Static assets
│   ├── android/                 # Android-specific assets
│   ├── goal_icons/              # Goal category icons
│   ├── images/                  # App images and icons
│   └── sounds/                  # Audio files
├── types/                       # Global type definitions
│   ├── env.d.ts                 # Environment types
│   └── expense.ts               # Expense-specific types
├── android/                     # Android native code
├── app.json                     # Expo configuration
├── package.json                 # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

## 🔧 Configuration

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Supabase Setup

1. Create a new Supabase project
2. Set up database tables using SQL files in `/database/`
3. Configure authentication providers
4. Set up storage buckets for file uploads

## 📊 Database Schema

The app uses PostgreSQL with Supabase as the backend service. The database schema includes the following main tables:

### Core Tables

- **users** - User profiles and authentication data
- **profiles** - Extended user profile information (full_name, phone, user_type, image_url)

### Financial Management

- **accounts** - Financial accounts with balance tracking
  - `account_type` - Type of account (renamed from group_name)
  - `is_asset` - Boolean indicating if account is an asset
  - `amount` - Current account balance
- **account_groups** - Account categorization and grouping
- **account_types** - Predefined account types and categories

### Transactions & Expenses

- **expenses** - Expense and income records
  - `entry_type` - "Income" or "Expense"
  - `is_recurring` - Recurring transaction flag
  - `is_essential` - Essential expense classification
  - `account_id` - Associated account
- **transactions** - Unified transaction history
  - `type` - "expense", "income", or "transfer"
  - `is_recurring` - Recurring transaction flag
  - Transfer-specific fields for account transfers
- **transfers** - Account-to-account transfers
  - `from_account_id` and `to_account_id` - Transfer endpoints
  - `amount` - Transfer amount

### Budgeting & Goals

- **budgets** - Budget categories and spending limits
  - `period` - Budget period (this_week, this_month, next_month, this_year, custom)
  - `is_active` - Active budget status
  - `account_id` - Optional account-specific budgets
- **goals** - Savings and financial goals
  - `target_amount` and `current_amount` - Goal progress tracking
  - `target_date` - Goal deadline
  - `icon` and `icon_color` - Visual representation
  - `is_active` - Active goal status

### Subscriptions & Loans

- **subscriptions** - Recurring subscription management
  - `billing_cycle` - weekly, monthly, yearly
  - `next_payment_date` - Upcoming payment
  - `icon` and `icon_color` - Visual representation
- **personal_loans** - Loan tracking (given/taken)
  - `type` - "loan_given" or "loan_taken"
  - `principal_amount` and `remaining_amount` - Loan amounts
  - `interest_rate` - Interest rate percentage
  - `status` - active, partial, settled
- **loan_repayments** - Loan payment history

### Notifications

- **notifications** - User notification preferences and settings

## 🧪 Testing

Currently, the project doesn't have automated tests set up. Testing is done manually through:

- **Expo Go App**: Test on physical devices using Expo Go
- **iOS Simulator**: Test iOS-specific features (macOS only)
- **Android Emulator**: Test Android-specific features
- **Web Browser**: Test web platform functionality

### Future Testing Plans

```bash
# Planned testing commands (to be implemented)
npm test                    # Unit tests
npm run test:coverage      # Test coverage
npm run test:e2e          # End-to-end tests
npm run test:integration  # Integration tests
```

## 📦 Available Scripts

- `npm run dev` - Start Expo development server with cache clearing
- `npm run dev:web` - Start development server for web platform
- `npm run dev:android` - Start development server for Android
- `npm run android` - Alias for dev:android
- `npm run ios` - Start development server for iOS
- `npm run web` - Alias for dev:web
- `npm run clean` - Clean Expo cache and node_modules
- `npm run postinstall` - Generate NativeWind CSS after installation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo** team for the amazing development platform
- **React Native** community for continuous improvements
- **Supabase** for the powerful backend services
- All contributors and beta testers

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/qoondeeye/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/qoondeeye/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/qoondeeye/discussions)
- **Email**: support@qoondeeye.com

## 🔮 Roadmap

- [ ] **AI-Powered Insights**: Advanced financial recommendations
- [ ] **Multi-Currency Support**: International expense tracking
- [ ] **Family Accounts**: Shared financial management
- [ ] **Investment Tracking**: Portfolio management and analysis
- [ ] **Tax Preparation**: Tax document generation and filing
- [ ] **Voice Commands**: Voice-controlled expense entry
- [ ] **Wearable Integration**: Smartwatch and fitness tracker support

---

<div align="center">
  <p>Made with ❤️ by the Qoondeeye Team</p>
  <p>Empowering financial literacy, one transaction at a time.</p>
</div>
