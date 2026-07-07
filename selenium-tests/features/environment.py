"""
environment.py — Hooks Behave (équivalent conftest pytest)
before_all  : démarre Chrome
after_all   : ferme Chrome
after_step  : screenshot automatique si le step échoue
"""

import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# Ajouter le dossier parent au PATH pour importer config et pages
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import config


def before_all(context):
    """Démarre le navigateur une seule fois pour toute la session."""
    options = Options()
    if config.HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-notifications")

    service = Service(ChromeDriverManager().install())
    context.driver = webdriver.Chrome(service=service, options=options)
    context.driver.implicitly_wait(config.WAIT_TIMEOUT)
    context.current_role = None


def after_all(context):
    """Ferme le navigateur après tous les tests."""
    if hasattr(context, 'driver'):
        context.driver.quit()


def after_step(context, step):
    """
    Screenshot automatique si un step échoue.
    L'image est attachée au rapport HTML Cucumber — visible dans le panneau droit.
    """
    if step.status == "failed":
        screenshot_dir = os.path.join(
            os.path.dirname(__file__), '..', 'reports', 'screenshots'
        )
        os.makedirs(screenshot_dir, exist_ok=True)
        safe_name = step.name.replace(' ', '_').replace('/', '_')[:60]
        path = os.path.join(screenshot_dir, f"FAIL_{safe_name}.png")
        try:
            context.driver.get_screenshot_as_file(path)
            # Attacher au rapport HTML (behave-html-formatter supporte embed_image)
            if hasattr(context, '_html_formatter') or True:
                context.embed(
                    mime_type="image/png",
                    data=context.driver.get_screenshot_as_base64(),
                    caption=f"Screenshot - {step.name}",
                )
        except Exception:
            pass


def before_scenario(context, scenario):
    """Reset propre avant chaque scénario."""
    context.current_role = None
