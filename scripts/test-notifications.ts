/**
 * Test script to demonstrate subscription notification functionality
 * This can be used for testing the notification system
 */

import * as Notifications from 'expo-notifications';
import notificationService from '../lib/notificationService';

// Test function to send a sample subscription notification
export const testSubscriptionNotification = async () => {
  try {
    // Request permissions first
    await notificationService.requestNotificationPermissions();
    
    // Setup notification categories
    await notificationService.setupNotificationCategories();
    
    // Send a test notification with interactive buttons
    const testSubscription = {
      id: 'test-sub-1',
      name: 'Netflix',
      amount: 9.99,
      account_id: 'test-account',
      billing_cycle: 'monthly'
    };
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💳 Test Subscription Payment Due',
        body: `${testSubscription.name} - $${testSubscription.amount.toFixed(2)} is due today`,
        categoryIdentifier: 'subscription-payment',
        data: {
          subscriptionId: testSubscription.id,
          subscriptionName: testSubscription.name,
          amount: testSubscription.amount,
          accountId: testSubscription.account_id,
          billingCycle: testSubscription.billing_cycle,
        },
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
    
    console.log('Test notification sent successfully!');
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
};

// Test function to check notification permissions
export const checkNotificationPermissions = async () => {
  try {
    const settings = await Notifications.getPermissionsAsync();
    console.log('Notification permissions:', settings);
    
    if (!settings.granted) {
      console.log('Requesting notification permissions...');
      const request = await Notifications.requestPermissionsAsync();
      console.log('Permission request result:', request);
      return request.granted;
    }
    
    return settings.granted;
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return false;
  }
};

// Test function to schedule a notification for the future
export const testScheduledNotification = async (delaySeconds: number = 10) => {
  try {
    const scheduledDate = new Date(Date.now() + delaySeconds * 1000);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Scheduled Test Notification',
        body: `This notification was scheduled ${delaySeconds} seconds ago`,
        categoryIdentifier: 'subscription-payment',
        data: {
          subscriptionId: 'test-scheduled',
          subscriptionName: 'Test Subscription',
          amount: 5.99,
          accountId: 'test-account',
          billingCycle: 'monthly',
        },
      },
      trigger: { date: scheduledDate },
    });
    
    console.log(`Scheduled notification for ${scheduledDate}`);
    return true;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return false;
  }
};

// Function to test all notification functionality
export const runAllNotificationTests = async () => {
  console.log('🧪 Starting notification tests...');
  
  // Test 1: Check permissions
  console.log('\n1. Checking permissions...');
  const hasPermissions = await checkNotificationPermissions();
  console.log(`✅ Permissions: ${hasPermissions ? 'Granted' : 'Denied'}`);
  
  if (!hasPermissions) {
    console.log('❌ Cannot proceed without notification permissions');
    return false;
  }
  
  // Test 2: Setup categories
  console.log('\n2. Setting up notification categories...');
  try {
    await notificationService.setupNotificationCategories();
    console.log('✅ Categories setup successfully');
  } catch (error) {
    console.log('❌ Failed to setup categories:', error);
    return false;
  }
  
  // Test 3: Send immediate notification
  console.log('\n3. Sending immediate test notification...');
  const immediateResult = await testSubscriptionNotification();
  console.log(`✅ Immediate notification: ${immediateResult ? 'Sent' : 'Failed'}`);
  
  // Test 4: Schedule future notification
  console.log('\n4. Scheduling future notification...');
  const scheduledResult = await testScheduledNotification(30);
  console.log(`✅ Scheduled notification: ${scheduledResult ? 'Scheduled' : 'Failed'}`);
  
  // Test 5: Check scheduled notifications
  console.log('\n5. Checking scheduled notifications...');
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`✅ Found ${scheduled.length} scheduled notifications`);
    scheduled.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.content.title} - ${new Date(notif.trigger?.date || 0)}`);
    });
  } catch (error) {
    console.log('❌ Failed to check scheduled notifications:', error);
  }
  
  console.log('\n🎉 All notification tests completed!');
  console.log('\n📱 Check your device for the test notifications');
  console.log('   - Tap "Pay Now" to test payment flow');
  console.log('   - Tap "Pause" to test pause flow');
  
  return true;
};

export default {
  testSubscriptionNotification,
  checkNotificationPermissions,
  testScheduledNotification,
  runAllNotificationTests,
};
