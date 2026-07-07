import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import time
from behave import given, when, then
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import config


@given('je suis sur la page "{path}"')
def step_goto_page(context, path):
    context.driver.get(f"{config.BASE_URL}{path}")
    WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
        EC.url_contains(path.split("?")[0])
    )


@when('je navigue vers "{path}"')
def step_navigate_to(context, path):
    context.driver.get(f"{config.BASE_URL}{path}")
    time.sleep(1)


@then('la page "{path}" est affichée')
def step_page_displayed(context, path):
    WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
        EC.url_contains(path.split("?")[0])
    )
    assert path.split("?")[0] in context.driver.current_url, \
        f"URL actuelle: {context.driver.current_url}"


@then('l\'URL contient "{fragment}"')
def step_url_contains(context, fragment):
    time.sleep(1)
    assert fragment in context.driver.current_url, \
        f"URL '{context.driver.current_url}' ne contient pas '{fragment}'"


@then('je ne suis pas sur la page "{path}"')
def step_not_on_page(context, path):
    time.sleep(2)
    assert path not in context.driver.current_url or "/dashboard" in context.driver.current_url, \
        f"Non-admin devrait être redirigé depuis {path}"


@then('le texte "{text}" est visible sur la page')
def step_text_visible(context, text):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//*[contains(text(),'{text}')]")
            )
        )
    except TimeoutException:
        raise AssertionError(f"Texte '{text}' non trouvé sur la page")


@then('le texte "{text}" est visible dans la liste')
def step_text_in_list(context, text):
    try:
        WebDriverWait(context.driver, 10).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//*[contains(text(),'{text}')]")
            )
        )
    except TimeoutException:
        raise AssertionError(f"'{text}' non trouvé dans la liste après sauvegarde")


@then("la page ne contient pas de message d'erreur critique")
def step_no_critical_error(context):
    time.sleep(1)
    source = context.driver.page_source.lower()
    assert "error 500" not in source and "cannot read" not in source, \
        "Erreur critique détectée sur la page"
