"""
base_page.py — Page Object de base
Toutes les pages héritent de cette classe.
"""

import allure
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
import config


class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait   = WebDriverWait(driver, config.WAIT_TIMEOUT)

    def goto(self, path: str):
        self.driver.get(f"{config.BASE_URL}{path}")

    def wait_for_url(self, fragment: str):
        self.wait.until(EC.url_contains(fragment))



    def _resolve_locator(self, by, value=None):
        if isinstance(by, tuple):
            return by
        return (by, value)

    def find(self, by, value=None):
        locator = self._resolve_locator(by, value)
        return self.wait.until(EC.presence_of_element_located(locator))

    def find_all(self, by, value=None):
        locator = self._resolve_locator(by, value)
        self.wait.until(EC.presence_of_element_located(locator))
        return self.driver.find_elements(*locator)

    def click(self, by, value=None):
        locator = self._resolve_locator(by, value)
        el = self.wait.until(EC.element_to_be_clickable(locator))
        self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        try:
            el.click()
        except Exception:
            self.driver.execute_script("arguments[0].click();", el)
        return el

    def fill(self, by, value, text=None):
        if isinstance(by, tuple):
            locator = by
            text_to_fill = value
        else:
            locator = (by, value)
            text_to_fill = text
        el = self.wait.until(EC.element_to_be_clickable(locator))
        el.clear()
        el.send_keys(text_to_fill)
        return el

    def text_present(self, text: str, timeout: int = None) -> bool:
        t = timeout or config.WAIT_TIMEOUT
        try:
            WebDriverWait(self.driver, t).until(
                EC.presence_of_element_located((By.XPATH, f"//*[contains(text(),'{text}')]"))
            )
            return True
        except TimeoutException:
            return False

    def element_visible(self, by, value=None, timeout: int = None) -> bool:
        if isinstance(by, tuple):
            locator = by
            t = value or timeout or config.WAIT_TIMEOUT
        else:
            locator = (by, value)
            t = timeout or config.WAIT_TIMEOUT
        try:
            WebDriverWait(self.driver, t).until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False

    def current_url(self) -> str:
        return self.driver.current_url

    def take_screenshot(self, name: str = "screenshot"):
        allure.attach(
            self.driver.get_screenshot_as_png(),
            name=name,
            attachment_type=allure.attachment_type.PNG,
        )
