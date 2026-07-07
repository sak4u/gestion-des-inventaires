@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  run-api-tests.bat
REM  Script : Tests API automatisés (Jenkins CI)
REM  Projet : Gestion des Inventaires
REM
REM  Tests inclus :
REM    1. Tests Unitaires Jest          → src/**/*.spec.ts     (30 tests)
REM    2. Tests E2E API Supertest       → test/**/*.e2e-spec.ts (56 tests)
REM    3. Tests BDD Cucumber            → features/**/*.feature (15 scenarios)
REM    4. Tests API Postman (Newman)    → test/postman/*.json   (41 assertions)
REM
REM  Rapports générés :
REM    - coverage/lcov-report/index.html   (couverture Jest)
REM    - test/reports/newman-report.html   (Newman HTML)
REM    - test/reports/junit-api.xml        (JUnit pour Jenkins)
REM
REM  Usage : run-api-tests.bat [--skip-postman] [--coverage]
REM
REM  Jenkins : définir BACKEND_DIR avant d'appeler ce script
REM    set BACKEND_DIR=%WORKSPACE%\backend
REM    call scripts\run-api-tests.bat --skip-postman
REM ═══════════════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

REM ── Configuration (surchargeable par variable d'environnement) ────────────
if "%BACKEND_DIR%"=="" set BACKEND_DIR=C:\Users\mohamed sakly\Desktop\Gestion des inventaires\backend
set REPORTS_DIR=%BACKEND_DIR%\test\reports
set COVERAGE_DIR=%BACKEND_DIR%\coverage
set LOG_FILE=%REPORTS_DIR%\api-tests-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.log
set SKIP_POSTMAN=0
set WITH_COVERAGE=0
set EXIT_CODE=0

REM ── Parsing des arguments ──────────────────────────────────────────────────
:parse_args
if "%~1"=="--skip-postman" set SKIP_POSTMAN=1
if "%~1"=="--coverage"     set WITH_COVERAGE=1
shift
if not "%~1"=="" goto parse_args

REM ── Création des répertoires de rapports ────────────────────────────────────
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"
if not exist "%COVERAGE_DIR%" mkdir "%COVERAGE_DIR%"

REM ── En-tête ────────────────────────────────────────────────────────────────
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║         TESTS API — Gestion des Inventaires                   ║
echo ║         Démarré le %DATE% à %TIME%                            ║
echo ║         Répertoire : %BACKEND_DIR%                            ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

cd /d "%BACKEND_DIR%"
if errorlevel 1 (
    echo [ERREUR] Impossible d'accéder au répertoire : %BACKEND_DIR%
    exit /b 1
)

REM ══════════════════════════════════════════════════════════════════════════
REM  ÉTAPE 0 — Installation des dépendances
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [0/4] Installation des dépendances npm                         │
echo └─────────────────────────────────────────────────────────────────┘
call npm install --prefer-offline --silent
if errorlevel 1 (
    echo [ERREUR] npm install a échoué.
    exit /b 1
)
echo [OK] Dépendances installées.
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  ÉTAPE 1 — Tests Unitaires Jest
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [1/4] Tests Unitaires Jest — 30 tests attendus                 │
echo │        AuthService (15) + ProduitService (15)                   │
echo └─────────────────────────────────────────────────────────────────┘

if "%WITH_COVERAGE%"=="1" (
    echo [INFO] Mode couverture activé
    call npm test -- ^
        --forceExit ^
        --passWithNoTests ^
        --coverage ^
        --coverageReporters=lcov ^
        --coverageReporters=text ^
        --coverageReporters=cobertura ^
        --reporters=default ^
        --reporters=jest-junit ^
        --testResultsProcessor=jest-junit 2>&1
) else (
    call npm test -- ^
        --forceExit ^
        --passWithNoTests ^
        --reporters=default ^
        --reporters=jest-junit ^
        --testResultsProcessor=jest-junit 2>&1
)

set UNIT_CODE=!errorlevel!
if !UNIT_CODE! equ 0 (
    echo [PASS] Tests unitaires : RÉUSSIS
) else (
    echo [FAIL] Tests unitaires : ÉCHECS détectés ^(code !UNIT_CODE!^)
    set EXIT_CODE=1
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  ÉTAPE 2 — Tests E2E API Supertest
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [2/4] Tests E2E API Supertest — 56 tests attendus              │
echo │        auth, produit, fournisseur, entrepot, commande           │
echo └─────────────────────────────────────────────────────────────────┘

set JEST_JUNIT_OUTPUT_DIR=%REPORTS_DIR%
set JEST_JUNIT_OUTPUT_NAME=junit-e2e-supertest.xml

call npm run test:e2e -- ^
    --forceExit ^
    --reporters=default ^
    --reporters=jest-junit 2>&1

set E2E_CODE=!errorlevel!
if !E2E_CODE! equ 0 (
    echo [PASS] Tests E2E API : RÉUSSIS
) else (
    echo [FAIL] Tests E2E API : ÉCHECS détectés ^(code !E2E_CODE!^)
    set EXIT_CODE=1
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  ÉTAPE 3 — Tests BDD Cucumber
REM ══════════════════════════════════════════════════════════════════════════
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [3/4] Tests BDD Cucumber — 15 scénarios / 51 steps             │
echo │        auth.feature + produit.feature + commande.feature        │
echo └─────────────────────────────────────────────────────────────────┘

call npm run test:bdd -- ^
    --format json:%REPORTS_DIR%\cucumber-report.json ^
    --format @cucumber/pretty-formatter 2>&1

set BDD_CODE=!errorlevel!
if !BDD_CODE! equ 0 (
    echo [PASS] Tests BDD : RÉUSSIS
) else (
    echo [FAIL] Tests BDD : ÉCHECS détectés ^(code !BDD_CODE!^)
    set EXIT_CODE=1
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  ÉTAPE 4 — Tests API Postman via Newman
REM ══════════════════════════════════════════════════════════════════════════
if "%SKIP_POSTMAN%"=="1" (
    echo [SKIP] Tests Postman ignorés ^(--skip-postman^)
    goto :postman_done
)

echo ┌─────────────────────────────────────────────────────────────────┐
echo │  [4/4] Tests Postman Newman — 19 requêtes / 41 assertions       │
echo │        Rapport HTML → test/reports/newman-report.html           │
echo └─────────────────────────────────────────────────────────────────┘

if not exist "test\postman\Inventaires.postman_collection.json" (
    echo [WARN] Collection Postman introuvable, étape ignorée.
    goto :postman_done
)

call npm run test:postman 2>&1

set NEWMAN_CODE=!errorlevel!
if !NEWMAN_CODE! equ 0 (
    echo [PASS] Tests Postman : RÉUSSIS
    echo [INFO] Rapport HTML → %REPORTS_DIR%\newman-report.html
) else (
    echo [FAIL] Tests Postman : ÉCHECS détectés ^(code !NEWMAN_CODE!^)
    set EXIT_CODE=1
)

:postman_done
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM  RÉSUMÉ FINAL
REM ══════════════════════════════════════════════════════════════════════════
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    RÉSUMÉ DES TESTS API                       ║
echo ╠═══════════════════════════════════════════════════════════════╣
if !UNIT_CODE! equ 0 (echo ║  [PASS] Tests Unitaires Jest         30/30) else (echo ║  [FAIL] Tests Unitaires Jest         ÉCHECS)
if !E2E_CODE! equ 0  (echo ║  [PASS] Tests E2E API Supertest      56/56) else (echo ║  [FAIL] Tests E2E API Supertest      ÉCHECS)
if !BDD_CODE! equ 0  (echo ║  [PASS] Tests BDD Cucumber           15 scénarios) else (echo ║  [FAIL] Tests BDD Cucumber           ÉCHECS)
if "%SKIP_POSTMAN%"=="0" (
    if !NEWMAN_CODE! equ 0 (echo ║  [PASS] Tests Postman Newman         41 assertions) else (echo ║  [FAIL] Tests Postman Newman         ÉCHECS)
) else (
    echo ║  [SKIP] Tests Postman Newman         ignorés
)
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║  Rapports générés dans : test\reports\                        ║
echo ║    - junit-e2e-supertest.xml                                  ║
echo ║    - newman-report.html                                       ║
echo ║    - cucumber-report.json                                     ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

if !EXIT_CODE! equ 0 (
    echo [SUCCÈS] Tous les tests API ont réussi.
) else (
    echo [ECHEC]  Certains tests ont échoué. Consultez les logs ci-dessus.
)

endlocal
exit /b %EXIT_CODE%
