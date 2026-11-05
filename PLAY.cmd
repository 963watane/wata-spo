@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed for this launcher. You can also use the existing Python serve.py.
  pause
  exit /b 1
)
node play.cjs
pause
