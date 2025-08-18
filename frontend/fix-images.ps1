# Fix image structure script
Write-Host "Fixing image structure..." -ForegroundColor Green

$imagePath = "public\images\memory-game"

if (!(Test-Path $imagePath)) {
    Write-Host "Folder not found!" -ForegroundColor Red
    exit 1
}

# Remove existing image-*.jpg files
Write-Host "Removing existing image-*.jpg files..." -ForegroundColor Yellow
Get-ChildItem -Path $imagePath -Filter "image-*.jpg" | Remove-Item -Force
Write-Host "Removed existing files" -ForegroundColor Green

# Get all remaining JPG files
$imageFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name
Write-Host "Found images to rename: $($imageFiles.Count)" -ForegroundColor Yellow

$counter = 1

foreach ($file in $imageFiles) {
    $newName = "image-$counter.jpg"
    $newPath = Join-Path $imagePath $newName
    
    try {
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "$($file.Name) -> $newName" -ForegroundColor Green
        $counter++
    }
    catch {
        Write-Host "Error renaming $($file.Name)" -ForegroundColor Red
    }
    
    if ($counter > 30) {
        Write-Host "Reached limit of 30 images" -ForegroundColor Cyan
        break
    }
}

Write-Host "Renamed images: $($counter - 1)" -ForegroundColor Green

# Show final structure
Write-Host "Final folder structure:" -ForegroundColor Cyan
$finalFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name
foreach ($file in $finalFiles) {
    Write-Host "   $($file.Name)" -ForegroundColor White
}

Write-Host "Done!" -ForegroundColor Green
