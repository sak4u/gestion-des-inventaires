@echo off
echo ============================================
echo   Lancement des tests Selenium + Allure
echo ============================================

REM Aller dans le dossier selenium-tests
cd /d "%~dp0"

REM Creer le dossier reports si necessaire
if not exist "reports\allure-results" mkdir "reports\allure-results"

REM Lancer les tests
echo.
echo [1/2] Execution des tests...
pytest

REM Ouvrir le rapport Allure
echo.
echo [2/2] Generation du rapport Allure...
allure serve reports\allure-results

pause
