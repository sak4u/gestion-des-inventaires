from selenium.webdriver.common.by import By
from .base_page import BasePage


class EntrepotsPage(BasePage):

    BTN_NOUVEAU  = (By.ID, "btn-nouvel-entrepot")
    CARDS        = (By.CSS_SELECTOR, ".chart-card")
    MODAL_TITLE  = (By.CSS_SELECTOR, ".modal-title")
    INPUT_NOM    = (By.CSS_SELECTOR, "input[placeholder*='Entrepôt Central']")
    INPUT_CAP    = (By.CSS_SELECTOR, "input[placeholder*='1000']")
    BTN_SAVE     = (By.CSS_SELECTOR, ".btn-primary-sm")
    ERROR_MSG    = (By.CSS_SELECTOR, ".alert.alert-error")

    def open(self):
        self.goto("/entrepots")
        self.wait_for_url("/entrepots")

    def click_nouveau(self):
        self.click(*self.BTN_NOUVEAU)

    def fill_nom(self, nom: str):
        self.fill(*self.INPUT_NOM, nom)

    def fill_capacite(self, cap: str):
        self.fill(*self.INPUT_CAP, cap)

    def save(self):
        self.click(*self.BTN_SAVE)

    def is_on_page(self) -> bool:
        return "/entrepots" in self.current_url()

    def get_card_count(self) -> int:
        return len(self.driver.find_elements(*self.CARDS))

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_TITLE, timeout=5)
