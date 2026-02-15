@echo off
echo ========================================
echo   Starting WhatsApp Webhook Services
echo ========================================
echo.

echo [1/2] Starting Webhook Server (Port 3000)...
start "Webhook Server" cmd /k "cd /d %~dp0 && npx tsx scripts/server.ts"

timeout /t 3 /nobreak >nul

echo [2/2] Starting ngrok tunnel...
start "ngrok" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo   ✅ Services Started!
echo ========================================
echo.
echo 📝 Next Steps:
echo    1. Wait for ngrok to show the public URL
echo    2. Copy the https://xxx.ngrok.io URL
echo    3. Update Whapi webhook URL to:
echo       https://xxx.ngrok.io/api/webhook
echo.
echo ⚠️  Keep both terminal windows open!
echo.
pause
