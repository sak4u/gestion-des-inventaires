from selenium.webdriver.common.by import By
from .base_page import BasePage


class LoginPage(BasePage):

    # ── Sélecteurs ─────────────────────────────────────────────────
    EMAIL_INPUT    = (By.ID,   "login-email")
    PWD_INPUT      = (By.ID,   "login-pwd")
    SUBMIT_BTN     = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_ALERT    = (By.CSS_SELECTOR, ".alert.alert-error")
    FORGOT_LINK    = (By.XPATH, "//a[contains(@href,'/forgot-password')]")

    # ── Actions ────────────────────────────────────────────────────
    def open(self):
        # Aller d'abord sur le login pour avoir accès à localStorage (même origine)
        self.goto("/login")
        self.driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        # Recharger la page : force React à se réinitialiser complètement
        # sans état résiduel entre les tests (important avec driver session-scoped)
        self.driver.refresh()
        self.find(*self.EMAIL_INPUT)

    def enter_email(self, email: str):
        self.fill(*self.EMAIL_INPUT, email)

    def enter_password(self, password: str):
        self.fill(*self.PWD_INPUT, password)

    def submit(self):
        self.click(*self.SUBMIT_BTN)

    def login(self, email: str, password: str):
        self.open()
        self.enter_email(email)
        self.enter_password(password)
        self.submit()

    # ── Assertions ─────────────────────────────────────────────────
    def is_on_login_page(self) -> bool:
        return "/login" in self.current_url()

    def get_error_message(self) -> str:
        if self.element_visible(*self.ERROR_ALERT, timeout=5):
            return self.find(*self.ERROR_ALERT).text
        return ""

    def is_redirected_to_dashboard(self) -> bool:
        try:
            self.wait_for_url("/dashboard")
            return True
        except Exception:
            return False
