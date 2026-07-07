from selenium.webdriver.common.by import By
from .base_page import BasePage
import time


class FluxPage(BasePage):

    BTN_NOUVEAU  = (By.ID, "btn-nouveau-flux")
    BTN_EXPORT   = (By.ID, "btn-export-stock-csv")
    TABLE        = (By.CSS_SELECTOR, ".data-table tbody")
    TABLE_ROWS   = (By.CSS_SELECTOR, ".data-table tbody tr")
    EMPTY_STATE  = (By.CSS_SELECTOR, "[class*='empty'], .empty-state")
    MODAL_TITLE  = (By.CSS_SELECTOR, ".modal-title")
    MODAL_BACKDROP = (By.CSS_SELECTOR, ".modal-backdrop")

    def open(self):
        self.goto("/flux-de-stock")
        self.wait_for_url("/flux-de-stock")

    def is_on_page(self) -> bool:
        return "/flux-de-stock" in self.current_url()

    def is_table_visible(self) -> bool:
        return self.element_visible(*self.TABLE, timeout=8)

    def get_row_count(self) -> int:
        return len(self.driver.find_elements(*self.TABLE_ROWS))

    def is_table_or_empty_visible(self) -> bool:
        table_vis = self.element_visible(*self.TABLE, timeout=5)
        empty_vis = self.element_visible(*self.EMPTY_STATE, timeout=3)
        return table_vis or empty_vis

    def click_nouveau(self):
        """Clique sur le bouton Ajouter en utilisant JavaScript pour éviter les problèmes d'interception SVG"""
        el = self.find(*self.BTN_NOUVEAU)
        self.driver.execute_script("arguments[0].click();", el)
        time.sleep(1)

    def is_modal_open(self) -> bool:
        return self.element_visible(*self.MODAL_BACKDROP, timeout=8) or \
               self.element_visible(*self.MODAL_TITLE, timeout=5)


