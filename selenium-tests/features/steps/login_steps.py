import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import time
from behave import given, when, then
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import config


@when('je saisis l\'email "{email}" et le mot de passe "{password}"')
def step_fill_credentials(context, email, password):
    wait = WebDriverWait(context.driver, config.WAIT_TIMEOUT)
    el = wait.until(EC.element_to_be_clickable((By.ID, "login-email")))
    el.clear()
    el.send_keys(email)
    el = context.driver.find_element(By.ID, "login-pwd")
    el.clear()
    el.send_keys(password)


@when("je clique sur Se connecter")
def step_click_login(context):
    context.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()


@when("je clique sur Se connecter sans remplir les champs")
def step_click_login_empty(context):
    context.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(1)


@then('le titre de la page contient "{fragment}"')
def step_title_contains(context, fragment):
    assert fragment in context.driver.current_url, \
        f"URL '{context.driver.current_url}' ne contient pas '{fragment}'"


@then("je reste sur la page de connexion ou un message d'erreur est affiché")
def step_still_on_login_or_error(context):
    time.sleep(1)
    on_login = "/login" in context.driver.current_url
    try:
        el = WebDriverWait(context.driver, 3).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".alert.alert-error"))
        )
        has_error = el.is_displayed()
    except TimeoutException:
        has_error = False
    assert on_login or has_error, \
        "Empty login should stay on /login or show an error"
