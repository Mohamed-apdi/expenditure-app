# Subscription Notifications System

## Overview
This system replaces the automatic subscription charging with smart notifications that require user interaction before processing payments.

## How it Works

### 1. **Smart Notifications**
- When a subscription is due, the app sends a push notification with interactive buttons
- **No automatic charges** - user must explicitly choose to pay or pause
- Notifications are scheduled in advance for all active subscriptions

### 2. **Interactive Buttons**
Each notification includes two action buttons:

#### **📱 Pay Now**
- Automatically deducts the subscription amount from the linked account
- Creates a transaction record
- Updates the next payment date based on billing cycle
- Shows success confirmation

#### **⏸️ Pause**
- Pauses the subscription (sets `is_active` to `false`)
- Prevents future automatic notifications
- Can be reactivated manually in the app

### 3. **Background Processing**
- Background tasks check for due subscriptions daily
- Notifications are sent on the due date
- Permissions are requested automatically when the app starts

## Features

### **Subscription Screen Enhancements**
- **Notification Status Indicator**: Shows if notifications are enabled/disabled
- **Manual Check Button**: Force check for due subscriptions immediately
- **Smart Status Messages**: Real-time feedback on notification processing

### **Automatic Rescheduling**
- When subscriptions are added/edited/deleted, notifications are automatically rescheduled
- When subscriptions are toggled on/off, relevant notifications are updated
- System maintains sync between subscription status and scheduled notifications

## User Experience

### **Due Date Flow**
1. User receives notification: *"Netflix - $9.99 is due today"*
2. User has 2 choices:
   - Tap **"Pay Now"** → Payment processed automatically
   - Tap **"Pause"** → Subscription paused, no charge
3. User gets confirmation notification of their choice

### **Manual Controls**
- **Check Now Button**: In subscription screen to manually trigger due date checks
- **Toggle Subscriptions**: Turning off a subscription removes its notifications
- **Edit Subscriptions**: Changes automatically update future notifications

## Technical Implementation

### **Files Modified**
- `lib/notificationService.ts` - Core notification logic and handlers
- `app/components/SubscriptionsScreen.tsx` - UI integration and controls
- `app/_layout.tsx` - Global notification listener setup
- `app.json` - Expo notification plugin configuration

### **Key Functions**
- `checkDueSubscriptionsAndNotify()` - Checks and sends due notifications
- `handleNotificationResponse()` - Processes user button taps
- `scheduleAllUpcomingNotifications()` - Schedules notifications for all active subscriptions
- `registerBackgroundTask()` - Sets up background checking

### **Notification Categories**
- Category: `subscription-payment`
- Actions: `PAY_NOW`, `PAUSE_SUBSCRIPTION`
- Interactive: Yes
- Authentication Required: No

## Benefits

1. **🛡️ No Surprise Charges**: User always controls when payments happen
2. **🔔 Smart Reminders**: Never miss a subscription due date
3. **⚡ Quick Actions**: Pay or pause with a single tap
4. **🎯 Selective Control**: Pause individual subscriptions without deleting
5. **📱 Background Safety**: Works even when app is closed
6. **🔄 Auto-Sync**: Notifications stay in sync with subscription changes

## Setup Requirements

### **Dependencies**
```bash
npm install expo-notifications expo-task-manager expo-background-fetch
```

### **Permissions**
The app automatically requests:
- Push notification permissions
- Background refresh permissions (iOS)

### **Configuration**
No additional setup required - the system initializes automatically when the subscription screen loads.

## Troubleshooting

### **Notifications Not Working**
1. Check if notifications are enabled in device settings
2. Ensure app has background refresh permissions
3. Look for notification status in the subscription screen

### **Background Tasks Not Running**
- iOS: Ensure "Background App Refresh" is enabled
- Android: Check battery optimization settings
- Test using the "Check Now" button in the app

### **Interactive Buttons Not Responding**
- Verify notification permissions include interactive actions
- Check that the app is properly handling notification responses
- Test with manual notifications first

## Future Enhancements

- **Customizable Notification Times**: Set preferred notification times
- **Multiple Reminders**: Send reminder notifications before due date
- **Smart Scheduling**: Avoid notifications during sleep hours
- **Payment Method Selection**: Choose which account to charge
- **Batch Actions**: Pay multiple subscriptions at once
