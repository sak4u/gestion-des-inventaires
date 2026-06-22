# ═══════════════════════════════════════════════════════════════
#  Configuration globale des tests Selenium
# ═══════════════════════════════════════════════════════════════

import os

BASE_URL = "http://localhost:5173"

# Credentials définis dans prisma/seed.ts
USERS = {
    "admin": {
        "email":    "admin@email.com",
        "password": "admin123",
        "role":     "ADMIN",
    },
    "stock": {
        "email":    "manager@email.com",
        "password": "admin123",
        "role":     "RESPONSABLE_STOCK",
    },
    "achat": {
        "email":    "achat@email.com",
        "password": "admin123",
        "role":     "ACHAT",
    },
}

# Timeout par défaut (secondes)
WAIT_TIMEOUT = 10

# Navigateur : "chrome" ou "firefox"
BROWSER = "chrome"

# Mode headless (True = sans fenêtre, False = avec fenêtre visible)
# Priorité : variable d'environnement SELENIUM_HEADLESS > False par défaut
HEADLESS = os.environ.get('SELENIUM_HEADLESS', 'false').strip().lower() == 'true'




