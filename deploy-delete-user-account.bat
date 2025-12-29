@echo off
echo ========================================
echo Deploying delete-user-account Edge Function
echo ========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI is not installed or not in PATH
    echo Please install it from: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

REM Navigate to project root
cd /d "%~dp0"

echo Deploying delete-user-account function...
supabase functions deploy delete-user-account

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS: Edge function deployed!
    echo ========================================
    echo.
    echo The delete-user-account function is now available at:
    echo https://nfkykasruwdzpcjuufdu.supabase.co/functions/v1/delete-user-account
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Deployment failed!
    echo ========================================
    echo.
    echo Please check:
    echo 1. You are logged in to Supabase CLI (run: supabase login)
    echo 2. You are linked to the correct project (run: supabase link)
    echo 3. The function code is correct
    echo.
)

pause

