"""
common_steps.py — Steps réutilisables dans tous les scénarios
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from behave import given, when, then
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import config


def force_login(context, role: str):
    """Connexion robuste — vide localStorage puis se connecte."""
    creds = config.USERS[role]
    driver = context.driver
    wait = WebDriverWait(driver, config.WAIT_TIMEOUT)

    # Vider storage pour forcer logout
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
    context.current_role = role


# ── Given ─────────────────────────────────────────────────────────────────────

@given("je suis connecté en tant qu'administrateur")
def step_login_admin(context):
    force_login(context, "admin")

@given("je suis connecté en tant que responsable stock")
def step_login_stock(context):
    force_login(context, "stock")

@given("je suis connecté en tant que gestionnaire achat")
def step_login_achat(context):
    force_login(context, "achat")

@given("je ne suis pas connecté")
def step_not_logged_in(context):
    driver = context.driver
    driver.get(f"{config.BASE_URL}/login")
    try:
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    except Exception:
        pass

@given("je suis sur la page de connexion")
def step_on_login_page(context):
    driver = context.driver
    # Naviguer vers une vraie URL avant d'appeler localStorage
    driver.get(f"{config.BASE_URL}/login")
    try:
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    except Exception:
        pass
    driver.get(f"{config.BASE_URL}/login")
    WebDriverWait(driver, config.WAIT_TIMEOUT).until(
        EC.presence_of_element_located((By.ID, "login-email"))
    )

# ── Then génériques ────────────────────────────────────────────────────────────

@then("je suis redirigé vers le dashboard")
def step_redirected_dashboard(context):
    WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
        EC.url_contains("/dashboard")
    )
    assert "/dashboard" in context.driver.current_url

@then("un message d'erreur est affiché")
def step_error_shown(context):
    wait = WebDriverWait(context.driver, 5)
    try:
        el = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".alert.alert-error")
        ))
        assert el.is_displayed(), "Error element exists but not visible"
    except TimeoutException:
        raise AssertionError("No error message displayed on page")
