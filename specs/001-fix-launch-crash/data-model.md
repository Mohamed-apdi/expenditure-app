# Data Model: Troubleshooting App Launch Crashes

**Feature**: Fix App Launch Crash
**Date**: 2025-11-09
**Phase**: 1 - Design

## Overview

This feature is primarily a documentation and troubleshooting process feature. The data model focuses on the information structures needed to track and diagnose launch crashes, rather than application data entities.

## Information Entities

### Crash Log Entry

**Purpose**: Represents a single crash log entry captured from Android Logcat or error reporting systems.

**Attributes**:
- **Timestamp**: When the crash occurred (ISO 8601 format)
- **Log Level**: Error severity (ERROR, FATAL, WARN)
- **Tag**: Log tag identifier (e.g., "ReactNativeJS", "AndroidRuntime")
- **Message**: Error message or exception description
- **Stack Trace**: Complete stack trace showing call chain
- **Package Name**: App package identifier (com.mohamed_99.qoondeeye)
- **Process ID**: Android process ID where crash occurred
- **Thread**: Thread name where crash occurred (usually "main")

**Relationships**:
- Belongs to a Crash Investigation
- May reference specific Error Pattern

**Validation Rules**:
- Timestamp must be valid ISO 8601 format
- Log level must be one of: DEBUG, INFO, WARN, ERROR, FATAL
- Stack trace must contain at least file name and line number

### Error Pattern

**Purpose**: Categorizes common crash causes for pattern matching and quick diagnosis.

**Attributes**:
- **Pattern Name**: Human-readable pattern identifier
- **Pattern Type**: Category (EnvironmentVariable, DependencyMismatch, NativeModule, NetworkError, etc.)
- **Signature**: Regex or text pattern that identifies this error type
- **Common Causes**: List of typical root causes
- **Resolution Steps**: Ordered list of troubleshooting steps
- **Severity**: Impact level (Critical, High, Medium, Low)

**Examples**:
- **Missing Environment Variable**:
  - Signature: "Cannot read property.*undefined|SUPABASE_URL.*undefined"
  - Common Causes: EAS secrets not set, build profile mismatch, app.config.js misconfiguration
  - Resolution: Verify EAS secrets, check eas.json, rebuild app

- **Dependency Mismatch**:
  - Signature: "Module not found|peer dependency|version mismatch"
  - Common Causes: Package version conflicts, lock file out of sync, npm cache corruption
  - Resolution: Run expo-doctor, check npm ls, clean install

**Relationships**:
- Can match multiple Crash Log Entries
- Has associated Resolution Steps

### Crash Investigation

**Purpose**: Tracks a complete troubleshooting session for a launch crash.

**Attributes**:
- **Investigation ID**: Unique identifier for this investigation
- **Started At**: When investigation began
- **Status**: Current state (In Progress, Resolved, Blocked, Needs More Info)
- **Crash Logs**: Collection of Crash Log Entries
- **Identified Pattern**: Matched Error Pattern (if found)
- **Resolution Applied**: What fix was implemented
- **Verified**: Whether fix was confirmed working
- **Test Environment**: Device/emulator details used for testing

**Relationships**:
- Contains multiple Crash Log Entries
- References one Error Pattern (when identified)
- Associated with Test Environment

**State Transitions**:
- Created → In Progress (when investigation starts)
- In Progress → Resolved (when fix is found and verified)
- In Progress → Blocked (when external dependency blocks progress)
- In Progress → Needs More Info (when additional data required)

### Test Environment

**Purpose**: Describes the environment where crash testing occurs.

**Attributes**:
- **Environment Type**: Physical Device, Emulator, or Simulator
- **Device Model**: Device manufacturer and model
- **OS Version**: Android version (API level)
- **OS Build**: Specific build number
- **App Version**: Version of app being tested
- **Build Type**: Debug, Preview, or Production
- **Build Profile**: EAS build profile used
- **Is Clean**: Whether environment was wiped before testing

**Relationships**:
- Used by Crash Investigation
- May have multiple Crash Investigations

**Validation Rules**:
- OS Version must be valid Android API level (28+)
- App Version must match semantic versioning format
- Build Type must be one of: Debug, Preview, Production

### Dependency Tree

**Purpose**: Represents the npm/yarn dependency structure for mismatch detection.

**Attributes**:
- **Package Name**: npm package identifier
- **Installed Version**: Currently installed version
- **Required Version**: Version specified in package.json
- **Resolved Version**: Version from lock file
- **Parent Packages**: Packages that depend on this one
- **Child Packages**: Packages this one depends on
- **Conflict Status**: Whether version conflicts exist
- **Peer Dependency Warnings**: Any peer dependency issues

**Relationships**:
- Part of dependency tree hierarchy
- May conflict with other Dependency Tree nodes

**Validation Rules**:
- Versions must follow semantic versioning
- Conflict detection must check all dependency paths

## State Diagrams

### Crash Investigation Lifecycle

```
[Created] → [In Progress] → [Resolved]
                ↓
          [Blocked] or [Needs More Info]
                ↓
          [In Progress] → [Resolved]
```

### Error Pattern Matching

```
[Crash Log Entry] → [Pattern Matching] → [Pattern Identified] → [Resolution Steps]
                            ↓
                    [No Match Found] → [Manual Investigation]
```

## Data Flow

### Crash Log Collection Flow

1. **Capture**: Logcat captures crash logs from device/emulator
2. **Filter**: Apply filters (error level, package, tags)
3. **Parse**: Extract structured data (timestamp, level, message, stack trace)
4. **Store**: Save as Crash Log Entry
5. **Analyze**: Match against Error Patterns
6. **Investigate**: Create or update Crash Investigation

### Dependency Verification Flow

1. **Check**: Run dependency verification commands (npm ls, expo-doctor)
2. **Parse**: Extract dependency tree structure
3. **Compare**: Check for version mismatches and conflicts
4. **Report**: Generate Dependency Tree entities with conflict status
5. **Resolve**: Apply fixes and re-verify

## Notes

- This data model is conceptual and used for organizing troubleshooting information
- No database schema is required - information is captured in logs, documentation, and investigation notes
- Error patterns can be maintained as a knowledge base for future troubleshooting
- Crash investigations serve as historical records for similar issues
