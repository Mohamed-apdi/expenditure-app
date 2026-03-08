/**
 * CachedImage component - displays images with offline support.
 * Automatically caches remote images for offline viewing.
 * Shows gradient avatar with initials as fallback.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Image, ImageProps, View, ActivityIndicator, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getCachedImagePath, cacheImage } from "~/lib/utils/imageCache";

// Gradient color pairs for avatars
const GRADIENT_COLORS: [string, string][] = [
  ["#667eea", "#764ba2"], // Purple-violet
  ["#f093fb", "#f5576c"], // Pink-red
  ["#4facfe", "#00f2fe"], // Blue-cyan
  ["#43e97b", "#38f9d7"], // Green-teal
  ["#fa709a", "#fee140"], // Pink-yellow
  ["#a8edea", "#fed6e3"], // Teal-pink (light)
  ["#ff9a9e", "#fecfef"], // Pink-rose
  ["#ffecd2", "#fcb69f"], // Orange-peach
  ["#a18cd1", "#fbc2eb"], // Purple-pink
  ["#fad0c4", "#ffd1ff"], // Peach-pink
  ["#ff8177", "#cf556c"], // Red-magenta
  ["#00c6fb", "#005bea"], // Cyan-blue
  ["#f83600", "#f9d423"], // Orange-yellow
  ["#e0c3fc", "#8ec5fc"], // Purple-blue (light)
  ["#667eea", "#f093fb"], // Purple-pink
  ["#11998e", "#38ef7d"], // Teal-green
];

function getGradientForName(name: string): [string, string] {
  let hash = 0;
  const str = name || "Q";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[index];
}

function getInitials(name: string | undefined | null): string {
  if (!name || name.trim() === "") {
    return "Q";
  }
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface CachedImageProps extends Omit<ImageProps, "source"> {
  uri: string | null | undefined;
  fallbackName?: string;
  fallbackColor?: string;
  showPlaceholder?: boolean;
  placeholderIconSize?: number;
  userId?: string;
}

export function CachedImage({
  uri,
  fallbackName,
  fallbackColor = "#94a3b8",
  showPlaceholder = true,
  placeholderIconSize = 36,
  userId,
  style,
  ...imageProps
}: CachedImageProps): React.ReactElement | null {
  const [displayUri, setDisplayUri] = useState<string | null>(uri || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Generate consistent gradient based on name or userId
  const gradientKey = fallbackName || userId || "Q";
  const gradientColors = useMemo(() => getGradientForName(gradientKey), [gradientKey]);
  const initials = useMemo(() => getInitials(fallbackName), [fallbackName]);

  useEffect(() => {
    // Reset error state when uri changes
    setError(false);
    
    // Handle null, undefined, or empty string
    if (!uri || uri.trim() === "") {
      setDisplayUri(null);
      return;
    }

    // If it's a local file, use directly
    if (uri.startsWith("file://")) {
      setDisplayUri(uri);
      return;
    }

    // For remote URLs, use directly and try to cache in background
    setDisplayUri(uri);
    
    // Try to get cached version (async, non-blocking)
    getCachedImagePath(uri)
      .then((cached) => {
        if (cached) {
          setDisplayUri(cached);
        }
      })
      .catch(() => {
        // Ignore cache errors, we already have the remote URL
      });

    // Cache for future offline use (fire and forget)
    cacheImage(uri).catch(() => {});
  }, [uri]);

  // Flatten style to get dimensions
  const flatStyle = Array.isArray(style) 
    ? Object.assign({}, ...style) 
    : style || {};
  
  const { width = 100, height = 100, borderRadius = 50, borderWidth, borderColor } = flatStyle as any;
  
  // Calculate font size based on avatar size
  const fontSize = Math.floor((typeof width === "number" ? width : 100) * 0.38);

  // Show gradient fallback if no URI or image failed to load
  if (!displayUri || error) {
    if (!showPlaceholder) return null;

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            justifyContent: "center",
            alignItems: "center",
            width,
            height,
            borderRadius,
            borderWidth,
            borderColor,
          },
        ]}
      >
        <Text
          style={{
            color: "#fff",
            fontSize,
            fontWeight: "700",
            textShadowColor: "rgba(0, 0, 0, 0.15)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {initials}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      onError={() => setError(true)}
      {...imageProps}
    />
  );
}
