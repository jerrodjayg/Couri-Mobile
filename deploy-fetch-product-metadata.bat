@echo off
echo ========================================
echo Deploying fetch-product-metadata Edge Function
echo ========================================
echo.

echo Step 1: Deploying to Supabase...
echo.

call npx supabase functions deploy fetch-product-metadata --project-ref nfkykasruwdzpcjuufdu

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
echo The function is now available at:
echo https://nfkykasruwdzpcjuufdu.functions.supabase.co/fetch-product-metadata
echo.
echo This function will:
echo   ✅ Extract product title from Facebook Marketplace
echo   ✅ Extract product image from listings
echo   ✅ Extract product description
echo   ✅ Determine source (Facebook, Craigslist, eBay, etc.)
echo.
echo Test it by entering a Facebook Marketplace URL in your app!
echo.
pause

