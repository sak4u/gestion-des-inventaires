"""Tests Selenium — Gestion des Utilisateurs (ADMIN uniquement)"""
import time
import pytest
import allure
from pages.utilisateurs_page import UtilisateursPage


@allure.feature("Utilisateurs")
class TestUtilisateurs:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    @allure.story("Consulter les utilisateurs")
    @allure.title("PASS - Consulter la liste des utilisateurs (ADMIN)")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_utilisateurs_chargee(self, driver):
        page = UtilisateursPage(driver)
        with allure.step("l'utilisateur ADMIN navigue vers Utilisateurs"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste des utilisateurs est affichee"):
            visible = page.is_table_visible()
            assert visible
        with allure.step("la liste contient au moins 3 utilisateurs"):
            count = page.get_row_count()
            allure.attach(f"{count} utilisateurs", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 3, f"Expected at least 3 users, got {count}"
        with allure.step("capture d'ecran - Page Utilisateurs"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page Utilisateurs",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Creer un utilisateur")
    @allure.title("PASS - Le bouton Ajouter un utilisateur est present")
    @allure.severity(allure.severity_level.NORMAL)
    def test_bouton_ajouter_present(self, driver):
        page = UtilisateursPage(driver)
        with allure.step("l'utilisateur ouvre la page Utilisateurs"):
            page.open()
        with allure.step("le bouton Ajouter est visible"):
            visible = page.element_visible(*page.BTN_NOUVEAU, timeout=5)
            assert visible
        with allure.step("capture d'ecran - Bouton Ajouter utilisateur"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Bouton Ajouter utilisateur",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Creer un utilisateur")
    @allure.title("PASS - Cliquer Ajouter ouvre le modal")
    @allure.severity(allure.severity_level.NORMAL)
    def test_modal_creation_utilisateur(self, driver):
        page = UtilisateursPage(driver)
        with allure.step("l'utilisateur ouvre la page"):
            page.open()
        with allure.step("l'utilisateur clique sur Ajouter"):
            page.click_nouveau()
        with allure.step("le modal de creation s'ouvre"):
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal creation utilisateur"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Modal creation utilisateur",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Acces")
    @allure.title("PASS - Un non-ADMIN est redirige depuis /utilisateurs")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_acces_refuse_non_admin(self, driver, login):
        page = UtilisateursPage(driver)
        with allure.step("l'utilisateur ACHAT tente d'acceder a /utilisateurs"):
            login("achat")
            page.goto("/utilisateurs")
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.common.exceptions import TimeoutException
            try:
                WebDriverWait(driver, 2).until(EC.url_contains("/dashboard"))
            except TimeoutException:
                pass
        with allure.step("il est redirige vers le dashboard"):
            url = page.current_url()
            assert "/utilisateurs" not in url or "/dashboard" in url, \
                f"Non-ADMIN should not access /utilisateurs, URL: {url}"
        with allure.step("capture d'ecran - Redirection non-ADMIN"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Redirection non-ADMIN depuis Utilisateurs",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("reconnexion en tant qu'admin"):
            login("admin")

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Creer un utilisateur")
    @allure.title("ECHEC - Creer un utilisateur avec email deja utilise")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=False, reason="ECHEC VOULU")
    def test_echec_creer_utilisateur_email_existant(self, driver):
        page = UtilisateursPage(driver)
        with allure.step("l'utilisateur ouvre la page Utilisateurs"):
            page.open()
        with allure.step("l'utilisateur clique sur Ajouter"):
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal avant echec"):
            page.take_screenshot("Modal creation avant echec")
        with allure.step("l'utilisateur remplit le formulaire avec des informations dupliquees"):
            page.fill_form(
                nom="Admin Duplic",
                email="admin@email.com",
                password="Admin1234!"
            )
        with allure.step("l'utilisateur soumet le formulaire"):
            page.save()
            time.sleep(0.5)
        with allure.step("capture d'ecran - Erreur email deja utilise"):
            page.take_screenshot("Erreur email deja utilise")
        with allure.step("ECHEC VOULU - le systeme doit rejeter l'email duplique"):
            assert page.element_visible(*page.ERROR_MSG, timeout=5), \
                "ECHEC: Un email duplique devrait afficher une erreur - capture ci-dessus"

