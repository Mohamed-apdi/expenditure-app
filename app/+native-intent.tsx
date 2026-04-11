/**
 * Normalize incoming paths on app load/reload to prevent 404.
 * When the app reloads (e.g. press R in dev), the restored path format
 * may not match Expo Router's expected format, causing 404.
 * On initial load, always use root so index can check session and redirect.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (initial) return '/';
    return path;
  } catch {
    return '/';
  }
}
