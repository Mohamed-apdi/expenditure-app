# Quickstart: Troubleshooting App Launch Crashes

**Feature**: Fix App Launch Crash
**Date**: 2025-11-09
**Purpose**: Step-by-step guide to identify and diagnose app launch crashes

## Prerequisites

- Android device or emulator connected via USB
- Android Debug Bridge (adb) installed and in PATH
- USB debugging enabled on device
- App installed on device/emulator (or APK/AAB file ready)

## Quick Reference

### 1. Check Crash Logs (Android Logcat)

#### Step 1.1: Connect Device/Emulator

```bash
# Verify device is connected
adb devices

# Expected output:
# List of devices attached
# emulator-5554   device
```

#### Step 1.2: Clear Previous Logs (Optional)

```bash
# Clear log buffer to start fresh
adb logcat -c
```

#### Step 1.3: Capture Crash Logs

**Option A: Real-time monitoring (recommended)**

```bash
# Monitor all errors in real-time
adb logcat *:E

# Filter by app package name
adb logcat | grep com.mohamed_99.qoondeeye

# Filter by React Native/Expo tags
adb logcat | grep -i "reactnative\|expo\|supabase"

# Combined: errors only, filtered by app and React Native
adb logcat *:E | grep -i "com.mohamed_99.qoondeeye\|reactnative\|expo\|supabase\|fatal\|error\|exception"
```

**Option B: Save to file**

```bash
# Save all logs to file
adb logcat > crash-log-$(date +%Y%m%d-%H%M%S).txt

# Save only errors
adb logcat *:E > crash-errors-$(date +%Y%m%d-%H%M%S).txt

# Save filtered logs
adb logcat *:E | grep -i "fatal\|error\|exception\|supabase" > crash-filtered.txt
```

#### Step 1.4: Launch App and Capture Crash

1. Start logcat monitoring (use one of the commands above)
2. Launch the app on device/emulator
3. Wait for crash to occur
4. Stop logcat (Ctrl+C)
5. Review captured logs for error messages

#### Step 1.5: Identify Key Information

Look for these patterns in the logs:

- **FATAL EXCEPTION**: Indicates a fatal crash
- **AndroidRuntime**: Native Android crash
- **ReactNativeJS**: JavaScript error
- **Stack traces**: Shows file names and line numbers
- **Error messages**: Describes what went wrong

**Example log entry**:
```
11-09 14:30:15.123  1234  5678 E AndroidRuntime: FATAL EXCEPTION: main
11-09 14:30:15.123  1234  5678 E AndroidRuntime: Process: com.mohamed_99.qoondeeye, PID: 1234
11-09 14:30:15.123  1234  5678 E AndroidRuntime: java.lang.RuntimeException: Unable to start activity
11-09 14:30:15.123  1234  5678 E AndroidRuntime:     at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:3449)
11-09 14:30:15.123  1234  5678 E AndroidRuntime:     ...
```

---

### 2. Inspect Fatal Exceptions

#### Step 2.1: Filter for Fatal Exceptions

```bash
# Get only fatal exceptions
adb logcat *:F

# Get fatal and error level
adb logcat *:E | grep -i "fatal\|exception"

# Get exceptions with stack traces
adb logcat *:E | grep -A 20 "FATAL EXCEPTION"
```

#### Step 2.2: Analyze Exception Type

**Common exception types and causes**:

| Exception Type | Common Cause | Solution |
|----------------|--------------|----------|
| `java.lang.RuntimeException` | Missing env vars, null reference | Check environment variables, add null checks |
| `com.facebook.react.common.JavascriptException` | JS error in React Native | Check JS console, review component code |
| `java.lang.NullPointerException` | Null object access | Add null checks, verify initialization |
| `Module not found` | Missing dependency | Check package.json, run npm install |
| `Native module not found` | Native module not linked | Rebuild app, check native dependencies |

#### Step 2.3: Extract Stack Trace

The stack trace shows the call chain leading to the crash:

```bash
# Get full stack trace (20 lines after exception)
adb logcat *:E | grep -A 20 "FATAL EXCEPTION"

# Save stack trace to file
adb logcat *:E | grep -A 20 "FATAL EXCEPTION" > stack-trace.txt
```

#### Step 2.4: Identify Root Cause

1. **Find the exception message**: First line after "FATAL EXCEPTION"
2. **Trace the stack**: Follow the stack trace from bottom (your code) to top (system code)
3. **Locate your code**: Look for package name `com.mohamed_99.qoondeeye` or file names from your app
4. **Check the line number**: Stack trace shows exact line causing the crash

**Example analysis**:
```
FATAL EXCEPTION: main
java.lang.RuntimeException: Cannot read property 'SUPABASE_URL' of undefined
    at com.mohamed_99.qoondeeye.lib.database.supabase.createClient(supabase.ts:45)
    at com.mohamed_99.qoondeeye.app._layout.RootLayout(_layout.tsx:120)
```

**Root cause**: Missing SUPABASE_URL environment variable at line 45 of supabase.ts

---

### 3. Handle Dependency/Package Mismatches

#### Step 3.1: Check for Dependency Issues

```bash
# Check Expo SDK compatibility
npx expo-doctor

# Visualize dependency tree
npm ls

# Check for peer dependency warnings
npm install --dry-run 2>&1 | grep -i "peer\|warn\|error"
```

