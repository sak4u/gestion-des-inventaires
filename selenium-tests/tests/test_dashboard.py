"""Tests Selenium — Dashboard et navigation"""
import pytest
import allure
from pages.dashboard_page import DashboardPage


@allure.feature("Dashboard")
class TestDashboard:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    @allure.story("Chargement")
    @allure.title("PASS - Le dashboard s'affiche correctement")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_dashboard_loads(self, driver):
        page = DashboardPage(driver)
        with allure.step("l'utilisateur est sur le dashboard"):
            page.open()
            assert page.is_on_dashboard(), "Dashboard not loaded correctly"
        with allure.step("capture d'ecran - Dashboard"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Dashboard Admin",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Produits")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_produits(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /produits"):
            page.navigate_to("/produits")
        with allure.step("la page Produits est affichee"):
            assert "/produits" in page.current_url()
        with allure.step("capture d'ecran - Page Produits"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Produits",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Commandes")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_commandes(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /commandes"):
            page.navigate_to("/commandes")
        with allure.step("la page Commandes est affichee"):
            assert "/commandes" in page.current_url()
        with allure.step("capture d'ecran - Page Commandes"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Commandes",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Fournisseurs")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_fournisseurs(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /fournisseurs"):
            page.navigate_to("/fournisseurs")
        with allure.step("la page Fournisseurs est affichee"):
            assert "/fournisseurs" in page.current_url()
        with allure.step("capture d'ecran - Page Fournisseurs"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Fournisseurs",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Entrepots")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_entrepots(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /entrepots"):
            page.navigate_to("/entrepots")
        with allure.step("la page Entrepots est affichee"):
            assert "/entrepots" in page.current_url()
        with allure.step("capture d'ecran - Page Entrepots"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Entrepots",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Flux de Stock")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_flux(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /flux-de-stock"):
            page.navigate_to("/flux-de-stock")
        with allure.step("la page Flux de Stock est affichee"):
            assert "/flux-de-stock" in page.current_url()
        with allure.step("capture d'ecran - Page Flux de Stock"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Flux de Stock",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Propositions IA")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_propositions(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /propositions"):
            page.navigate_to("/propositions")
        with allure.step("la page Propositions est affichee"):
            assert "/propositions" in page.current_url()
        with allure.step("capture d'ecran - Page Propositions IA"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Propositions IA",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Navigation")
    @allure.title("PASS - Navigation vers Utilisateurs (ADMIN)")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_utilisateurs(self, driver):
        page = DashboardPage(driver)
        with allure.step("navigation vers /utilisateurs"):
            page.navigate_to("/utilisateurs")
        with allure.step("la page Utilisateurs est affichee"):
            assert "/utilisateurs" in page.current_url()
        with allure.step("capture d'ecran - Page Utilisateurs"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Navigation Utilisateurs",
                          attachment_type=allure.attachment_type.PNG)

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Acces refuse")
    @allure.title("ECHEC - Un non-ADMIN ne peut pas acceder aux Utilisateurs")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.xfail(strict=False, reason="ECHEC VOULU")
    def test_echec_acces_dashboard_non_admin(self, driver, login):
        page = DashboardPage(driver)
        with allure.step("connexion en tant que gestionnaire ACHAT"):
            login("achat")
        with allure.step("tentative d'acces a /utilisateurs"):
            page.goto("/utilisateurs")
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.common.exceptions import TimeoutException
            try:
                WebDriverWait(driver, 2).until(EC.url_contains("/dashboard"))
            except TimeoutException:
                pass
        with allure.step("capture d'ecran - Acces refuse"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Acces refuse non-ADMIN",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("ECHEC VOULU - le non-ADMIN doit etre redirige"):
            assert "/utilisateurs" not in page.current_url() or "/dashboard" in page.current_url(), \
                "ECHEC: Le role ACHAT ne devrait pas acceder a /utilisateurs - capture ci-dessus"

