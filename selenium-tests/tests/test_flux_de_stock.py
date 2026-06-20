"""Tests Selenium — Flux de Stock"""
import time
import pytest
import allure
from pages.flux_page import FluxPage


@allure.feature("Flux de Stock")
class TestFluxDeStock:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("stock")

    @allure.story("Consulter les flux")
    @allure.title("PASS - Consulter la liste des flux de stock")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_flux_chargee(self, driver):
        page = FluxPage(driver)
        with allure.step("l'utilisateur navigue vers Flux de Stock"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste ou l'etat vide est affiche"):
            visible = page.is_table_or_empty_visible()
            assert visible
        with allure.step("le nombre de mouvements est releve"):
            count = page.get_row_count()
            allure.attach(f"{count} mouvements", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
        with allure.step("capture d'ecran - Page Flux de Stock"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page Flux de Stock",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Ajouter un mouvement")
    @allure.title("PASS - Le bouton Ajouter un mouvement est present")
    @allure.severity(allure.severity_level.NORMAL)
    def test_bouton_ajouter_present(self, driver):
        page = FluxPage(driver)
        with allure.step("l'utilisateur ouvre la page Flux de Stock"):
            page.open()
        with allure.step("le bouton Ajouter est visible"):
            visible = page.element_visible(*page.BTN_NOUVEAU, timeout=5)
            assert visible
        with allure.step("capture d'ecran - Bouton Ajouter mouvement"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Bouton Ajouter mouvement",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Ajouter un mouvement")
    @allure.title("PASS - Cliquer sur Ajouter ouvre le modal")
    @allure.severity(allure.severity_level.NORMAL)
    def test_modal_ajout_flux(self, driver):
        page = FluxPage(driver)
        with allure.step("l'utilisateur ouvre la page"):
            page.open()
        with allure.step("l'utilisateur clique sur Ajouter"):
            page.click_nouveau()
        with allure.step("le modal s'ouvre"):
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal ajout flux"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Modal ajout mouvement stock",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Exporter")
    @allure.title("PASS - Bouton Export CSV est present")
    @allure.severity(allure.severity_level.MINOR)
    def test_export_csv_present(self, driver):
        page = FluxPage(driver)
        with allure.step("l'utilisateur ouvre la page"):
            page.open()
        with allure.step("le bouton Export CSV est visible"):
            visible = page.element_visible(*page.BTN_EXPORT, timeout=5)
            assert visible
        with allure.step("capture d'ecran - Bouton Export CSV Flux"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Bouton Export CSV Flux",
                          attachment_type=allure.attachment_type.PNG)

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Acces refuse")
    @allure.title("ECHEC - Le role ACHAT ne peut pas acceder aux flux de stock")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=False, reason="ECHEC VOULU")
    def test_echec_acces_flux_role_achat(self, driver, login):
        from pages.flux_page import FluxPage as FP
        page = FP(driver)
        with allure.step("connexion en tant que gestionnaire ACHAT"):
            login("achat")
        with allure.step("tentative d'acces a /flux-de-stock"):
            page.goto("/flux-de-stock")
            time.sleep(0.5)
        with allure.step("capture d'ecran - Acces flux role ACHAT"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Acces flux role ACHAT",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("ECHEC VOULU - le role ACHAT ne devrait pas voir les flux"):
            assert "/flux-de-stock" not in driver.current_url and "/dashboard" in driver.current_url, \
                "ECHEC: Le role ACHAT devrait etre redirige depuis /flux-de-stock - capture ci-dessus"

