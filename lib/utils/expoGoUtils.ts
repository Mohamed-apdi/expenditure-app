import Constants from 'expo-constants';

/**
 * Check if the app is running in Expo Go
 * Expo Go has limitations with SDK 53+ including no push notifications
 */
export const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Get information about the current Expo environment
 */
export const getExpoEnvironmentInfo = () => {
  return {
    isExpoGo,
    sdkVersion: Constants.expoConfig?.sdkVersion || 'unknown',
    appOwnership: Constants.appOwnership,
    hasPushNotifications: !isExpoGo,
    limitations: isExpoGo ? [
      'Push notifications (remote notifications) are not available',
      'Background tasks are limited',
      'Some native features may not work as expected'
    ] : []
  };
};

/**
 * Show a warning message if running in Expo Go
 */
export const showExpoGoWarning = () => {
  if (isExpoGo) {
    console.warn(
      '🚨 Expo Go Limitations Detected 🚨\n' +
      'You are running in Expo Go with SDK 53+.\n' +
      'Push notifications and some native features are not available.\n' +
      'To use all features, create a development build:\n' +
      'https://docs.expo.dev/develop/development-builds/introduction/'
    );
  }
};

/**
 * Check if a feature is available in the current environment
 */
export const isFeatureAvailable = (feature: 'pushNotifications' | 'backgroundTasks' | 'nativeFeatures') => {
  if (isExpoGo) {
    switch (feature) {
      case 'pushNotifications':
      case 'backgroundTasks':
        return false;
      case 'nativeFeatures':
        return false;
      default:
        return false;
    }
  }
  return true;
};
