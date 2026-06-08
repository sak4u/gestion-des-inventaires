import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from .base_page import BasePage
import config


class ProduitsPage(BasePage):

    # ── Sélecteurs ─────────────────────────────────────────────────
    BTN_NOUVEAU     = (By.ID, "btn-nouveau-produit")
    BTN_EXPORT_CSV  = (By.ID, "btn-export-produits-csv")
    FILTER_CAT      = (By.ID, "filter-categorie")
    TABLE           = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS      = (By.CSS_SELECTOR, ".data-table tbody tr")
    MODAL_TITLE     = (By.CSS_SELECTOR, ".modal-title")
    INPUT_NOM       = (By.ID, "produit-nom")
    INPUT_CODEBARE  = (By.ID, "produit-codebare")
    INPUT_CATEGORY  = (By.ID, "produit-category")
    INPUT_ALERT     = (By.ID, "produit-stockalert")
    INPUT_PRIX_VENTE= (By.ID, "produit-prixvente")
    ERROR_MSG       = (By.CSS_SELECTOR, ".alert.alert-error")
    SEARCH_INPUT    = (By.CSS_SELECTOR, "input[placeholder*='Rechercher']")

    # ── Actions ────────────────────────────────────────────────────
    def open(self):
        self.goto("/produits")
        self.wait_for_url("/produits")

    def click_nouveau(self):
        self.click(*self.BTN_NOUVEAU)
        # Attendre que le modal soit visible
        WebDriverWait(self.driver, config.WAIT_TIMEOUT).until(
            EC.visibility_of_element_located(self.MODAL_TITLE)
        )

    def fill_form(self, nom: str, codeBare: str, category: str,
                  stockAlert: str = "5", prixVente: str = "10"):
        # Scroll en haut du modal avant de remplir
        self.driver.execute_script("window.scrollTo(0,0)")
        time.sleep(0.3)
        if nom:
            self.fill(*self.INPUT_NOM, nom)
        self.fill(*self.INPUT_CODEBARE,   codeBare)
        self.fill(*self.INPUT_CATEGORY,   category)
        self.fill(*self.INPUT_ALERT,      stockAlert)
        self.fill(*self.INPUT_PRIX_VENTE, prixVente)

    def save_via_js(self):
        """Clic JS sur le bouton Créer/Mettre à jour DANS le modal (role=dialog)."""
        btn = WebDriverWait(self.driver, config.WAIT_TIMEOUT).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "[role='dialog'] .btn-primary-sm")
            )
        )
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block:'center'}); arguments[0].click();",
            btn
        )

    def wait_modal_close(self):
        """Attend que le modal disparaisse complètement."""
        WebDriverWait(self.driver, config.WAIT_TIMEOUT).until(
            EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, "[role='dialog']")
            )
        )

    def search(self, term: str):
        self.fill(*self.SEARCH_INPUT, term)

    # ── Assertions ─────────────────────────────────────────────────
    def is_on_page(self) -> bool:
        return "/produits" in self.current_url()

    def get_row_count(self) -> int:
        rows = self.driver.find_elements(*self.TABLE_ROWS)
        return len(rows)

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=8)

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_TITLE, timeout=5)

    def product_in_table(self, nom: str) -> bool:
        return self.text_present(nom, timeout=10)

    def get_error(self) -> str:
        if self.element_visible(*self.ERROR_MSG, timeout=3):
            return self.find(*self.ERROR_MSG).text
        return ""
