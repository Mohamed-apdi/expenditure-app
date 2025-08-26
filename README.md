# Qoondeeye - Personal Finance Management App

<div align="center">
  <img src="./assets/images/icon.png" alt="Qoondeeye Logo" width="120" height="120">
  <h3>Smart Expense Tracking & Financial Analytics</h3>
  <p>Cross-platform mobile application for comprehensive personal finance management</p>
</div>

## 🚀 Features

### 💰 Core Financial Management

- **Expense Tracking**: Add, edit, and categorize daily expenses
- **Receipt Scanning**: OCR-powered receipt scanning with automatic data extraction
- **Budget Management**: Set and monitor spending limits across categories
- **Account Management**: Multiple account support with balance tracking
- **Transaction History**: Detailed transaction logs with search and filtering

### 📊 Advanced Analytics

- **Financial Charts**: Interactive charts and graphs for spending patterns
- **Data Visualization**: Multiple chart types including pie charts, line graphs, and bar charts
- **Predictive Analytics**: AI-powered spending predictions and trends
- **Custom Reports**: Generate detailed financial reports and insights
- **Data Export**: CSV and PDF export functionality

### 🎯 Goal & Savings Tracking

- **Savings Goals**: Set financial targets with progress tracking
- **Investment Portfolio**: Monitor investments and returns
- **Debt Management**: Track loans and debt repayment progress
- **Subscription Monitoring**: Manage recurring subscriptions and payments

### 🔔 Smart Notifications

- **Bill Reminders**: Never miss a payment deadline
- **Budget Alerts**: Get notified when approaching spending limits
- **Goal Milestones**: Celebrate financial achievements
- **Custom Notifications**: Personalized alert preferences

### 🌐 Multi-Platform Support

- **iOS & Android**: Native mobile applications
- **Web Platform**: Responsive web interface
- **Cross-Platform Sync**: Real-time data synchronization
- **Offline Support**: Basic functionality without internet connection

## 🛠️ Technology Stack

### Frontend

- **React Native 0.79.5** - Cross-platform mobile development
- **Expo SDK 53** - Development platform and tools
- **TypeScript 5.8.3** - Type-safe JavaScript development
- **NativeWind 4.1.23** - Tailwind CSS for React Native
- **React Navigation 7** - Navigation and routing

### UI Components

- **React Native Paper** - Material Design components
- **Lucide React Native** - Beautiful icon library
- **React Native Reanimated** - Smooth animations
- **Bottom Sheet** - Interactive bottom sheet components

### Charts & Visualization

- **React Native Chart Kit** - Chart components
- **Victory Native** - Data visualization library
- **Gifted Charts** - Advanced charting solutions
- **Circular Progress** - Progress indicators

### Backend & Data

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **React Query** - Data fetching and state management
- **Expo Secure Store** - Secure data storage
- **Expo File System** - File operations

### Development Tools

- **Metro** - JavaScript bundler
- **Babel** - JavaScript compiler
- **Prettier** - Code formatting
- **ESLint** - Code linting

## 📱 Screenshots

_[Screenshots will be added here]_

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **iOS Simulator** (for iOS development)
- **Android Studio** (for Android development)

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
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials
   - Configure API keys for additional services

4. **Start development server**

   ```bash
   # Start Expo development server
   npm run dev

   # Run on specific platform
   npm run dev:ios      # iOS simulator
   npm run dev:android  # Android emulator
   npm run dev:web      # Web browser
   ```

### Build & Deploy

```bash
# Build for production
expo build:android
expo build:ios

# Build for web
expo build:web

# Submit to app stores
expo submit:android
expo submit:ios
```

## 🏗️ Project Structure

```
qoondeeye/
├── app/                    # Main application screens
│   ├── (analytics)/       # Analytics and reporting screens
│   ├── (auth)/           # Authentication screens
│   ├── (expense)/        # Expense management screens
│   ├── (main)/           # Main dashboard and navigation
│   ├── (onboarding)/     # User onboarding flow
│   └── components/       # Reusable UI components
├── assets/               # Images, icons, and static files
├── components/           # Shared components and UI elements
├── lib/                  # Core utilities and services
│   ├── hooks/           # Custom React hooks
│   ├── icons/           # Icon components
│   └── types/           # TypeScript type definitions
├── database/             # Database schemas and migrations
└── types/                # Global type definitions
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

The app uses PostgreSQL with the following main tables:

- **users** - User profiles and authentication
- **expenses** - Expense records and categories
- **accounts** - Financial accounts and balances
- **budgets** - Budget categories and limits
- **goals** - Savings and investment goals
- **transactions** - Financial transaction history
- **notifications** - User notification preferences

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run clean` - Clean build artifacts
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

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
