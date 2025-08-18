# Image renaming script
Write-Host "Renaming images..." -ForegroundColor Green

$imagePath = "public\images\memory-game"

if (!(Test-Path $imagePath)) {
    Write-Host "Folder not found!" -ForegroundColor Red
    exit 1
}

$imageFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name
Write-Host "Found images: $($imageFiles.Count)" -ForegroundColor Yellow

$counter = 1

foreach ($file in $imageFiles) {
    $newName = "image-$counter.jpg"
    $newPath = Join-Path $imagePath $newName
    
    if (Test-Path $newPath) {
        Write-Host "File $newName already exists, skipping..." -ForegroundColor Yellow
        continue
    }
    
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
Write-Host "Done!" -ForegroundColor Green
