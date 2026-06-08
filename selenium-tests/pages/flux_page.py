from selenium.webdriver.common.by import By
from .base_page import BasePage


class FluxPage(BasePage):

    BTN_NOUVEAU  = (By.ID, "btn-nouveau-flux")
    BTN_EXPORT   = (By.ID, "btn-export-stock-csv")
    TABLE        = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS   = (By.CSS_SELECTOR, ".data-table tbody tr")
    MODAL_TITLE  = (By.CSS_SELECTOR, ".modal-title")

    def open(self):
        self.goto("/flux-de-stock")
        self.wait_for_url("/flux-de-stock")

    def is_on_page(self) -> bool:
        return "/flux-de-stock" in self.current_url()

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=8)

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))

    def click_nouveau(self):
        self.click(*self.BTN_NOUVEAU)

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_TITLE, timeout=5)
