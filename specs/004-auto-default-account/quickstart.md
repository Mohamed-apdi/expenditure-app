# Quickstart: Auto-Create Default Account on Registration

**Feature**: 004-auto-default-account  
**Date**: 2025-02-14

## Summary

When a new user registers (email/password or Google), the app automatically creates one default account ("Main Account") behind the scenes. The user is not shown a separate "Create your first account" step; they go straight to the Dashboard and can add transactions immediately.

---

## Implementation Summary

### 1. `lib/services/accounts.ts`

- **`ensureDefaultAccount(userId: string)`**: Fetches accounts for the user; if none exist, creates one with name `DEFAULT_ACCOUNT_NAME` ("Main Account"), balance 0, `is_default: true`. Idempotent—safe to call on every login/signup (FR-007: no duplicate defaults).
- **`DEFAULT_ACCOUNT_NAME`**: Constant `"Main Account"` (FR-005).

### 2. `app/(onboarding)/AuthGateScreen.tsx`

- **Email login**: After successful `signInWithPassword`, call `ensureDefaultAccount(data.user.id)` then navigate to Dashboard (covers first-time login after email confirmation).
- **Email signup** (when session exists, e.g. email already confirmed): After storing session, call `ensureDefaultAccount(data.user.id)` then navigate to **Dashboard** (no longer navigate to post-signup-setup).
- **Google sign-in**: After `setSession`, call `ensureDefaultAccount(sessionData.user.id)` then navigate to **Dashboard**. Removed manual `createAccount` and conditional navigation to post-signup-setup.

### 3. `app/(onboarding)/post-signup-setup.tsx`

- Screen no longer shows "Create first account" / "Skip". On mount it ensures default account (calls `ensureDefaultAccount`) and redirects to Dashboard after a short delay. Any flow that still lands here (e.g. deep link) gets a default account and is sent to the app.

---

## Verification

- **New email signup** (with immediate session): User goes to Dashboard with one "Main Account" (no post-signup account screen).
- **New email signup** (confirmation required): After first login, `ensureDefaultAccount` runs and creates "Main Account"; user sees Dashboard with one account.
- **Google sign-in (new user)**: One "Main Account" created, user goes to Dashboard.
- **Existing user login**: `ensureDefaultAccount` is a no-op (accounts.length > 0); no duplicate account.
- **post-signup-setup** (if reached): Ensures default account and redirects to Dashboard.
