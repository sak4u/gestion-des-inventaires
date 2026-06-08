@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  run-e2e-tests.bat
REM  Script : Tests E2E Frontend Selenium (Jenkins CI)
REM  Projet : Gestion des Inventaires
REM
REM  Tests inclus (51 tests) :
REM    - test_login.py          (authentification)
REM    - test_dashboard.py      (tableau de bord)
REM    - test_produits.py       (CRUD produits)
REM    - test_fournisseurs.py   (CRUD fournisseurs)
REM    - test_entrepots.py      (CRUD entrepôts)
REM    - test_commandes.py      (CRUD commandes)
REM    - test_propositions.py   (propositions réapprovisionnement)
REM    - test_flux_de_stock.py  (flux de stock)
REM    - test_utilisateurs.py   (gestion utilisateurs)
REM    - test_demo_echec.py     (7 échecs intentionnels)
REM
REM  Prérequis :
REM    - Backend  actif sur http://localhost:3000
REM    - Frontend actif sur http://localhost:5173
REM    - Python   3.13 installé dans C:\python313\
REM    - pip install -r requirements.txt
REM
REM  Rapports générés :
REM    - reports/allure-results/  → Rapport Allure (Jenkins plugin)
REM    - reports/report.html      → Rapport HTML pytest
REM    - reports/junit-e2e.xml    → Rapport JUnit (Jenkins)
REM
REM  Usage : run-e2e-tests.bat [--headless] [--suite LOGIN|PRODUITS|ALL]
REM          run-e2e-tests.bat --suite SMOKE   (tests rapides seulement)
REM ═══════════════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

REM ── Configuration ──────────────────────────────────────────────────────────
set SELENIUM_DIR=C:\Users\mohamed sakly\Desktop\Gestion des inventaires\selenium-tests
set PYTHON=C:\python313\python.exe
set REPORTS_DIR=%SELENIUM_DIR%\reports
set ALLURE_DIR=%REPORTS_DIR%\allure-results
set ALLURE_REPORT=%REPORTS_DIR%\allure-report
set JUNIT_XML=%REPORTS_DIR%\junit-e2e.xml
set BACKEND_URL=http://localhost:3000
set FRONTEND_URL=http://localhost:5173
set HEADLESS=0
set SUITE=ALL
set EXIT_CODE=0

REM ── Parsing des arguments ──────────────────────────────────────────────────
:parse_args
if "%~1"=="--headless"  set HEADLESS=1
if "%~1"=="--suite"     set SUITE=%~2 & shift
shift
if not "%~1"=="" goto parse_args

REM ── Création des répertoires de rapports ────────────────────────────────────
if not exist "%REPORTS_DIR%"   mkdir "%REPORTS_DIR%"
if not exist "%ALLURE_DIR%"    mkdir "%ALLURE_DIR%"
if not exist "%ALLURE_REPORT%" mkdir "%ALLURE_REPORT%"

REM ── En-tête ────────────────────────────────────────────────────────────────
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║         TESTS E2E SELENIUM — Gestion des Inventaires          ║
echo ║         Démarré le %DATE% à %TIME%                            ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Suite   : %SUITE%
echo [INFO] Headless: %HEADLESS%
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  VÉRIFICATION DES PRÉREQUIS
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [0] Vérification des prérequis                                 │
echo └─────────────────────────────────────────────────────────────────┘

REM Vérifier Python
if not exist "%PYTHON%" (
    echo [ERREUR] Python introuvable : %PYTHON%
    echo          Installez Python 3.13 ou modifiez la variable PYTHON.
    exit /b 1
)
echo [OK] Python trouvé : %PYTHON%

REM Vérifier le répertoire Selenium
if not exist "%SELENIUM_DIR%" (
    echo [ERREUR] Répertoire introuvable : %SELENIUM_DIR%
    exit /b 1
)
echo [OK] Répertoire Selenium : %SELENIUM_DIR%

REM Vérifier Backend (ping HTTP)
curl -s -o nul -w "%%{http_code}" "%BACKEND_URL%/api/health" > "%TEMP%\health_check.txt" 2>nul
set /p HTTP_CODE=<"%TEMP%\health_check.txt"
if "%HTTP_CODE%"=="200" (
    echo [OK] Backend actif sur %BACKEND_URL%
) else (
    REM Essai sur la racine
    curl -s -o nul -w "%%{http_code}" "%BACKEND_URL%" > "%TEMP%\health_check2.txt" 2>nul
    set /p HTTP_CODE2=<"%TEMP%\health_check2.txt"
    if "!HTTP_CODE2!"=="200" (
        echo [OK] Backend actif sur %BACKEND_URL%
    ) else (
        echo [WARN] Backend peut-être indisponible sur %BACKEND_URL%
        echo        Lancez : npm run start:dev dans le dossier backend
        echo        Le pipeline continuera mais les tests pourraient échouer.
    )
)

echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  INSTALLATION DES DÉPENDANCES PYTHON
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [1] Installation des dépendances Python                        │
echo └─────────────────────────────────────────────────────────────────┘

cd /d "%SELENIUM_DIR%"
"%PYTHON%" -m pip install -r requirements.txt --quiet --upgrade
if errorlevel 1 (
    echo [ERREUR] Installation des dépendances Python échouée.
    exit /b 1
)
echo [OK] Dépendances Python installées.
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  SÉLECTION DE LA SUITE DE TESTS
REM ══════════════════════════════════════════════════════════════════════════
set TEST_PATH=tests/
set PYTEST_MARKS=

if "%SUITE%"=="SMOKE" (
    set PYTEST_MARKS=-m smoke
    echo [INFO] Suite SMOKE : tests rapides uniquement
)
if "%SUITE%"=="LOGIN" (
    set TEST_PATH=tests/test_login.py
    echo [INFO] Suite LOGIN uniquement
)
if "%SUITE%"=="PRODUITS" (
    set TEST_PATH=tests/test_produits.py
    echo [INFO] Suite PRODUITS uniquement
)
if "%SUITE%"=="REGRESSION" (
    set PYTEST_MARKS=-m regression
    echo [INFO] Suite REGRESSION : tests de régression
)

REM ══════════════════════════════════════════════════════════════════════════
REM  LANCEMENT DES TESTS SELENIUM
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [2] Exécution des tests Selenium (51 tests)                    │
echo │      Rapport Allure  → reports/allure-results/                  │
echo │      Rapport HTML    → reports/report.html                      │
echo │      Rapport JUnit   → reports/junit-e2e.xml                    │
echo └─────────────────────────────────────────────────────────────────┘
echo.

REM Variables d'environnement pour les tests
if "%HEADLESS%"=="1" (
    set HEADLESS_MODE=true
    echo [INFO] Mode headless activé
) else (
    set HEADLESS_MODE=false
)

REM Nettoyage des anciens résultats Allure
if exist "%ALLURE_DIR%" (
    echo [INFO] Nettoyage des anciens résultats Allure...
    rmdir /s /q "%ALLURE_DIR%" 2>nul
    mkdir "%ALLURE_DIR%"
)

REM Lancement pytest avec tous les rapports
"%PYTHON%" -m pytest %TEST_PATH% %PYTEST_MARKS% ^
    --alluredir=reports\allure-results ^
    --html=reports\report.html ^
    --self-contained-html ^
    --junitxml=reports\junit-e2e.xml ^
    -v ^
    --tb=short ^
    --color=yes ^
    -q 2>&1

set SELENIUM_CODE=!errorlevel!

echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  GÉNÉRATION DU RAPPORT ALLURE (si allure CLI disponible)
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [3] Génération du rapport Allure HTML                          │
echo └─────────────────────────────────────────────────────────────────┘

where allure >nul 2>&1
if !errorlevel! equ 0 (
    allure generate reports\allure-results --clean -o reports\allure-report
    echo [OK] Rapport Allure HTML → reports\allure-report\index.html
) else (
    echo [INFO] CLI Allure non trouvé — rapport généré par Jenkins plugin.
    echo        Pour installer : npm install -g allure-commandline
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  RÉSUMÉ FINAL
REM ══════════════════════════════════════════════════════════════════════════
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                  RÉSUMÉ DES TESTS E2E                         ║
echo ╠═══════════════════════════════════════════════════════════════╣
if !SELENIUM_CODE! equ 0 (
    echo ║  [PASS] Tests Selenium : TOUS RÉUSSIS                         ║
) else (
    echo ║  [INFO] Tests Selenium : certains échecs détectés             ║
    echo ║         ^(7 échecs intentionnels sont normaux^)                ║
)
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║  Rapports disponibles :                                       ║
echo ║    Allure results  → reports\allure-results\                  ║
echo ║    HTML report     → reports\report.html                      ║
echo ║    JUnit XML       → reports\junit-e2e.xml                    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Code de sortie : on autorise jusqu'à 7 échecs intentionnels
REM Si pytest retourne 1 (tests failed) → UNSTABLE (pas FAILURE)
if !SELENIUM_CODE! equ 0 (
    echo [SUCCÈS] Tests E2E Selenium terminés sans erreur.
    exit /b 0
) else if !SELENIUM_CODE! equ 1 (
    echo [UNSTABLE] Des tests ont échoué. Vérifiez le rapport Allure.
    echo            Les 7 échecs intentionnels sont inclus dans ce compte.
    exit /b 1
) else (
    echo [ERREUR] Erreur critique lors de l'exécution ^(code !SELENIUM_CODE!^).
    exit /b !SELENIUM_CODE!
)

endlocal
