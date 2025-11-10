# Contracts: Troubleshooting App Launch Crashes

**Feature**: Fix App Launch Crash
**Date**: 2025-11-09

## Overview

This feature is a troubleshooting and documentation feature, not an API or service feature. As such, there are no API contracts, service interfaces, or external integrations to define.

## Process Contracts

While there are no technical API contracts, the troubleshooting procedures define implicit "contracts" with tools and systems:

### Android Logcat Contract

**Interface**: Android Debug Bridge (adb) logcat command
**Input**: Device/emulator connection, filter parameters
**Output**: Stream of log entries with structured format

**Expected Format**:
```
[Timestamp] [PID] [TID] [LogLevel] [Tag]: [Message]
```

**Filtering Contract**:
- Error level: `*:E` returns only ERROR and FATAL level logs
- Package filter: `grep com.mohamed_99.qoondeeye` filters by app package
- Tag filter: `grep -i "reactnative\|expo"` filters by log tags

### EAS Build Contract

**Interface**: EAS Build service
**Input**: Build configuration (eas.json), environment secrets
**Output**: Built app artifact (APK/AAB)

**Environment Variable Contract**:
- Secrets must be defined in EAS: `SUPABASE_URL`, `SUPABASE_KEY`
- Build profiles must reference secrets: `"EXPO_PUBLIC_SUPABASE_URL": "@SUPABASE_URL"`
- Secrets are injected at build time, not runtime

### Dependency Verification Contract

**Interface**: npm/yarn package manager
**Input**: package.json, package-lock.json or yarn.lock
**Output**: Dependency tree, conflict reports, peer dependency warnings

**Verification Commands**:
- `npm ls` - Returns dependency tree structure
- `expo-doctor` - Returns Expo SDK compatibility status
- `npm install --dry-run` - Returns peer dependency warnings without installing

## Notes

- These are process contracts, not code contracts
- No API schemas or service interfaces are required
- Troubleshooting procedures rely on standard tool interfaces
- Documentation will specify exact command syntax and expected outputs
