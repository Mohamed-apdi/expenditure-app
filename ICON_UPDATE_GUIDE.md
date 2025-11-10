# Icon Update Guide - Fixing Old Icons Showing

## Problem
After changing app icons and splash screens, the old icons still appear because they are cached in:
1. **Development cache** (`.expo` folder, Metro cache)
2. **Native build cache** (iOS/Android build folders)
3. **Device cache** (installed app on device)

## Solution Steps

### Step 1: Clear Development Caches ✅ (Already Done)
The following caches have been cleared:
- `.expo` directory
- Metro cache (`node_modules/.cache`)

### Step 2: For Development (Expo Go / Development Build)

Run with cleared cache:
```bash
expo start -c
```

The `-c` flag clears the cache. This should update icons in development mode.

### Step 3: For Production Builds (Standalone Apps)

**IMPORTANT**: Icons are embedded in native builds. You MUST rebuild the app for icons to update.

#### For Android:
```bash
# Clear Android build cache
npx expo prebuild --clean

# Or rebuild with EAS
eas build --platform android --profile production --clear-cache
```

#### For iOS:
```bash
# Clear iOS build cache
npx expo prebuild --clean

# Or rebuild with EAS
eas build --platform ios --profile production --clear-cache
```

### Step 4: Verify Icon Files

Make sure these files exist and are your NEW icons:
- ✅ `./assets/images/icon.png` (1024x1024 recommended)
- ✅ `./assets/images/adaptive-icon.png` (Android, 1024x1024)
- ✅ `./assets/images/splash-white.png` (Splash screen)
- ✅ `./assets/images/favicon.png` (Web)

### Step 5: Configuration Check

Your `app.config.js` (which takes precedence over `app.json`) has:
- ✅ Icon path: `./assets/images/icon.png`
- ✅ Splash: `./assets/images/splash-white.png`
- ✅ Adaptive icon: `./assets/images/adaptive-icon.png`

### Step 6: Uninstall Old App (If Testing on Device)

If you're testing on a physical device:
1. **Uninstall the old app completely**
2. Install the newly built app
3. Device may cache icons, so a fresh install is needed

### Step 7: Clear Device Cache (Android)

For Android devices:
```bash
adb shell pm clear com.mohamed_99.qoondeeye
```

## Quick Commands Reference

```bash
# Development - Clear cache and start
expo start -c

# Android - Rebuild with cache clear
eas build --platform android --profile production --clear-cache

# iOS - Rebuild with cache clear
eas build --platform ios --profile production --clear-cache

# Prebuild clean (if using bare workflow)
npx expo prebuild --clean
```

## Why This Happens

1. **Development**: Expo caches assets in `.expo` folder
2. **Native Builds**: Icons are compiled into native code during build
3. **Device**: Android/iOS cache app icons in system launcher

## Notes

- `app.config.js` takes precedence over `app.json` (both are synced now)
- Icons must be exact sizes: 1024x1024 for best results
- Splash screens need to match the exact dimensions
- Always rebuild native apps after changing icons
