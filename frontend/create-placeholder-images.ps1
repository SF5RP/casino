# Скрипт для создания placeholder изображений для игры "Найди пару"
# Запустите этот скрипт в PowerShell

Write-Host "🎮 Создание placeholder изображений для игры 'Найди пару'..." -ForegroundColor Green

# Создаем папку если её нет
$imagePath = "public\images\memory-game"
if (!(Test-Path $imagePath)) {
    New-Item -ItemType Directory -Path $imagePath -Force
    Write-Host "✅ Создана папка: $imagePath" -ForegroundColor Green
}

# Создаем 30 placeholder изображений
for ($i = 1; $i -le 30; $i++) {
    $fileName = "image-$i.jpg"
    $filePath = Join-Path $imagePath $fileName
    
    # Создаем простой HTML файл для генерации изображения
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Image $i</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: Arial, sans-serif;
        }
        .image-container {
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="image-container">$i</div>
</body>
</html>
"@
    
    # Сохраняем HTML файл
    $htmlPath = Join-Path $imagePath "temp-$i.html"
    $htmlContent | Out-File -FilePath $htmlPath -Encoding UTF8
    
    Write-Host "📝 Создан HTML файл: $fileName" -ForegroundColor Yellow
    
    # Примечание: для создания реальных JPG файлов нужны дополнительные инструменты
    # Пока создаем HTML файлы как placeholder'ы
}

Write-Host ""
Write-Host "📋 Что делать дальше:" -ForegroundColor Cyan
Write-Host "1. Откройте папку: $imagePath" -ForegroundColor White
Write-Host "2. Замените HTML файлы на реальные изображения" -ForegroundColor White
Write-Host "3. Переименуйте их в: image-1.jpg, image-2.jpg, ..., image-30.jpg" -ForegroundColor White
Write-Host "4. Убедитесь что размер изображений примерно 100x100 пикселей" -ForegroundColor White
Write-Host ""
Write-Host "💡 Альтернативно, вы можете:" -ForegroundColor Yellow
Write-Host "- Скопировать готовые изображения в эту папку" -ForegroundColor White
Write-Host "- Использовать онлайн генераторы изображений" -ForegroundColor White
Write-Host "- Создать изображения в графических редакторах" -ForegroundColor White
Write-Host ""
Write-Host "🎯 После добавления изображений перезапустите игру!" -ForegroundColor Green
