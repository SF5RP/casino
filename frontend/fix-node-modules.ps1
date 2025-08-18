# Fix node_modules issues
Write-Host "Fixing node_modules issues..." -ForegroundColor Green

# Stop any running processes
Write-Host "Stopping any running processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "yarn" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Try to remove node_modules with different approach
Write-Host "Removing node_modules..." -ForegroundColor Yellow
try {
    # Use robocopy to clear directory
    $tempDir = "temp_empty"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Clear node_modules using robocopy
    robocopy $tempDir node_modules /MIR /NFL /NDL /NJH /NJS /NC /NS /NP
    
    # Remove temp directory
    Remove-Item $tempDir -Force -Recurse
    
    Write-Host "node_modules cleared successfully" -ForegroundColor Green
}
catch {
    Write-Host "Could not clear node_modules completely: $($_.Exception.Message)" -ForegroundColor Red
}

# Try to reinstall
Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
try {
    yarn install --force
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Try running: yarn install --force" -ForegroundColor Yellow
}

Write-Host "Done!" -ForegroundColor Green
