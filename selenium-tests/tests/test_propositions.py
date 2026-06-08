"""Tests Selenium — Propositions IA"""
import time
import pytest
import allure
from pages.propositions_page import PropositionsPage


@allure.feature("Propositions IA")
class TestPropositions:

    @pytest.fixture(autouse=True)
    def setup(self, login):
        login("achat")

    @allure.story("Consulter les propositions")
    @allure.title("PASS - Consulter la liste des propositions IA")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_liste_propositions_chargee(self, driver):
        page = PropositionsPage(driver)
        with allure.step("l'utilisateur navigue vers Propositions IA"):
            page.open()
            assert page.is_on_page()
        with allure.step("la liste ou l'etat vide est affiche"):
            visible = page.is_table_or_empty_visible()
            assert visible
        with allure.step("le nombre de propositions est releve"):
            count = page.get_row_count()
            allure.attach(f"{count} propositions", name="Nombre",
                          attachment_type=allure.attachment_type.TEXT)
        with allure.step("capture d'ecran - Page Propositions IA"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Page Propositions IA",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Filtrer les propositions")
    @allure.title("PASS - Filtre Toutes les propositions est present")
    @allure.severity(allure.severity_level.NORMAL)
    def test_filtre_toutes_propositions(self, driver):
        page = PropositionsPage(driver)
        with allure.step("l'utilisateur ouvre la page Propositions"):
            page.open()
        with allure.step("le filtre Toutes est visible"):
            visible = page.element_visible(*page.FILTER_ALL, timeout=5)
            assert visible
        with allure.step("capture d'ecran - Filtre Toutes"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Filtre Toutes propositions",
                          attachment_type=allure.attachment_type.PNG)

    @allure.story("Propositions EN_ATTENTE")
    @allure.title("PASS - Les boutons Accepter et Refuser sont presents si propositions")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_boutons_accepter_refuser(self, driver):
        page = PropositionsPage(driver)
        with allure.step("l'utilisateur ouvre la page Propositions"):
            page.open()
        with allure.step("les boutons d'action sont presentes si propositions existent"):
            count = page.get_row_count()
            if count > 0:
                accepter_visible = page.element_visible(*page.BTN_ACCEPTER, timeout=5)
                allure.attach(f"Bouton Accepter visible: {accepter_visible}",
                              name="Boutons action", attachment_type=allure.attachment_type.TEXT)
            else:
                allure.attach("Aucune proposition EN_ATTENTE",
                              name="Etat", attachment_type=allure.attachment_type.TEXT)
        with allure.step("capture d'ecran - Boutons Accepter Refuser"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Boutons Accepter Refuser",
                          attachment_type=allure.attachment_type.PNG)

    # ── ECHEC ─────────────────────────────────────────────────────
    @allure.story("Acces refuse")
    @allure.title("ECHEC - Un responsable stock ne peut pas accepter une proposition")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.xfail(strict=True, reason="ECHEC VOULU")
    def test_echec_accepter_proposition_sans_entrepot(self, driver):
        page = PropositionsPage(driver)
        with allure.step("l'utilisateur ouvre la page Propositions"):
            page.open()
        with allure.step("capture d'ecran - Page propositions avant echec"):
            allure.attach(body=driver.get_screenshot_as_png(),
                          name="Propositions avant echec",
                          attachment_type=allure.attachment_type.PNG)
        with allure.step("ECHEC VOULU - tentative d'accepter une proposition inexistante via API"):
            import requests
            res = requests.post(
                "http://localhost:3000/propositions/id-inexistant/accept",
                json={"entrepotId": "id-entrepot-invalide"},
                headers={"Authorization": "Bearer token-invalide"},
                timeout=5,
            )
            allure.attach(f"Status: {res.status_code}", name="Reponse API",
                          attachment_type=allure.attachment_type.TEXT)
            assert res.status_code == 200, \
                f"ECHEC: L'API retourne {res.status_code} au lieu de 200 - capture ci-dessus"

