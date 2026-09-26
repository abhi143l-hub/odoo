@echo off
title StockSense Development Server
setlocal
cd /d "%~dp0\.."
echo ========================================================
echo   StockSense - Smart Inventory Operating System
echo   Starting development server on http://localhost:3000
echo ========================================================
echo.

if not exist ".env" (
    echo [WARNING] No .env file found!
    echo Please copy .env.example to .env and configure your PostgreSQL database.
    echo.
)

npm run dev
endlocal
pause
