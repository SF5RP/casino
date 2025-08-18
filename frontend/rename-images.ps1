# Скрипт для переименования изображений в игре "Найди пару"
# Запустите этот скрипт в PowerShell

Write-Host "🔄 Переименование изображений для игры 'Найди пару'..." -ForegroundColor Green

# Путь к папке с изображениями
$imagePath = "public\images\memory-game"

# Проверяем существование папки
if (!(Test-Path $imagePath)) {
    Write-Host "❌ Папка $imagePath не найдена!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Найдена папка: $imagePath" -ForegroundColor Green

# Получаем все JPG файлы
$imageFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name

Write-Host "🖼️ Найдено изображений: $($imageFiles.Count)" -ForegroundColor Yellow

if ($imageFiles.Count -eq 0) {
    Write-Host "❌ JPG файлы не найдены!" -ForegroundColor Red
    exit 1
}

# Счетчик для нумерации
$counter = 1

# Переименовываем каждый файл
foreach ($file in $imageFiles) {
    $newName = "image-$counter.jpg"
    $newPath = Join-Path $imagePath $newName
    
    # Проверяем, не существует ли уже файл с таким именем
    if (Test-Path $newPath) {
        Write-Host "⚠️  Файл $newName уже существует, пропускаем..." -ForegroundColor Yellow
        continue
    }
    
    try {
        # Переименовываем файл
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "✅ $($file.Name) → $newName" -ForegroundColor Green
        $counter++
    }
    catch {
        Write-Host "❌ Ошибка при переименовании $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Останавливаемся на 30 изображениях
    if ($counter > 30) {
        Write-Host "🎯 Достигнут лимит в 30 изображений" -ForegroundColor Cyan
        break
    }
}

Write-Host ""
Write-Host "📋 Результат переименования:" -ForegroundColor Cyan
Write-Host "✅ Переименовано изображений: $($counter - 1)" -ForegroundColor Green

# Показываем финальную структуру
Write-Host ""
Write-Host "📁 Финальная структура папки:" -ForegroundColor Cyan
$finalFiles = Get-ChildItem -Path $imagePath -Filter "*.jpg" | Sort-Object Name
foreach ($file in $finalFiles) {
    Write-Host "   $($file.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "🎮 Теперь можно запустить игру!" -ForegroundColor Green
Write-Host "💡 Не забудьте перезапустить сервер разработки (yarn dev)" -ForegroundColor Yellow