#### Step 3.2: Identify Mismatches

**Common mismatch patterns**:

- **Version conflicts**: Same package with different versions
- **Peer dependency warnings**: Missing or incompatible peer dependencies
- **Expo SDK mismatch**: Expo packages using different SDK versions
- **React Native version conflicts**: Incompatible React Native versions

**Example output**:
```
npm ERR! peer dep missing: expo@^53.0.0, required by expo-router@5.1.7
npm ERR! peer dep missing: react-native@^0.79.0, required by @react-navigation/native@7.0.0
```

#### Step 3.3: Verify Lock File

```bash
# Check if lock file is up to date
git status package-lock.json

# If lock file is outdated or missing:
rm package-lock.json
npm install
```

#### Step 3.4: Resolve Mismatches

**Option A: Clean install (recommended)**

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Verify no errors
npm ls
npx expo-doctor
```

**Option B: Update specific packages**

```bash
# Update Expo SDK
npx expo install expo@latest

# Update React Native (if needed)
npx expo install react-native@latest

# Update all Expo packages to match SDK
npx expo install --fix
```

#### Step 3.5: Verify Resolution

```bash
# Re-run checks
npx expo-doctor
npm ls | grep -i "error\|missing\|invalid"

# Should show no errors
```

---

### 4. Test on Clean Device/Emulator

#### Step 4.1: Set Up Clean Emulator

**Using Android Studio**:

1. Open Android Studio
2. Tools → Device Manager
3. Create Virtual Device → Choose device (e.g., Pixel 5)
4. Select system image (API 33 recommended)
5. Finish and start emulator

**Using command line**:

```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd <avd-name> -wipe-data
```

#### Step 4.2: Set Up Clean Physical Device

```bash
# Uninstall app completely
adb uninstall com.mohamed_99.qoondeeye

# Clear app data (if app still exists)
adb shell pm clear com.mohamed_99.qoondeeye

# Verify app is removed
adb shell pm list packages | grep qoondeeye
# Should return nothing
```

#### Step 4.3: Install Fresh Build

**Option A: Install from APK**

```bash
# Install APK
adb install path/to/app.apk

# Or install and replace existing
adb install -r path/to/app.apk
```

**Option B: Build and install via Expo**

```bash
# Development build
npx expo run:android

# Or use EAS build
eas build --platform android --profile preview --local
adb install build-output.apk
```

#### Step 4.4: Test Launch Scenarios

**Scenario 1: First launch (clean state)**

```bash
# Clear logcat
adb logcat -c

# Start monitoring
adb logcat *:E | grep -i "qoondeeye\|fatal\|error"

# Launch app
adb shell am start -n com.mohamed_99.qoondeeye/.MainActivity

# Observe logs for 10 seconds
```

**Scenario 2: Launch after force stop**

```bash
# Force stop app
adb shell am force-stop com.mohamed_99.qoondeeye

# Clear logcat and monitor
adb logcat -c
adb logcat *:E | grep -i "qoondeeye\|fatal\|error"

# Launch app
adb shell am start -n com.mohamed_99.qoondeeye/.MainActivity
```

**Scenario 3: Launch offline**

```bash
# Enable airplane mode
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE

# Clear logcat and monitor
adb logcat -c
adb logcat *:E | grep -i "qoondeeye\|fatal\|error"

# Launch app
adb shell am start -n com.mohamed_99.qoondeeye/.MainActivity

# Disable airplane mode after test
adb shell settings put global airplane_mode_on 0
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE
```

#### Step 4.5: Compare Results

1. **Clean device**: Should show baseline behavior
2. **Dirty device**: May show cached errors or state issues
3. **Different OS versions**: May reveal compatibility issues
4. **Offline mode**: May reveal network dependency issues

---

## Troubleshooting Workflow

### Complete Diagnostic Process

1. **Capture logs**: Use Step 1 to get crash logs
2. **Analyze exceptions**: Use Step 2 to identify root cause
3. **Check dependencies**: Use Step 3 if crash suggests dependency issue
4. **Test clean**: Use Step 4 to verify fix on clean environment
5. **Document findings**: Record what was found and how it was fixed

### Common Crash Patterns

| Pattern | Logcat Signature | Likely Cause | Quick Fix |
|---------|------------------|--------------|-----------|
| Missing env var | `Cannot read property.*undefined` | EAS secrets not set | Set EAS secrets, rebuild |
| Dependency mismatch | `Module not found\|peer dependency` | Package version conflict | Clean install, update packages |
| Native module error | `Native module.*not found` | Native module not linked | Rebuild app |
| Network error | `Network request failed` | Missing INTERNET permission | Check app.json permissions |
| Null reference | `NullPointerException` | Missing null check | Add null validation |

## Next Steps

After identifying the root cause:

1. **Fix the issue**: Apply appropriate solution
2. **Rebuild app**: Create new build with fix
3. **Test on clean device**: Verify fix works
4. **Monitor**: Check logs after fix to confirm resolution
5. **Document**: Update troubleshooting guide with new findings

## Additional Resources

- [Android Logcat Documentation](https://developer.android.com/studio/command-line/logcat)
- [Expo Debugging Guide](https://docs.expo.dev/debugging/overview/)
- [React Native Debugging](https://reactnative.dev/docs/debugging)
- [EAS Build Troubleshooting](https://docs.expo.dev/build/troubleshooting/)
