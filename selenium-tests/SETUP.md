# Installation et lancement des tests Selenium + Allure

## 1. Prérequis

- Python 3.9+ installé
- Google Chrome installé
- Backend lancé sur http://localhost:3000
- Frontend lancé sur http://localhost:5173
- Allure CLI installé

## 2. Installer Allure CLI (une seule fois)

```powershell
# Via Scoop (recommandé Windows)
scoop install allure

# OU via npm
npm install -g allure-commandline
```

## 3. Installer les dépendances Python

```powershell
cd "c:\Users\mohamed sakly\Desktop\Gestion des inventaires\selenium-tests"
pip install -r requirements.txt
```

## 4. Lancer les tests

```powershell
# Option A — Script automatique (tests + rapport)
run_tests.bat

# Option B — Commandes manuelles
pytest                          # Lance tous les tests
allure serve reports/allure-results  # Ouvre le rapport dans le navigateur
```

## 5. Rapport HTML simple (sans Allure)

```powershell
start reports\report.html
```

## Comportement en cas d'échec

Quand un test échoue, le rapport Allure affiche automatiquement :
- Screenshot de la page au moment de l'échec
- URL courante
- Message d'erreur exact
- Chaque step avec STATUS (Pass/Fail) + TIMESTAMP + DETAILS

## Structure des tests

| Fichier | Tests |
|---------|-------|
| test_login.py | Connexion 3 rôles, mauvais mdp, champs vides |
| test_dashboard.py | Chargement dashboard + navigation 7 pages |
| test_produits.py | Liste, création, validation, recherche, export CSV |
| test_commandes.py | Liste, bouton création, filtres état/type |
| test_fournisseurs.py | Liste, création, validation, recherche |
| test_entrepots.py | Liste, création, validation |
| test_flux_de_stock.py | Liste, modal création, export CSV |
| test_propositions.py | Liste, filtres, boutons accepter/refuser |
| test_utilisateurs.py | Liste, création, accès refusé non-ADMIN |
| test_forgot_password.py | Page, envoi email, validation, retour login |
