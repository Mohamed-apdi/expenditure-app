/**
 * Image caching utility for offline support.
 * Caches remote images locally and provides fallback when offline.
 */

import * as FileSystem from "expo-file-system/legacy";

const CACHE_DIR = `${FileSystem.cacheDirectory}image_cache/`;

async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(url: string): string {
  const hash = simpleHash(url);
  return `${CACHE_DIR}${hash}.jpg`;
}

/**
 * Get the cached path for an image URL.
 * Returns the local path if cached, null otherwise.
 */
export async function getCachedImagePath(url: string): Promise<string | null> {
  if (!url || url.startsWith("file://")) return url;
  
  try {
    await ensureCacheDir();
    const cachePath = getCacheKey(url);
    const info = await FileSystem.getInfoAsync(cachePath);
    
    if (info.exists) {
      return cachePath;
    }
    return null;
  } catch (error) {
    console.error("Error checking cached image:", error);
    return null;
  }
}

/**
 * Cache an image from a URL.
 * Downloads the image and stores it locally.
 */
export async function cacheImage(url: string): Promise<string | null> {
  if (!url || url.startsWith("file://")) return url;
  
  try {
    await ensureCacheDir();
    const cachePath = getCacheKey(url);
    
    const info = await FileSystem.getInfoAsync(cachePath);
    if (info.exists) {
      return cachePath;
    }
    
    const downloadResult = await FileSystem.downloadAsync(url, cachePath);
    
    if (downloadResult.status === 200) {
      return cachePath;
    }
    
    return null;
  } catch (error) {
    console.error("Error caching image:", error);
    return null;
  }
}

/**
 * Get an image URI that works offline.
 * Returns cached local path if available, otherwise the original URL.
 * Also triggers caching in background if not cached.
 */
export async function getOfflineImageUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("file://")) return url;
  
  const cached = await getCachedImagePath(url);
  if (cached) {
    return cached;
  }
  
  // Trigger background caching
  cacheImage(url).catch(() => {});
  
  return url;
}

/**
 * Save a local image (e.g., from camera) to cache and return its path.
 * This is used when picking images offline.
 */
export async function saveLocalImageToCache(
  localUri: string,
  userId: string
): Promise<string> {
  await ensureCacheDir();
  
  const timestamp = Date.now();
  const fileName = `profile_${userId}_${timestamp}.jpg`;
  const cachePath = `${CACHE_DIR}${fileName}`;
  
  await FileSystem.copyAsync({
    from: localUri,
    to: cachePath,
  });
  
  return cachePath;
}

/**
 * Clear old cached images (older than 30 days).
 */
export async function clearOldCache(): Promise<void> {
  try {
    await ensureCacheDir();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = `${CACHE_DIR}${file}`;
      const info = await FileSystem.getInfoAsync(filePath);
      
      if (info.exists && info.modificationTime) {
        const age = now - info.modificationTime * 1000;
        if (age > thirtyDays) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
    }
  } catch (error) {
    console.error("Error clearing old cache:", error);
  }
}
