# EAS Build Setup Guide - Fixing Play Store Crashes

## Critical: Environment Variables Setup

Your app requires environment variables to be set in EAS Build. If these are missing, the app will crash on startup.

### Step 1: Set Environment Variables in EAS

Run these commands to set your environment variables as EAS secrets:

```bash
# Set Supabase URL
eas secret:create --scope project --name SUPABASE_URL --value "your-supabase-url-here"

# Set Supabase Anon Key
eas secret:create --scope project --name SUPABASE_KEY --value "your-supabase-anon-key-here"
```

### Step 2: Verify Secrets

Check that your secrets are set:

```bash
eas secret:list
```

### Step 3: Alternative - Use app.config.js (Not Recommended for Production)

If you prefer to use `app.config.js` instead of secrets, create the file and add:

```javascript
export default {
  expo: {
    // ... your existing config
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
    },
  },
};
```

**⚠️ Warning**: Don't commit sensitive keys to git. Use EAS secrets instead.

## Common Crash Causes & Fixes

### 1. Missing Environment Variables

**Symptom**: App crashes immediately on launch
**Fix**: Set environment variables using EAS secrets (see above)

### 2. New Architecture Issues

**Symptom**: App crashes with native module errors
**Fix**: If you experience issues, temporarily disable new architecture in `app.json`:

```json
"newArchEnabled": false
```

### 3. ProGuard/R8 Minification

**Symptom**: App works in debug but crashes in release
**Fix**: The build should handle this automatically, but if issues persist, check Android build logs

### 4. Missing Permissions

**Symptom**: App crashes when accessing certain features
**Fix**: Permissions have been added to `app.json` - rebuild the app

## Building for Production

### Build a new production version:

```bash
# Build Android App Bundle for Play Store
eas build --platform android --profile production

# Or build APK for testing
eas build --platform android --profile preview
```

### After building:

1. **Test the APK/AAB** before uploading to Play Store
2. **Check crash reports** in Play Console if available
3. **Monitor logs** using:
   ```bash
   adb logcat | grep -i "reactnative\|expo\|supabase"
   ```

## Testing Locally

Before building for production, test with a production-like build:

```bash
# Create a local production build
eas build --platform android --profile production --local
```

## Debugging Crashes

### Enable Crash Reporting

Consider adding a crash reporting service like:

- Sentry (recommended)
- Bugsnag
- Firebase Crashlytics

### Check Logs

1. Connect device via USB
2. Enable USB debugging
3. Run: `adb logcat | grep -i "fatal\|error\|exception"`

### Common Error Patterns

- **"Cannot read property of undefined"**: Missing environment variable
- **"Network request failed"**: Missing INTERNET permission (already added)
- **"Module not found"**: Build configuration issue
- **"Native module not found"**: New architecture compatibility issue

## Next Steps

1. ✅ Set environment variables in EAS
2. ✅ Rebuild the app: `eas build --platform android --profile production`
3. ✅ Test the APK/AAB on a real device
4. ✅ Upload to Play Store Internal Testing first
5. ✅ Monitor crash reports in Play Console

## Need Help?

If the app still crashes:

1. Check Play Console crash reports
2. Review `adb logcat` output
3. Test with a preview build first
4. Consider temporarily disabling new architecture
