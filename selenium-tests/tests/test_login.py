"""Tests Selenium — Authentification"""
import pytest
import allure
from pages.login_page import LoginPage
import config


@allure.feature("Authentification")
class TestLogin:

    @allure.story("Connexion reussie")
    @allure.title("PASS - Connexion reussie en tant qu'Administrateur")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_successful_login_admin(self, driver):
        page = LoginPage(driver)
        creds = config.USERS["admin"]
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
            assert page.is_on_login_page()
        with allure.step("capture d'ecran - Page de connexion"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page de connexion",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("l'utilisateur saisit l'email"):
            page.enter_email(creds["email"])
        with allure.step("l'utilisateur saisit le mot de passe"):
            page.enter_password(creds["password"])
        with allure.step("l'utilisateur clique sur Se connecter"):
            page.submit()
        with allure.step("connexion reussie - redirection dashboard"):
            assert page.is_redirected_to_dashboard()
        with allure.step("capture d'ecran - Dashboard apres connexion"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Dashboard apres connexion ADMIN",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Connexion reussie")
    @allure.title("PASS - Connexion reussie en tant que Responsable Stock")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_successful_login_stock(self, driver):
        page = LoginPage(driver)
        creds = config.USERS["stock"]
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur saisit l'email"):
            page.enter_email(creds["email"])
        with allure.step("l'utilisateur saisit le mot de passe"):
            page.enter_password(creds["password"])
        with allure.step("l'utilisateur clique sur Se connecter"):
            page.submit()
        with allure.step("connexion reussie - redirection dashboard"):
            assert page.is_redirected_to_dashboard()
        with allure.step("capture d'ecran - Dashboard RESPONSABLE_STOCK"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Dashboard RESPONSABLE_STOCK",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Connexion reussie")
    @allure.title("PASS - Connexion reussie en tant que Gestionnaire Achat")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_successful_login_achat(self, driver):
        page = LoginPage(driver)
        creds = config.USERS["achat"]
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur saisit l'email"):
            page.enter_email(creds["email"])
        with allure.step("l'utilisateur saisit le mot de passe"):
            page.enter_password(creds["password"])
        with allure.step("l'utilisateur clique sur Se connecter"):
            page.submit()
        with allure.step("connexion reussie - redirection dashboard"):
            assert page.is_redirected_to_dashboard()
        with allure.step("capture d'ecran - Dashboard ACHAT"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Dashboard ACHAT",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Connexion echouee")
    @allure.title("PASS - Echec connexion - mot de passe incorrect")
    @allure.severity(allure.severity_level.NORMAL)
    def test_failed_login_wrong_password(self, driver):
        page = LoginPage(driver)
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur saisit un mauvais mot de passe"):
            page.enter_email(config.USERS["admin"]["email"])
            page.enter_password("MauvaisMotDePasse123")
            page.submit()
        with allure.step("un message d'erreur est affiche"):
            error = page.get_error_message()
            assert error
        with allure.step("capture d'ecran - Message erreur mauvais mdp"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Erreur mauvais mot de passe",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Connexion echouee")
    @allure.title("PASS - Echec connexion - email inexistant")
    @allure.severity(allure.severity_level.NORMAL)
    def test_failed_login_wrong_email(self, driver):
        page = LoginPage(driver)
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur saisit un email inexistant"):
            page.enter_email("utilisateur.inconnu@test.com")
            page.enter_password("MotDePasse123")
            page.submit()
        with allure.step("un message d'erreur est affiche"):
            error = page.get_error_message()
            assert error
        with allure.step("capture d'ecran - Message erreur email inexistant"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Erreur email inexistant",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Connexion echouee")
    @allure.title("PASS - Echec connexion - champs vides")
    @allure.severity(allure.severity_level.MINOR)
    def test_failed_login_empty_fields(self, driver):
        page = LoginPage(driver)
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur soumet sans remplir les champs"):
            page.submit()
        with allure.step("formulaire bloque ou message d'erreur affiche"):
            still_on_login = page.is_on_login_page()
            error = page.get_error_message()
            assert still_on_login or error
        with allure.step("capture d'ecran - Champs vides"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Validation champs vides",
                          attachment_type=allure.attachment_type.PNG)

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Connexion echouee")
    @allure.title("ECHEC - Connexion avec credentials incorrects doit echouer")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.xfail(strict=True, reason="ECHEC VOULU")
    def test_echec_login_mauvais_credentials(self, driver):
        page = LoginPage(driver)
        with allure.step("l'utilisateur est sur la page de connexion"):
            page.open()
        with allure.step("l'utilisateur saisit de mauvais credentials"):
            page.enter_email("mauvais@email.com")
            page.enter_password("MauvaisPass")
            page.submit()
        with allure.step("capture d'ecran - Echec de connexion"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Echec connexion mauvais credentials",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("ECHEC VOULU - la connexion ne doit pas reussir"):
            assert page.is_redirected_to_dashboard(), \
                "ECHEC: La connexion avec de mauvais credentials ne doit pas reussir - capture ci-dessus"
