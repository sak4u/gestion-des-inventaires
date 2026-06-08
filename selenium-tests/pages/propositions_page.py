from selenium.webdriver.common.by import By
from .base_page import BasePage


class PropositionsPage(BasePage):

    TABLE        = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS   = (By.CSS_SELECTOR, ".data-table tbody tr")
    BTN_ACCEPTER = (By.XPATH, "//button[contains(text(),'Accepter')]")
    BTN_REFUSER  = (By.XPATH, "//button[contains(text(),'Refuser')]")
    FILTER_ALL   = (By.XPATH, "//button[text()='Toutes']")
    MODAL        = (By.CSS_SELECTOR, ".modal-title")
    EMPTY_STATE  = (By.CSS_SELECTOR, "[class*='empty'], .empty-state")

    def open(self):
        self.goto("/propositions")
        self.wait_for_url("/propositions")

    def is_on_page(self) -> bool:
        return "/propositions" in self.current_url()

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))

    def is_table_or_empty_visible(self) -> bool:
        table_vis = self.element_visible(*self.TABLE, timeout=8)
        empty_vis = self.element_visible(*self.EMPTY_STATE, timeout=3)
        return table_vis or empty_vis
