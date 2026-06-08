"""
capture_pages.py — Prend des captures d'écran de 3 pages de l'application
Pages : Entrepots, Produits, Commandes
Les captures sont sauvegardées dans reports/captures/
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import config

# Dossier de sortie
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "reports", "captures")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def login(driver, role="admin"):
    creds = config.USERS[role]
    wait = WebDriverWait(driver, config.WAIT_TIMEOUT)

    driver.get(f"{config.BASE_URL}/login")
    try:
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    except Exception:
        pass
    driver.get(f"{config.BASE_URL}/login")
    wait.until(EC.presence_of_element_located((By.ID, "login-email")))

    el = driver.find_element(By.ID, "login-email")
    el.clear()
    el.send_keys(creds["email"])

    el = driver.find_element(By.ID, "login-pwd")
    el.clear()
    el.send_keys(creds["password"])

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    wait.until(EC.url_contains("/dashboard"))
    print(f"  Connecte en tant que {role}")


def capture(driver, path, filename, wait_selector=None, wait_time=2):
    """Navigue vers path et prend une capture pleine page."""
    driver.get(f"{config.BASE_URL}{path}")
    time.sleep(wait_time)

    if wait_selector:
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, wait_selector))
            )
            time.sleep(1)
        except Exception:
            pass

    # Scroll en haut pour capturer depuis le début
    driver.execute_script("window.scrollTo(0, 0)")
    time.sleep(0.5)

    filepath = os.path.join(OUTPUT_DIR, filename)
    driver.save_screenshot(filepath)
    print(f"  Capture sauvegardee : {filepath}")
    return filepath


def main():
    print("Demarrage du navigateur...")
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1600,900")
    options.add_argument("--disable-notifications")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(config.WAIT_TIMEOUT)

    try:
        # ── Connexion ──────────────────────────────────────────────
        print("\n[1/4] Connexion en tant qu'administrateur...")
        login(driver, "admin")

        # ── Capture : Entrepots ───────────────────────────────────
        print("\n[2/4] Capture de la page Entrepots...")
        capture(
            driver,
            path="/entrepots",
            filename="capture_entrepots.png",
            wait_selector=".chart-card",
            wait_time=2,
        )

        # ── Capture : Produits ────────────────────────────────────
        print("\n[3/4] Capture de la page Produits...")
        capture(
            driver,
            path="/produits",
            filename="capture_produits.png",
            wait_selector=".data-table tbody tr",
            wait_time=2,
        )

        # ── Capture : Commandes ───────────────────────────────────
        print("\n[4/4] Capture de la page Commandes...")
        capture(
            driver,
            path="/commandes",
            filename="capture_commandes.png",
            wait_selector=".data-table tbody, .empty-state",
            wait_time=2,
        )

        print("\n" + "=" * 55)
        print("  Captures terminees avec succes !")
        print(f"  Dossier : {OUTPUT_DIR}")
        print("=" * 55)

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
