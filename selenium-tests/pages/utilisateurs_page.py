from selenium.webdriver.common.by import By
from .base_page import BasePage


class UtilisateursPage(BasePage):

    BTN_NOUVEAU  = (By.ID, "btn-nouvel-utilisateur")
    TABLE        = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS   = (By.CSS_SELECTOR, ".data-table tbody tr")
    MODAL_TITLE  = (By.CSS_SELECTOR, ".modal-title")
    SEARCH_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
    ERROR_MSG    = (By.CSS_SELECTOR, ".alert.alert-error")

    INPUT_NOM    = (By.CSS_SELECTOR, "[role='dialog'] input[placeholder*='Mohamed']")
    INPUT_EMAIL  = (By.CSS_SELECTOR, "[role='dialog'] input[type='email']")
    INPUT_PWD    = (By.CSS_SELECTOR, "[role='dialog'] input[type='password']")
    SELECT_ROLE  = (By.CSS_SELECTOR, "[role='dialog'] select")
    BTN_SAVE     = (By.CSS_SELECTOR, "[role='dialog'] .btn-primary-sm")

    def open(self):
        self.goto("/utilisateurs")
        self.wait_for_url("/utilisateurs")

    def is_on_page(self) -> bool:
        return "/utilisateurs" in self.current_url()

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=8)

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))

    def click_nouveau(self):
        self.click(*self.BTN_NOUVEAU)

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_TITLE, timeout=5)

    def fill_form(self, nom: str, email: str, password: str = None, role: str = None):
        if nom:
            self.fill(*self.INPUT_NOM, nom)
        if email:
            self.fill(*self.INPUT_EMAIL, email)
        if password:
            self.fill(*self.INPUT_PWD, password)
        if role:
            from selenium.webdriver.support.ui import Select
            sel = Select(self.find(*self.SELECT_ROLE))
            sel.select_by_value(role)

    def save(self):
        btn = self.find(*self.BTN_SAVE)
        self.driver.execute_script("arguments[0].click();", btn)

