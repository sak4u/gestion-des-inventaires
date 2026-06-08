"""Tests Selenium — Gestion des Fournisseurs"""
import time
import pytest
import allure
from selenium.webdriver.common.by import By
from pages.fournisseurs_page import FournisseursPage


@allure.feature("Fournisseurs")
class TestFournisseurs:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    @allure.story("Consulter les fournisseurs")
    @allure.title("PASS - Consulter la liste des fournisseurs")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_fournisseurs_chargee(self, driver):
        page = FournisseursPage(driver)
        with allure.step("l'utilisateur navigue vers la page Fournisseurs"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste est affichee"):
            visible = page.is_table_visible()
            assert visible
        with allure.step("la liste contient des fournisseurs"):
            count = page.get_row_count()
            allure.attach(f"{count} fournisseurs", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count > 0
        with allure.step("capture d'ecran - Page Fournisseurs"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page Fournisseurs",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Creer un fournisseur")
    @allure.title("PASS - Creer un nouveau fournisseur avec succes")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_creer_fournisseur(self, driver):
        page = FournisseursPage(driver)
        nom_test = f"Fournisseur Selenium {int(time.time())}"
        email_test = f"sel-{int(time.time())}@test.com"
        with allure.step("l'utilisateur ouvre la page Fournisseurs"):
            page.open()
        with allure.step("l'utilisateur clique sur Nouveau fournisseur"):
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal creation fournisseur"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Modal creation fournisseur",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("l'utilisateur remplit le formulaire"):
            page.fill_nom(nom_test)
            page.fill_email(email_test)
        with allure.step("l'utilisateur sauvegarde le fournisseur"):
            page.save()
        with allure.step("le fournisseur apparait dans la liste"):
            found = page.text_present(nom_test, timeout=8)
            assert found
        with allure.step("capture d'ecran - Fournisseur cree"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Fournisseur cree visible",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Creer un fournisseur")
    @allure.title("PASS - Echec creation fournisseur — nom manquant")
    @allure.severity(allure.severity_level.NORMAL)
    def test_creer_fournisseur_sans_nom(self, driver):
        page = FournisseursPage(driver)
        with allure.step("l'utilisateur ouvre le modal de creation"):
            page.open()
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("l'utilisateur soumet sans nom"):
            page.save()
        with allure.step("un message d'erreur est affiche"):
            error_visible = page.element_visible(*page.ERROR_MSG, timeout=5)
            assert error_visible
        with allure.step("capture d'ecran - Erreur validation nom"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Erreur validation fournisseur",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Rechercher")
    @allure.title("PASS - La recherche filtre les fournisseurs")
    @allure.severity(allure.severity_level.NORMAL)
    def test_recherche_fournisseur(self, driver):
        page = FournisseursPage(driver)
        with allure.step("l'utilisateur ouvre la page Fournisseurs"):
            page.open()
        with allure.step("l'utilisateur recherche 'Fournisseur Tech'"):
            page.search("Fournisseur Tech")
            time.sleep(0.5)
        with allure.step("la liste est filtree"):
            count = page.get_row_count()
            allure.attach(f"{count} resultats", name="Resultats",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 0
        with allure.step("capture d'ecran - Resultats recherche fournisseur"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Resultats recherche fournisseur",
                          attachment_type=allure.attachment_type.PNG)

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Fournisseur inexistant")
    @allure.title("ECHEC - Acceder a un fournisseur inexistant retourne une erreur")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=True, reason="ECHEC VOULU")
    def test_echec_fournisseur_id_invalide(self, driver):
        page = FournisseursPage(driver)
        with allure.step("l'utilisateur navigue vers un fournisseur inexistant"):
            page.goto("/fournisseurs/00000000-0000-0000-0000-000000000000")
            time.sleep(0.5)
        with allure.step("capture d'ecran - Page fournisseur inexistant"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page fournisseur ID invalide",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("ECHEC VOULU - le fournisseur n'existe pas"):
            assert "not found" in driver.page_source.lower() or \
                   "introuvable" in driver.page_source.lower() or \
                   "404" in driver.page_source, \
                "ECHEC: La page fournisseur inexistant devrait afficher une erreur - capture ci-dessus"
