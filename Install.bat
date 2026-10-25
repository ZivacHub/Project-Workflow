@echo off
rem Project Workflow installer for Windows: double-click this file.
rem It checks that Node.js is installed, shows a small menu and runs install.mjs for you.
rem With arguments it skips the menu and passes them on, for example:  Install.bat --dry-run   or   Install.bat check
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title Project Workflow installer
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :nonode
node -e "process.exit(Number(process.versions.node.split('.')[0])>=18?0:1)" >nul 2>&1
if errorlevel 1 goto :oldnode

if not "%~1"=="" goto :direct

:menu
cls
echo.
echo   PROJECT WORKFLOW  -  installer
echo   ==============================
echo.
echo   Gives your Claude Code projects the same commands everywhere:
echo   /pickup  /handoff  /plan  /new-project  /info  and more.
echo   Nothing is changed until you say yes. Every replaced file is backed up first.
echo.
echo     1  Install      first time: asks two questions, shows what it will do, waits for your yes
echo     2  Preview      shows what Install would do and changes nothing
echo     3  Update       after Claude says a new version is available
echo     4  Check        is everything installed and working?
echo     5  Uninstall    removes it and puts your settings back
echo     Q  Quit
echo.
choice /c 12345Q /n /m "  Press 1, 2, 3, 4, 5 or Q: "
set "PICK=%errorlevel%"
if %PICK% GEQ 6 goto :bye
set "WHAT="
if "%PICK%"=="1" set "WHAT="
if "%PICK%"=="2" set "WHAT=--dry-run"
if "%PICK%"=="3" set "WHAT=update"
if "%PICK%"=="4" set "WHAT=check"
if "%PICK%"=="5" set "WHAT=uninstall"
echo.
node "%~dp0install.mjs" %WHAT%
set "RC=%errorlevel%"
echo.
if "%RC%"=="0" goto :again
if "%RC%"=="2" (
  echo   Nothing was changed: a file with the same name exists that this installer did not create.
  echo   To replace it anyway ^(a backup is made^), open a terminal in this folder and run:  node install.mjs --force
) else if "%RC%"=="3" (
  echo   Nothing was changed: your Claude settings.json is not valid JSON. Fix it, then run this again.
) else (
  echo   It stopped with a problem ^(code %RC%^). Read the lines above, then press 4 ^(Check^) to see what state things are in.
)
:again
echo.
echo   Press any key to go back to the menu...
pause >nul
goto :menu

:direct
node "%~dp0install.mjs" %*
exit /b %errorlevel%

:nonode
echo.
echo   Node.js is not installed. The installer needs it ^(it is free, from nodejs.org^).
if not "%~1"=="" exit /b 9
where winget >nul 2>&1
if errorlevel 1 goto :nodepage
echo   I can install the official "Node.js LTS" for you with Windows' own tool ^(winget^).
choice /c YN /n /m "  Install Node.js now? Press Y or N: "
if errorlevel 2 goto :nodepage
echo.
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo   When it is finished, CLOSE this window and double-click Install.bat again.
pause >nul
exit /b 0

:nodepage
echo   Opening the download page. Install the "LTS" version, then double-click Install.bat again.
start "" "https://nodejs.org/en/download"
pause >nul
exit /b 9

:oldnode
echo.
echo   Your Node.js is too old: version 18 or newer is needed.
echo   Install the current "LTS" from https://nodejs.org/en/download and run this again.
if not "%~1"=="" exit /b 9
start "" "https://nodejs.org/en/download"
pause >nul
exit /b 9

:bye
endlocal
exit /b 0
