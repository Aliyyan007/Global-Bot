@echo off
echo ========================================
echo  Safe Server - Quick Deployment Script
echo ========================================
echo.

echo [1/4] Copying schema...
copy safe-server-new-system\safeServerSchema.js schemas\ >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Schema copied
) else (
    echo [FAIL] Schema copy failed
)

echo [2/4] Copying command...
copy safe-server-new-system\safe-server.js slash-commands\ >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Command copied
) else (
    echo [FAIL] Command copy failed
)

echo [3/4] Copying interaction handlers...
copy safe-server-new-system\safe-server-panel-new.js interactions\safe-server-panel.js >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Panel handler copied
) else (
    echo [FAIL] Panel handler copy failed
)

copy safe-server-new-system\safe-server-modals.js interactions\ >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Modals handler copied
) else (
    echo [FAIL] Modals handler copy failed
)

echo [4/4] Checking files...
if exist "schemas\safeServerSchema.js" (
    echo [OK] Schema exists
) else (
    echo [FAIL] Schema missing
)

if exist "slash-commands\safe-server.js" (
    echo [OK] Command exists
) else (
    echo [FAIL] Command missing
)

if exist "interactions\safe-server-panel.js" (
    echo [OK] Panel handler exists
) else (
    echo [FAIL] Panel handler missing
)

if exist "interactions\safe-server-modals.js" (
    echo [OK] Modals handler exists
) else (
    echo [FAIL] Modals handler missing
)

echo.
echo ========================================
echo  Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your bot
echo 2. Run /safe-server command
echo 3. Test the system
echo.
pause
