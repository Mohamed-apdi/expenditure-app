# Quickstart: Fix New User Seeing Other User's Data on Dashboard

**Feature**: 005-fix-user-data-isolation  
**Date**: 2025-02-14

## Summary

When the authenticated user changes (new signup, login as different user, or sign out), the app must not show the previous user's data. Account and balance state is cleared immediately and reloaded for the current user so the dashboard (and other screens) never display another user's accounts or balance.

---

## Implementation Summary

### `lib/providers/AccountContext.tsx`

- **Auth state subscription**: Subscribe to `supabase.auth.onAuthStateChange`. On sign out or when the session user id changes, clear all user-scoped state (accounts, selectedAccount, hasInitialized, loading) so the UI never shows the previous user's data.
- **Current user ref**: `currentUserIdRef` holds the user id we last loaded for. When `session?.user?.id !== currentUserIdRef.current`, we clear state, update the ref, and call `loadAccounts()` for the new user.
- **Clear helper**: `clearUserScopedState()` sets accounts to [], selectedAccount to null, hasInitialized to false, loading to false. Used on sign out and on user change.
- **Initial session**: On provider mount, `getSession()` is used to sync with the stored session (e.g. app reopen); if the session user differs from ref, state is cleared and accounts are loaded for that user.

---

## Verification

- **New user after signup**: Land on dashboard → only that user's default account and balance (e.g. Main Account, $0).
- **Switch user**: Log out, sign in as another user (or register new) → dashboard shows only the current user's data; no flash of previous user's account or balance.
- **App reopen**: Close app, reopen with same or different user session → account list and selected account match the current session user.
