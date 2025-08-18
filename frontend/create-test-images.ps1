# Create test images script
Write-Host "Creating test images..." -ForegroundColor Green

$imagePath = "public\images\memory-game"

if (!(Test-Path $imagePath)) {
    New-Item -ItemType Directory -Path $imagePath -Force
}

# Create 30 simple test images
for ($i = 1; $i -le 30; $i++) {
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Test Image $i</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
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
    
    $htmlPath = Join-Path $imagePath "temp-$i.html"
    $htmlContent | Out-File -FilePath $htmlPath -Encoding UTF8
    
    Write-Host "Created HTML file: temp-$i.html" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Created $i HTML files for testing" -ForegroundColor Green
Write-Host "You can open these HTML files in browser and save as images" -ForegroundColor Yellow
Write-Host "Or use online HTML to image converters" -ForegroundColor Yellow
Write-Host ""
Write-Host "Alternative: Copy your own images and rename them to:" -ForegroundColor Cyan
Write-Host "image-1.jpg, image-2.jpg, ..., image-30.jpg" -ForegroundColor White
