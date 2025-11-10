# App Crash Debug Guide

## The Real Problem

Your app crashes because `supabase.ts` is imported at the top level by multiple files (`AccountContext`, `AuthLayout`, `OnboardingLayout`). When these files load, they immediately try to initialize Supabase, which requires `SUPABASE_URL` and `SUPABASE_KEY` environment variables.

If these variables aren't available at runtime, the app throws an error and crashes immediately.

## Root Cause Analysis

1. **Environment Variables Setup**: ✅ You have 4 secrets in EAS:
   - `SUPABASE_URL` ✅
   - `SUPABASE_KEY` ✅
   - `JWT_SECRET` (not used in code, safe to ignore)
   - `OCR_SPACE_API_KEY` (not used in code, safe to ignore)

2. **EAS Configuration**: ✅ Your `eas.json` correctly maps secrets:
   ```json
   "SUPABASE_URL": "@SUPABASE_URL"
   "SUPABASE_KEY": "@SUPABASE_KEY"
   ```

   **Note**: The code uses `SUPABASE_URL` and `SUPABASE_KEY` (without `EXPO_PUBLIC_` prefix), which is correct for EAS builds.

3. **The Problem**: The app you're running was likely built BEFORE:
   - The secrets were added to EAS
   - OR before `eas.json` was updated to include environment variables in all build profiles

## Solution Steps

### Step 1: Verify Secrets Are Set
```bash
eas secret:list
```
You should see `SUPABASE_URL` and `SUPABASE_KEY` listed.

### Step 2: Rebuild the App
**CRITICAL**: You MUST rebuild the app after adding/updating secrets:

```bash
eas build --platform android --profile production
```

The environment variables are only included in NEW builds, not existing ones.

### Step 3: Check Build Logs
When building, you should see in the logs:
```
Environment variables loaded from the "production" build profile "env" configuration:
NODE_ENV, SUPABASE_URL, SUPABASE_KEY.
```

If you don't see `SUPABASE_URL` and `SUPABASE_KEY` in the build logs, the secrets aren't being injected.

### Step 4: Test the New Build
After the build completes:
1. Download and install the new APK/AAB
2. Open the app
3. Check logcat for debug output:
   ```bash
   adb logcat | grep -i "supabase\|env debug"
   ```

You should see:
```
=== SUPABASE ENV DEBUG ===
process.env.SUPABASE_URL: EXISTS
process.env.SUPABASE_KEY: EXISTS
Constants.expoConfig?.extra?.SUPABASE_URL: EXISTS (or MISSING - that's OK)
Constants.expoConfig?.extra?.SUPABASE_KEY: EXISTS (or MISSING - that's OK)
```

**Note**: It's OK if `Constants.expoConfig.extra` shows MISSING - the code will fall back to `process.env` which is populated by EAS builds.

## If It Still Crashes After Rebuild

### Check 1: Verify Secret Values
Make sure your secrets actually have values (not empty):
```bash
# You can't view secret values, but you can verify they exist
eas secret:list
```

### Check 2: Verify eas.json Configuration
Your `eas.json` should have:
```json
{
  "build": {
    "production": {
      "env": {
        "SUPABASE_URL": "@SUPABASE_URL",
        "SUPABASE_KEY": "@SUPABASE_KEY"
      }
    }
  }
}
```

**Current Status**: ✅ Your `eas.json` is correctly configured with `SUPABASE_URL` and `SUPABASE_KEY` in all build profiles (development, preview, production).

### Check 3: Check Logcat for Actual Error
```bash
adb logcat *:E | grep -i "supabase\|error\|exception"
```

This will show the exact error message.

## Common Issues

1. **App built before secrets added**: Rebuild required
2. **Wrong secret names**: Must match exactly (`SUPABASE_URL` not `SUPABASE_URLS`)
3. **Secrets not in correct scope**: Should be `project` scope
4. **Build profile mismatch**: Using `preview` but secrets only in `production` profile

## Current Configuration Status

✅ **Secrets are set in EAS** - `SUPABASE_URL` and `SUPABASE_KEY`
✅ **`eas.json` is configured correctly** - All build profiles (development, preview, production) map secrets correctly
✅ **`app.config.js` exposes variables** - Through `extra` field (may be undefined at build time, that's OK)
✅ **`supabase.ts` checks multiple sources** - Tries `Constants.expoConfig.extra` first, then falls back to `process.env`
✅ **Debug logging is enabled** - Will show detailed environment variable status
✅ **Error handling** - Clear error messages if variables are missing

## Implementation Details

The code uses a fallback strategy:
1. First tries `Constants.expoConfig?.extra?.SUPABASE_URL` (from `app.config.js`)
2. Falls back to `process.env.SUPABASE_URL` (from EAS build environment)

This works because:
- In EAS builds, environment variables from `eas.json` are injected into `process.env` at runtime
- `app.config.js` runs at build time, so `process.env.SUPABASE_URL` may be undefined there
- `supabase.ts` runs at runtime, so it can access `process.env.SUPABASE_URL` from EAS

## Next Steps

**If the app still crashes:**
1. Verify you've rebuilt the app after setting secrets: `eas build --platform android --profile production`
2. Check the build logs to confirm environment variables are being injected
3. Check device logs: `adb logcat | grep -i "supabase\|env debug"`
4. Verify secrets exist: `eas secret:list`

**If the app works:**
✅ The issue is fixed! The app will only work with a fresh build that includes the environment variables.
