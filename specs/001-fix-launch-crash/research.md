# Research: Troubleshooting App Launch Crashes

**Feature**: Fix App Launch Crash
**Date**: 2025-11-09
**Phase**: 0 - Research

## Research Objectives

1. Identify best practices for Android Logcat crash log analysis
2. Determine procedures for inspecting fatal exceptions in React Native/Expo apps
3. Research dependency and package mismatch detection methods
4. Establish clean device/emulator testing procedures

## Findings

### 1. Android Logcat Crash Log Analysis

**Decision**: Use Android Debug Bridge (adb) logcat with filtering for React Native, Expo, and error patterns.

**Rationale**:
- `adb logcat` is the standard tool for Android crash debugging
- React Native and Expo apps log to specific tags that can be filtered
- Error-level filtering (`*:E`) captures fatal exceptions
- Combining filters with grep provides focused crash information

**Alternatives considered**:
- Android Studio Logcat viewer: More visual but requires IDE setup
- React Native Debugger: Good for JS errors but misses native crashes
- Expo Dev Tools: Limited to development builds, not production crashes

**Implementation approach**:
- Use `adb logcat *:E` for error-level logs
- Filter by app package: `adb logcat | grep com.mohamed_99.qoondeeye`
- Filter by React Native/Expo tags: `adb logcat | grep -i "reactnative\|expo\|supabase"`
- Combine filters for focused output: `adb logcat *:E | grep -i "fatal\|error\|exception\|supabase"`

### 2. Inspecting Fatal Exceptions

**Decision**: Analyze stack traces from Logcat, focusing on:
- Java/Kotlin native exceptions (AndroidRuntime, FATAL EXCEPTION)
- JavaScript errors (React Native JS errors)
- Native module initialization failures
- Environment variable access errors

**Rationale**:
- Fatal exceptions in Android show complete stack traces in Logcat
- React Native bridges native and JS errors differently
- Missing environment variables cause initialization failures that appear as exceptions
- Stack traces reveal the exact file and line causing the crash

**Key patterns to identify**:
- `FATAL EXCEPTION: main` - Main thread crashes
- `java.lang.RuntimeException` - Runtime errors (often env var related)
- `com.facebook.react.common.JavascriptException` - JS errors
- `Module not found` - Dependency issues
- `Cannot read property of undefined` - Missing env vars or null references

**Implementation approach**:
- Capture full stack traces from Logcat
- Identify exception type and root cause
- Trace back to source code location
- Check for missing null checks or environment variable validation

### 3. Dependency and Package Mismatch Detection

**Decision**: Use multiple verification methods:
- `npm ls` or `yarn list` to check dependency tree
- `expo-doctor` to verify Expo SDK compatibility
- `npx react-native info` for React Native environment check
- Compare `package.json` with `package-lock.json` or `yarn.lock`
- Check for peer dependency warnings during install

**Rationale**:
- Dependency mismatches cause runtime crashes, especially with native modules
- Expo SDK version must match across all Expo packages
- React Native version must be compatible with all native dependencies
- Lock files ensure consistent installs across environments

**Common mismatch scenarios**:
- Expo SDK version mismatch (e.g., expo@53 but expo-router@52)
- React Native version conflicts
- Native module version incompatibilities
- Peer dependency warnings ignored during install

**Implementation approach**:
1. Run `expo-doctor` to check for Expo-related issues
2. Run `npm ls` to visualize dependency tree and identify conflicts
3. Check for peer dependency warnings: `npm install --dry-run`
4. Verify lock file is committed and up to date
5. Clear cache and reinstall: `npm cache clean --force && rm -rf node_modules && npm install`

### 4. Clean Device/Emulator Testing

**Decision**: Use both physical devices and emulators with clean installations:
- Create fresh Android Virtual Device (AVD) with standard configuration
- Use physical device with app uninstalled and reinstalled
- Test on different Android OS versions (API 28, 30, 33+)
- Clear app data and cache before testing

**Rationale**:
- Clean environments eliminate cached data or corrupted state as crash causes
- Different OS versions reveal compatibility issues
- Emulators provide consistent, reproducible test environments
- Physical devices catch hardware-specific issues

**Testing procedure**:
1. **Emulator setup**:
   - Create new AVD in Android Studio
   - Use standard device profile (Pixel 5, API 33)
   - Wipe data before each test

2. **Physical device setup**:
   - Uninstall app completely
   - Clear device cache if possible
   - Reinstall from fresh build

3. **Test scenarios**:
   - First launch (no cached data)
   - Launch after force stop
   - Launch with airplane mode (offline)
   - Launch with restricted permissions

**Implementation approach**:
- Document step-by-step emulator creation
- Provide ADB commands for app uninstall/reinstall
- Include test matrix for different Android versions
- Capture logs from clean state to baseline behavior

## Integration with Existing Codebase

### Current State Analysis

**Existing debug utilities**:
- `lib/utils/envDebug.ts` - Environment variable debugging
- `CRASH_DEBUG_GUIDE.md` - Basic crash debugging steps
- `EAS_BUILD_SETUP.md` - Build and environment setup

**Gaps identified**:
- No systematic Logcat procedure
- Limited fatal exception inspection guidance
- No dependency mismatch detection workflow
- Missing clean device testing procedures

### Recommended Enhancements

1. **Enhance envDebug.ts**:
   - Add Logcat integration helpers
   - Include dependency check utilities
   - Add crash report formatting

2. **Create comprehensive troubleshooting guide**:
   - Step-by-step Logcat procedures
   - Fatal exception analysis workflow
   - Dependency verification checklist
   - Clean device testing protocol

## Tools and Commands Reference

### Android Logcat Commands
```bash
# View all errors
adb logcat *:E

# Filter by app package
adb logcat | grep com.mohamed_99.qoondeeye

# Filter by React Native/Expo
adb logcat | grep -i "reactnative\|expo\|supabase"

# Combined error filter
adb logcat *:E | grep -i "fatal\|error\|exception\|supabase"

# Clear log buffer
adb logcat -c

# Save logs to file
adb logcat > crash-log.txt
```

### Dependency Verification Commands
```bash
# Check Expo environment
npx expo-doctor

# Visualize dependency tree
npm ls

# Check for peer dependency issues
npm install --dry-run

# Clean install
npm cache clean --force
rm -rf node_modules
npm install
```

### Device/Emulator Commands
```bash
# List connected devices
adb devices

# Uninstall app
adb uninstall com.mohamed_99.qoondeeye

# Install APK
adb install path/to/app.apk

# Clear app data
adb shell pm clear com.mohamed_99.qoondeeye
```

## Next Steps

1. Create comprehensive troubleshooting documentation in `docs/troubleshooting/launch-crash-guide.md`
2. Enhance `lib/utils/envDebug.ts` with Logcat helpers (optional)
3. Update existing crash debug guides with new procedures
4. Create quickstart guide for common troubleshooting scenarios
