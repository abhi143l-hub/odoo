@echo off
title StockSense Initial Setup
setlocal
cd /d "%~dp0\.."
echo ========================================================
echo   StockSense - Automated Developer Setup
echo ========================================================
echo.

if not exist ".env" (
    echo [1/4] Creating .env from .env.example...
    copy .env.example .env
    echo Please configure your PostgreSQL password in .env before running migrations.
) else (
    echo [1/4] .env file already exists.
)

echo.
echo [2/4] Installing dependencies...
call npm install

echo.
echo [3/4] Generating Prisma Client...
call npm run prisma:generate

echo.
echo [4/4] Setup complete!
echo Next steps:
echo   1. Verify your database connection in .env
echo   2. Run 'npm run prisma:push' to sync the schema
echo   3. Run 'npm run prisma:seed' to populate initial demo data
echo   4. Run 'npm run dev' to start the application
echo.
endlocal
pause
