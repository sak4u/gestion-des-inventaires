"""Tests Selenium — Gestion des Entrepots"""
import time
import pytest
import allure
from selenium.webdriver.common.by import By
from pages.entrepots_page import EntrepotsPage


@allure.feature("Entrepots")
class TestEntrepots:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    # ── PASS ──────────────────────────────────────────────────────
    @allure.story("Consulter les entrepots")
    @allure.title("PASS - Consulter la liste des entrepots")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_entrepots_chargee(self, driver):
        page = EntrepotsPage(driver)
        with allure.step("l'utilisateur navigue vers la page Entrepots"):
            page.open()
            assert page.is_on_page()
        with allure.step("les cartes entrepots sont affichees"):
            count = page.get_card_count()
            allure.attach(f"{count} entrepots", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count > 0, f"Expected entrepot cards, got {count}"
        with allure.step("capture d'ecran - Page Entrepots"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page Entrepots",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer un entrepot")
    @allure.title("PASS - Creer un nouvel entrepot avec succes")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_creer_entrepot(self, driver):
        page = EntrepotsPage(driver)
        nom_test = f"Entrepot Selenium {int(time.time())}"
        with allure.step("l'utilisateur ouvre la page Entrepots"):
            page.open()
        with allure.step("l'utilisateur clique sur Nouvel entrepot"):
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal creation entrepot"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Modal creation entrepot",
                attachment_type=allure.attachment_type.PNG,
            )
        with allure.step("l'utilisateur remplit le formulaire"):
            page.fill_nom(nom_test)
            page.fill_capacite("500")
        with allure.step("l'utilisateur sauvegarde"):
            page.save()
        with allure.step("le nouvel entrepot apparait dans la liste"):
            found = page.text_present(nom_test, timeout=8)
            assert found, f"Entrepot '{nom_test}' not found after creation"
        with allure.step("capture d'ecran - Entrepot cree"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Entrepot cree visible",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer un entrepot")
    @allure.title("PASS - Validation nom manquant bloque la soumission")
    @allure.severity(allure.severity_level.NORMAL)
    def test_creer_entrepot_sans_nom(self, driver):
        page = EntrepotsPage(driver)
        with allure.step("l'utilisateur ouvre le modal"):
            page.open()
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("l'utilisateur soumet sans nom"):
            page.save()
        with allure.step("un message d'erreur est affiche"):
            error_visible = page.element_visible(*page.ERROR_MSG, timeout=5)
            assert error_visible, "Validation error not shown for missing nom"
        with allure.step("capture d'ecran - Erreur validation nom"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Erreur validation entrepot",
                attachment_type=allure.attachment_type.PNG,
            )

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Entrepot inexistant")
    @allure.title("ECHEC - Acceder a un entrepot inexistant retourne une erreur")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=True, reason="ECHEC VOULU")
    def test_echec_entrepot_id_invalide(self, driver):
        page = EntrepotsPage(driver)
        with allure.step("l'utilisateur navigue vers un entrepot inexistant"):
            page.goto("/entrepots/00000000-0000-0000-0000-000000000000")
            time.sleep(0.5)
        with allure.step("capture d'ecran - Page entrepot inexistant"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page entrepot ID invalide",
                attachment_type=allure.attachment_type.PNG,
            )
        with allure.step("ECHEC VOULU - l'entrepot n'existe pas, une erreur doit s'afficher"):
            assert "not found" in driver.page_source.lower() or \
                   "introuvable" in driver.page_source.lower() or \
                   "404" in driver.page_source, \
                "ECHEC: La page entrepot inexistant devrait afficher une erreur - capture ci-dessus"
