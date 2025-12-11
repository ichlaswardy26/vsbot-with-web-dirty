@echo off
echo ========================================
echo   Starting Anna Manager Bot System
echo ========================================
echo.

echo [1/2] Starting Discord Bot...
start "Anna Bot" cmd /k "node index.js"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Dashboard...
start "Anna Dashboard" cmd /k "cd dashboard && npm start"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Bot running at: Console Window
echo Dashboard running at: http://localhost:8080
echo.
echo Press any key to exit this window...
pause >nul
