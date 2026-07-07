@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  start-servers.bat
REM  Script : Démarrage Backend + Frontend avant les tests Jenkins
REM  Usage  : Lancer ce script AVANT de cliquer "Build Now" dans Jenkins
REM
REM  Ce script :
REM    1. Démarre le Backend NestJS  (port 3000)
REM    2. Démarre le Frontend React  (port 5173)
REM    3. Attend que les deux soient prêts
REM    4. Affiche l'URL de Jenkins pour lancer le pipeline
REM ═══════════════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

set BACKEND_DIR=C:\Users\mohamed sakly\Desktop\Gestion des inventaires\backend
set FRONTEND_DIR=C:\Users\mohamed sakly\Desktop\Gestion des inventaires\frontend
set BACKEND_URL=http://localhost:3000
set FRONTEND_URL=http://localhost:5173

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     DÉMARRAGE DES SERVEURS — Gestion des Inventaires          ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM ── Démarrage Backend dans une nouvelle fenêtre ─────────────────────────
echo [1/2] Démarrage du Backend NestJS sur port 3000...
start "Backend NestJS" cmd /k "cd /d "%BACKEND_DIR%" && npm run start:dev"

REM ── Démarrage Frontend dans une nouvelle fenêtre ────────────────────────
echo [2/2] Démarrage du Frontend React sur port 5173...
start "Frontend React" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

REM ── Attente démarrage Backend ────────────────────────────────────────────
echo.
echo [INFO] Attente du démarrage des serveurs (30 secondes)...
timeout /t 30 /nobreak > nul

REM ── Vérification Backend ────────────────────────────────────────────────
echo.
echo [CHECK] Vérification Backend...
:check_backend
curl -s -o nul -w "%%{http_code}" "%BACKEND_URL%" > "%TEMP%\check_backend.txt" 2>nul
set /p BE_CODE=<"%TEMP%\check_backend.txt"
if "!BE_CODE!"=="200" (
    echo [OK] Backend actif sur %BACKEND_URL%
) else (
    echo [WAIT] Backend pas encore prêt ^(HTTP !BE_CODE!^) - Attente 5s...
    timeout /t 5 /nobreak > nul
    goto check_backend
)

REM ── Résumé ──────────────────────────────────────────────────────────────
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  SERVEURS DÉMARRÉS                                            ║
echo ║                                                               ║
echo ║    Backend  : http://localhost:3000   ✅                      ║
echo ║    Frontend : http://localhost:5173   ✅ (vérifiez)           ║
echo ║                                                               ║
echo ║  Vous pouvez maintenant lancer Jenkins :                      ║
echo ║    → http://localhost:8080                                    ║
echo ║    → Job "Gestion-Inventaires-CI" → Build Now                 ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
pause
