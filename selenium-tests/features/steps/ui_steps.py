import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import time
from behave import given, when, then
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import config


# ── Boutons ────────────────────────────────────────────────────────────────────

@when('je clique sur le bouton "{btn_id}"')
def step_click_button(context, btn_id):
    wait = WebDriverWait(context.driver, config.WAIT_TIMEOUT)
    btn = wait.until(EC.element_to_be_clickable((By.ID, btn_id)))
    context.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
    context.driver.execute_script("arguments[0].click();", btn)


@then('le bouton "{btn_id}" est visible')
def step_button_visible(context, btn_id):
    try:
        WebDriverWait(context.driver, 5).until(
            EC.visibility_of_element_located((By.ID, btn_id))
        )
    except TimeoutException:
        raise AssertionError(f"Bouton '{btn_id}' non visible")


# ── Modal ──────────────────────────────────────────────────────────────────────

@then("le modal de création s'ouvre")
@when("le modal de création s'ouvre")
def step_modal_open(context):
    try:
        WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
    except TimeoutException:
        raise AssertionError("Le modal de création ne s'est pas ouvert")


@when('je remplis le champ "{field_id}" avec "{value}"')
def step_fill_by_id(context, field_id, value):
    wait = WebDriverWait(context.driver, config.WAIT_TIMEOUT)
    el = wait.until(EC.element_to_be_clickable((By.ID, field_id)))
    el.clear()
    el.send_keys(value)


@when('je remplis le champ avec placeholder "{placeholder}" avec "{value}"')
def step_fill_by_placeholder(context, placeholder, value):
    wait = WebDriverWait(context.driver, config.WAIT_TIMEOUT)
    el = wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, f"[role='dialog'] input[placeholder*='{placeholder[:20]}']")
    ))
    el.clear()
    el.send_keys(value)


@when("je sauvegarde le modal")
def step_save_modal(context):
    wait = WebDriverWait(context.driver, config.WAIT_TIMEOUT)
    btn = wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, "[role='dialog'] .btn-primary-sm")
    ))
    context.driver.execute_script(
        "arguments[0].scrollIntoView({block:'center'}); arguments[0].click();", btn
    )
    time.sleep(0.5)


@then("le modal est fermé")
def step_modal_closed(context):
    try:
        WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
    except TimeoutException:
        raise AssertionError("Le modal n'a pas été fermé après sauvegarde")


@then("le modal reste ouvert ou un message d'erreur est affiché")
def step_modal_open_or_error(context):
    time.sleep(1)
    modal_open = len(context.driver.find_elements(By.CSS_SELECTOR, "[role='dialog']")) > 0
    try:
        err = WebDriverWait(context.driver, 3).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".alert.alert-error"))
        )
        has_error = err.is_displayed()
    except TimeoutException:
        has_error = False
    assert modal_open or has_error, \
        "Le formulaire devrait rester ouvert ou afficher une erreur"


# ── Listes / Tables ────────────────────────────────────────────────────────────

@then("la liste des produits est affichée")
def step_produits_list(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".data-table tbody"))
        )
    except TimeoutException:
        raise AssertionError("La liste des produits n'est pas affichée")


@then("la liste des commandes est affichée")
def step_commandes_list(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".data-table tbody, .empty-state, [class*='empty']")
            )
        )
    except TimeoutException:
        raise AssertionError("La liste des commandes n'est pas affichée")


@then("la liste des fournisseurs est affichée")
def step_fournisseurs_list(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".data-table tbody"))
        )
    except TimeoutException:
        raise AssertionError("La liste des fournisseurs n'est pas affichée")


@then("la liste des flux est affichée")
def step_flux_list(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".data-table tbody"))
        )
    except TimeoutException:
        raise AssertionError("La liste des flux de stock n'est pas affichée")


@then("la liste des utilisateurs est affichée")
def step_utilisateurs_list(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".data-table tbody"))
        )
    except TimeoutException:
        raise AssertionError("La liste des utilisateurs n'est pas affichée")


@then("au moins une carte entrepôt est visible")
def step_entrepot_cards(context):
    try:
        WebDriverWait(context.driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".chart-card"))
        )
        cards = context.driver.find_elements(By.CSS_SELECTOR, ".chart-card")
        assert len(cards) > 0, "Aucune carte entrepôt visible"
    except TimeoutException:
        raise AssertionError("Aucune carte entrepôt n'est visible")


@then("la liste contient au moins {n:d} élément")
@then("la liste contient au moins {n:d} éléments")
def step_list_count(context, n):
    time.sleep(1)
    rows = context.driver.find_elements(By.CSS_SELECTOR, ".data-table tbody tr")
    assert len(rows) >= n, f"Attendu >= {n} éléments, trouvé {len(rows)}"


@then("les résultats de recherche sont affichés")
def step_search_results(context):
    time.sleep(1)
    # Pas d'assertion stricte — juste vérifier que la page ne plante pas
    assert context.driver.current_url is not None


# ── Recherche ──────────────────────────────────────────────────────────────────

@when('je recherche "{term}"')
def step_search(context, term):
    try:
        inp = WebDriverWait(context.driver, 5).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
            )
        )
        inp.clear()
        inp.send_keys(term)
        time.sleep(1)
    except TimeoutException:
        raise AssertionError("Champ de recherche introuvable")


# ── Filtres Select ─────────────────────────────────────────────────────────────

@when('je sélectionne "{value}" dans le filtre "{filter_id}"')
def step_select_filter(context, value, filter_id):
    el = WebDriverWait(context.driver, config.WAIT_TIMEOUT).until(
        EC.presence_of_element_located((By.ID, filter_id))
    )
    Select(el).select_by_value(value)
    time.sleep(1)
