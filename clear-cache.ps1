# Clear Expo and Metro caches for icon updates
Write-Host "Clearing Expo and Metro caches..." -ForegroundColor Yellow

# Clear Expo cache
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo"
    Write-Host "✓ Cleared .expo directory" -ForegroundColor Green
}

# Clear Metro cache
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✓ Cleared Metro cache" -ForegroundColor Green
}

# Clear watchman cache (if installed)
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>&1 | Out-Null
    Write-Host "✓ Cleared Watchman cache" -ForegroundColor Green
}

# Clear npm cache
npm cache clean --force 2>&1 | Out-Null
Write-Host "✓ Cleared npm cache" -ForegroundColor Green

Write-Host "`nCache cleared! Now run: expo start -c" -ForegroundColor Cyan
Write-Host "For native builds, you need to rebuild the app." -ForegroundColor Yellow
