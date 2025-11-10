#!/bin/bash
# Clear Expo and Metro caches for icon updates

echo "Clearing Expo and Metro caches..."

# Clear Expo cache
if [ -d ".expo" ]; then
    rm -rf .expo
    echo "✓ Cleared .expo directory"
fi

# Clear Metro cache
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✓ Cleared Metro cache"
fi

# Clear watchman cache (if installed)
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
    echo "✓ Cleared Watchman cache"
fi

# Clear npm cache
npm cache clean --force 2>/dev/null
echo "✓ Cleared npm cache"

echo ""
echo "Cache cleared! Now run: expo start -c"
echo "For native builds, you need to rebuild the app."
