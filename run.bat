@echo off
title Online Wedding Management System
color 0E
echo ========================================================
echo   ONLINE WEDDING MANAGEMENT SYSTEM (MySQL Workbench)
echo ========================================================
echo.
echo Database  : wedding_db (localhost:3306)
echo Username  : root
echo Password  : root
echo.
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
echo Starting server...
node server.js
pause

