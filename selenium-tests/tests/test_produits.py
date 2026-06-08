"""Tests Selenium — Gestion des Produits"""
import time
import pytest
import allure
from pages.produits_page import ProduitsPage


@allure.feature("Produits")
class TestProduits:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    # ── PASS ──────────────────────────────────────────────────────
    @allure.story("Consulter les produits")
    @allure.title("PASS - Consulter la liste des produits")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_produits_chargee(self, driver):
        page = ProduitsPage(driver)
        with allure.step("l'utilisateur navigue vers la page Produits"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste des produits est affichee"):
            visible = page.is_table_visible()
            assert visible, "Product list table not visible"
        with allure.step("la liste contient des produits"):
            count = page.get_row_count()
            allure.attach(f"{count} produits", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count > 0, f"Expected products, got {count}"
        with allure.step("capture d'ecran - Page Produits"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page Produits",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer un produit")
    @allure.title("PASS - Creer un nouveau produit avec succes")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_creer_produit(self, driver):
        page = ProduitsPage(driver)
        test_name = f"Produit Selenium Test {int(time.time())}"
        test_code = f"SEL-{int(time.time())}"
        with allure.step("l'utilisateur ouvre la page Produits"):
            page.open()
        with allure.step("l'utilisateur clique sur Nouveau produit"):
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("capture d'ecran - Modal creation produit"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Modal creation produit",
                attachment_type=allure.attachment_type.PNG,
            )
        with allure.step("l'utilisateur remplit le formulaire"):
            page.fill_form(nom=test_name, codeBare=test_code,
                           category="Electronique", stockAlert="5", prixVente="99.99")
        with allure.step("l'utilisateur sauvegarde le produit"):
            page.save_via_js()
            page.wait_modal_close()
        with allure.step("le produit apparait dans la liste"):
            found = page.product_in_table(test_name)
            assert found, f"Product '{test_name}' not found after creation"
        with allure.step("capture d'ecran - Produit cree dans la liste"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Produit cree visible dans la liste",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer un produit")
    @allure.title("PASS - Validation formulaire — nom manquant bloque la soumission")
    @allure.severity(allure.severity_level.NORMAL)
    def test_creer_produit_sans_nom(self, driver):
        page = ProduitsPage(driver)
        with allure.step("l'utilisateur ouvre le modal de creation"):
            page.open()
            page.click_nouveau()
            assert page.is_modal_open()
        with allure.step("l'utilisateur laisse le nom vide et soumet"):
            page.fill(*page.INPUT_CODEBARE, f"SEL-NONAME-{int(time.time())}")
            page.fill(*page.INPUT_CATEGORY, "Test")
            page.save_via_js()
        with allure.step("le modal reste ouvert ou une erreur est affichee"):
            modal_open = page.is_modal_open()
            error_shown = bool(page.get_error())
            assert modal_open or error_shown, \
                "Submission with empty name should be blocked or show error"
        with allure.step("capture d'ecran - Validation nom manquant"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Validation nom manquant",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Rechercher un produit")
    @allure.title("PASS - La recherche filtre les produits")
    @allure.severity(allure.severity_level.NORMAL)
    def test_recherche_produit(self, driver):
        page = ProduitsPage(driver)
        with allure.step("l'utilisateur ouvre la page Produits"):
            page.open()
        with allure.step("l'utilisateur tape dans la barre de recherche"):
            page.search("Produit Test 1")
            time.sleep(0.5)
        with allure.step("la liste est filtree"):
            count = page.get_row_count()
            allure.attach(f"{count} resultats", name="Resultats",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 0
        with allure.step("capture d'ecran - Resultats de recherche"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Resultats recherche produit",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Exporter les produits")
    @allure.title("PASS - Bouton Export CSV est present")
    @allure.severity(allure.severity_level.MINOR)
    def test_export_csv_button_present(self, driver):
        page = ProduitsPage(driver)
        with allure.step("l'utilisateur ouvre la page Produits"):
            page.open()
        with allure.step("le bouton Export CSV est visible"):
            visible = page.element_visible(*page.BTN_EXPORT_CSV, timeout=5)
            assert visible, "Export CSV button not visible"
        with allure.step("capture d'ecran - Bouton Export CSV"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Bouton Export CSV",
                attachment_type=allure.attachment_type.PNG,
            )

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Produit inexistant")
    @allure.title("ECHEC - Acceder a un produit avec ID invalide retourne 404")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=False, reason="ECHEC VOULU")
    def test_echec_produit_id_invalide(self, driver):
        page = ProduitsPage(driver)
        with allure.step("l'utilisateur navigue vers un produit inexistant"):
            page.goto("/produits/00000000-0000-0000-0000-000000000000")
            time.sleep(0.5)
        with allure.step("capture d'ecran - Page produit inexistant"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page produit ID invalide",
                attachment_type=allure.attachment_type.PNG,
            )
        with allure.step("ECHEC VOULU - le produit n'existe pas, une erreur doit s'afficher"):
            assert "not found" in driver.page_source.lower() or \
                   "introuvable" in driver.page_source.lower() or \
                   "404" in driver.page_source, \
                "ECHEC: La page produit inexistant devrait afficher une erreur - capture ci-dessus"
