from selenium.webdriver.common.by import By
from .base_page import BasePage


class DashboardPage(BasePage):

    # ── Sélecteurs ─────────────────────────────────────────────────
    NAV_PRODUITS      = (By.XPATH, "//a[contains(@href,'/produits')]")
    NAV_COMMANDES     = (By.XPATH, "//a[contains(@href,'/commandes')]")
    NAV_FOURNISSEURS  = (By.XPATH, "//a[contains(@href,'/fournisseurs')]")
    NAV_ENTREPOTS     = (By.XPATH, "//a[contains(@href,'/entrepots')]")
    NAV_FLUX          = (By.XPATH, "//a[contains(@href,'/flux-de-stock')]")
    NAV_PROPOSITIONS  = (By.XPATH, "//a[contains(@href,'/propositions')]")
    NAV_UTILISATEURS  = (By.XPATH, "//a[contains(@href,'/utilisateurs')]")

    # ── Actions ────────────────────────────────────────────────────
    def open(self):
        self.goto("/dashboard")
        self.wait_for_url("/dashboard")

    def navigate_to(self, path: str):
        self.goto(path)
        self.wait_for_url(path)

    # ── Assertions ─────────────────────────────────────────────────
    def is_on_dashboard(self) -> bool:
        return "/dashboard" in self.current_url()

    def is_nav_link_visible(self, href_fragment: str) -> bool:
        return self.element_visible(
            By.XPATH, f"//a[contains(@href,'{href_fragment}')]", timeout=5
        )
