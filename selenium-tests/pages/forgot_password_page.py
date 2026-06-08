from selenium.webdriver.common.by import By
from .base_page import BasePage


class ForgotPasswordPage(BasePage):

    EMAIL_INPUT  = (By.ID, "fp-email")
    SUBMIT_BTN   = (By.CSS_SELECTOR, "button[type='submit']")
    CODE_INPUT   = (By.ID, "fp-code")
    PWD_INPUT    = (By.ID, "fp-newpwd")
    ERROR_ALERT  = (By.CSS_SELECTOR, ".alert.alert-error")
    SUCCESS_TEXT = (By.XPATH, "//h2[contains(text(),'réinitialisé')]")
    BACK_LINK    = (By.XPATH, "//a[contains(text(),'Retour')]")

    def open(self):
        self.goto("/forgot-password")
        self.find(*self.EMAIL_INPUT)

    def enter_email(self, email: str):
        self.fill(*self.EMAIL_INPUT, email)

    def submit(self):
        self.click(*self.SUBMIT_BTN)

    def is_on_page(self) -> bool:
        return "/forgot-password" in self.current_url()

    def get_error(self) -> str:
        if self.element_visible(*self.ERROR_ALERT, timeout=3):
            return self.find(*self.ERROR_ALERT).text
        return ""

    def is_code_step_visible(self) -> bool:
        return self.element_visible(*self.CODE_INPUT, timeout=8)
