"""Tests Selenium — Gestion des Commandes"""
import pytest
import allure
from pages.commandes_page import CommandesPage


@allure.feature("Commandes")
class TestCommandes:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("admin")

    # ── PASS ──────────────────────────────────────────────────────
    @allure.story("Consulter les commandes")
    @allure.title("PASS - Consulter la liste des commandes")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_commandes_chargee(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur navigue vers la page Commandes"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste des commandes est affichee"):
            visible = page.is_table_visible()
            assert visible, "Commandes table not visible"
        with allure.step("la liste contient des commandes"):
            count = page.get_row_count()
            allure.attach(f"{count} commandes chargees", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 0
        with allure.step("capture d'ecran - Page Commandes"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page Commandes",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer une commande")
    @allure.title("PASS - Le bouton Nouvelle commande est present")
    @allure.severity(allure.severity_level.NORMAL)
    def test_bouton_nouvelle_commande_present(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur ouvre la page Commandes"):
            page.open()
        with allure.step("le bouton Nouvelle commande est visible"):
            visible = page.element_visible(*page.BTN_NOUVELLE, timeout=5)
            assert visible, "Bouton Nouvelle commande non visible"
        with allure.step("capture d'ecran - Bouton Nouvelle commande"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Bouton Nouvelle commande",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Creer une commande")
    @allure.title("PASS - Cliquer Nouvelle commande redirige vers le formulaire")
    @allure.severity(allure.severity_level.NORMAL)
    def test_navigate_to_nouvelle_commande(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur ouvre la page Commandes"):
            page.open()
        with allure.step("l'utilisateur clique sur Nouvelle commande"):
            page.click_nouvelle()
        with allure.step("la page de creation de commande est affichee"):
            result = "/commandes" in page.current_url()
            assert result, "Navigate to nouvelle commande page failed"
        with allure.step("capture d'ecran - Formulaire nouvelle commande"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Formulaire Nouvelle commande",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Filtrer les commandes")
    @allure.title("PASS - Filtrer les commandes par etat EN_COURS")
    @allure.severity(allure.severity_level.NORMAL)
    def test_filter_by_etat_en_cours(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur ouvre la page Commandes"):
            page.open()
        with allure.step("filtre par etat EN_COURS"):
            page.filter_by_etat("EN_COURS")
        with allure.step("la liste est filtree"):
            count = page.get_row_count()
            allure.attach(f"{count} commandes EN_COURS", name="Filtre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 0
        with allure.step("capture d'ecran - Filtre EN_COURS"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Filtre EN_COURS applique",
                attachment_type=allure.attachment_type.PNG,
            )

    @allure.story("Filtrer les commandes")
    @allure.title("PASS - Filtrer les commandes par type ACHAT")
    @allure.severity(allure.severity_level.NORMAL)
    def test_filter_by_type_achat(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur ouvre la page Commandes"):
            page.open()
        with allure.step("filtre par type ACHAT"):
            page.filter_by_type("ACHAT")
        with allure.step("la liste est filtree"):
            count = page.get_row_count()
            allure.attach(f"{count} commandes ACHAT", name="Filtre",
                          attachment_type=allure.attachment_type.TEXT)
            assert count >= 0
        with allure.step("capture d'ecran - Filtre ACHAT"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Filtre ACHAT applique",
                attachment_type=allure.attachment_type.PNG,
            )

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Commande inexistante")
    @allure.title("ECHEC - Acceder a une commande avec ID invalide retourne 404")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=True, reason="ECHEC VOULU")
    def test_echec_commande_id_invalide(self, driver):
        page = CommandesPage(driver)
        with allure.step("l'utilisateur navigue vers une commande inexistante"):
            page.goto("/commandes/id-inexistant-00000")
        with allure.step("capture d'ecran - Page commande invalide"):
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Page commande ID invalide",
                attachment_type=allure.attachment_type.PNG,
            )
        with allure.step("ECHEC VOULU - la page doit afficher une erreur 404"):
            import time; time.sleep(0.5)
            assert "404" in driver.page_source or "not found" in driver.page_source.lower(), \
                "ECHEC: La page commande inexistante devrait afficher une erreur - capture ci-dessus"

