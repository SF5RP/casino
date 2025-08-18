# Скрипт для переименования изображений
Write-Host "Переименование изображений..." -ForegroundColor Green

$imagePath = "public\images\memory-game"

if (!(Test-Path $imagePath)) {
    Write-Host "Папка не найдена!" -ForegroundColor Red
    exit 1
}

$imageFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name
Write-Host "Найдено изображений: $($imageFiles.Count)" -ForegroundColor Yellow

$counter = 1

foreach ($file in $imageFiles) {
    $newName = "image-$counter.jpg"
    $newPath = Join-Path $imagePath $newName
    
    if (Test-Path $newPath) {
        Write-Host "Файл $newName уже существует, пропускаем..." -ForegroundColor Yellow
        continue
    }
    
    try {
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "$($file.Name) -> $newName" -ForegroundColor Green
        $counter++
    }
    catch {
        Write-Host "Ошибка при переименовании $($file.Name)" -ForegroundColor Red
    }
    
    if ($counter > 30) {
        Write-Host "Достигнут лимит в 30 изображений" -ForegroundColor Cyan
        break
    }
}

Write-Host "Переименовано изображений: $($counter - 1)" -ForegroundColor Green
Write-Host "Готово!" -ForegroundColor Green
