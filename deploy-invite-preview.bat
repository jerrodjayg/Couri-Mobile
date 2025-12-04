@echo off
echo ========================================
echo Deploying Couri Invite Preview Function
echo ========================================
echo.

echo Step 1: Deploying to Supabase...
echo.

call npx supabase functions deploy invite-preview

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Deployment failed!
    echo.
    echo Try these steps:
    echo 1. Make sure you're logged in: npx supabase login
    echo 2. Link your project: npx supabase link --project-ref nfkykasruwdzpcjuufdu
    echo 3. Run this script again
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Deployment Successful!
echo ========================================
echo.
echo Your invitation links will now show:
echo   ✅ Product images
echo   ✅ Price and title
echo   ✅ Seller name
echo   ✅ Beautiful preview on Facebook, WhatsApp, Twitter, etc.
echo.
echo Test it:
echo 1. Create a new invitation in your app
echo 2. Copy the web link
echo 3. Paste it on Facebook or use: https://developers.facebook.com/tools/debug/
echo.
echo Function URL:
echo https://nfkykasruwdzpcjuufdu.functions.supabase.co/invite-preview
echo.
pause

