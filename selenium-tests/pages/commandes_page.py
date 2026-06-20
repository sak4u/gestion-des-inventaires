from selenium.webdriver.common.by import By
from .base_page import BasePage


class CommandesPage(BasePage):

    BTN_NOUVELLE    = (By.ID, "btn-nouvelle-commande")
    FILTER_TYPE     = (By.ID, "filter-type")
    FILTER_ETAT     = (By.ID, "filter-etat")
    TABLE_ROWS      = (By.CSS_SELECTOR, ".data-table tbody tr")
    TABLE           = (By.CSS_SELECTOR, ".data-table tbody")
    SEARCH_INPUT    = (By.CSS_SELECTOR, "input.search-input")


    def open(self):
        self.goto("/commandes")
        self.wait_for_url("/commandes")

    def click_nouvelle(self):
        self.click(*self.BTN_NOUVELLE)

    def filter_by_etat(self, etat: str):
        from selenium.webdriver.support.ui import Select
        sel = Select(self.find(*self.FILTER_ETAT))
        sel.select_by_value(etat)

    def filter_by_type(self, t: str):
        from selenium.webdriver.support.ui import Select
        sel = Select(self.find(*self.FILTER_TYPE))
        sel.select_by_value(t)

    def is_on_page(self) -> bool:
        return "/commandes" in self.current_url()

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=15)

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))
