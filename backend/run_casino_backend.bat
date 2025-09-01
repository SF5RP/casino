@echo off
REM Скрипт для запуска casino-backend с правильными переменными окружения

echo Starting Casino Backend with Tiny-CNN support...

REM Устанавливаем переменную окружения для совместимости с Go 1.22
set ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22

REM Проверяем, существует ли исполняемый файл
if not exist "casino-backend.exe" (
    echo Building casino-backend.exe...
    go build -o casino-backend.exe ./cmd/server
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

REM Запускаем сервер
echo Starting server...
casino-backend.exe

pause
