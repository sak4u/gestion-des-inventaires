import pytest
import allure
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
import config


def pytest_configure(config):
    """Génère le fichier environment.properties pour Allure."""
    import os
    import shutil
    allure_dir = config.getoption('--alluredir')
    if allure_dir:
        # Nettoyage préalable du répertoire Allure (évite les conflits de fichiers sur Windows)
        if os.path.exists(allure_dir):
            try:
                for fname in os.listdir(allure_dir):
                    fpath = os.path.join(allure_dir, fname)
                    try:
                        if os.path.isfile(fpath):
                            os.remove(fpath)
                        elif os.path.isdir(fpath):
                            shutil.rmtree(fpath, ignore_errors=True)
                    except Exception:
                        pass
            except Exception:
                pass
        else:
            os.makedirs(allure_dir, exist_ok=True)
        
        import config as test_config
        env_file = os.path.join(allure_dir, 'environment.properties')
        try:
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(f"Browser={test_config.BROWSER}\n")
                f.write(f"BaseURL={test_config.BASE_URL}\n")
                f.write(f"DefaultTimeout={test_config.WAIT_TIMEOUT}s\n")
                f.write(f"Headless={test_config.HEADLESS}\n")
        except Exception:
            pass


# ── Driver fixture (session) ───────────────────────────────────────────────────
@pytest.fixture(scope="session")
def driver():
    options = Options()
    if config.HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-notifications")
    try:
        drv = webdriver.Chrome(options=options)
    except Exception:
        service = Service(ChromeDriverManager().install())
        drv = webdriver.Chrome(service=service, options=options)
    drv.implicitly_wait(config.WAIT_TIMEOUT)
    yield drv
    drv.quit()



# ── Hook pour stocker le résultat de chaque phase dans item ───────────────────
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Stocke rep_setup / rep_call / rep_teardown sur l'item pour la fixture screenshot."""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


# ── Screenshot automatique en cas d'échec ─────────────────────────────────────
@pytest.fixture(autouse=True)
def screenshot_on_failure(request, driver):
    """
    Capture d'écran + URL attachées au rapport Allure dès qu'un test échoue.
    Fonctionne car :
      1. yield → le test s'exécute
      2. pytest_runtest_makereport (tryfirst) a déjà stocké rep_call sur l'item
      3. On lit getattr(request.node, 'rep_call', None) en toute sécurité
    """
    yield

    rep = getattr(request.node, "rep_call", None)
    if rep is not None and rep.failed:
        try:
            allure.attach(
                body=driver.get_screenshot_as_png(),
                name="Screenshot - Echec",
                attachment_type=allure.attachment_type.PNG,
            )
            allure.attach(
                body=driver.current_url,
                name="URL au moment de l'echec",
                attachment_type=allure.attachment_type.TEXT,
            )
        except Exception:
            pass  # Le driver peut être fermé dans certains cas edge


# ── Login helper ───────────────────────────────────────────────────────────────
def _force_login(driver, role: str):
    creds = config.USERS[role]
    wait = WebDriverWait(driver, config.WAIT_TIMEOUT)

    # Optimisation : éviter de se reconnecter si on est déjà connecté avec le bon rôle
    try:
        if "/login" not in driver.current_url:
            user_json = driver.execute_script("return localStorage.getItem('user');")
            if user_json:
                import json
                user_data = json.loads(user_json)
                if user_data.get("email") == creds["email"]:
                    return
    except Exception:
        pass

    with allure.step(f"connexion en tant que {role}"):
        with allure.step("l'utilisateur est sur la page de connexion"):
            driver.get(f"{config.BASE_URL}/login")
            try:
                driver.execute_script("localStorage.clear(); sessionStorage.clear();")
            except Exception:
                pass
            driver.get(f"{config.BASE_URL}/login")
            wait.until(EC.presence_of_element_located((By.ID, "login-email")))

        with allure.step("l'utilisateur saisit l'email"):
            el = wait.until(EC.element_to_be_clickable((By.ID, "login-email")))
            el.clear()
            el.send_keys(creds["email"])

        with allure.step("l'utilisateur saisit le mot de passe"):
            el = wait.until(EC.element_to_be_clickable((By.ID, "login-pwd")))
            el.clear()
            el.send_keys(creds["password"])

        with allure.step("l'utilisateur clique sur le bouton Se connecter"):
            driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        with allure.step("connexion reussie - redirection vers le dashboard"):
            wait.until(EC.url_contains("/dashboard"))


@pytest.fixture(scope="session")
def login(driver):
    def _do_login(role: str = "admin"):
        _force_login(driver, role)
    return _do_login

