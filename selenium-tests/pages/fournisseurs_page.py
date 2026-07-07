from selenium.webdriver.common.by import By
from .base_page import BasePage


class FournisseursPage(BasePage):

    BTN_NOUVEAU  = (By.ID, "btn-nouveau-fournisseur")
    TABLE        = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS   = (By.CSS_SELECTOR, ".data-table tbody tr")
    MODAL_TITLE  = (By.CSS_SELECTOR, ".modal-title")
    INPUT_NOM    = (By.CSS_SELECTOR, "input[placeholder*='Société']")
    INPUT_EMAIL  = (By.CSS_SELECTOR, "input[placeholder*='contact@']")
    BTN_SAVE     = (By.CSS_SELECTOR, ".btn-primary-sm")
    SEARCH_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
    ERROR_MSG    = (By.CSS_SELECTOR, ".alert.alert-error")

    def open(self):
        self.goto("/fournisseurs")
        self.wait_for_url("/fournisseurs")

    def click_nouveau(self):
        self.click(*self.BTN_NOUVEAU)

    def fill_nom(self, nom: str):
        self.fill(*self.INPUT_NOM, nom)

    def fill_email(self, email: str):
        self.fill(*self.INPUT_EMAIL, email)

    def save(self):
        self.click(*self.BTN_SAVE)

    def search(self, term: str):
        self.fill(*self.SEARCH_INPUT, term)

    def is_on_page(self) -> bool:
        return "/fournisseurs" in self.current_url()

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=8)

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_TITLE, timeout=5)
