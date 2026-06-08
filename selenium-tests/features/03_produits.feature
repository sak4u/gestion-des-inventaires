# language: fr
Fonctionnalité: Gestion des Produits

  En tant qu'administrateur
  Je veux gérer le catalogue de produits
  Afin de maintenir l'inventaire à jour

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur
    Et je suis sur la page "/produits"

  Scénario: La liste des produits est chargée
    Alors la liste des produits est affichée
    Et la liste contient au moins 1 élément

  Scénario: Créer un nouveau produit avec succès
    Quand je clique sur le bouton "btn-nouveau-produit"
    Et le modal de création s'ouvre
    Et je remplis le champ "produit-nom" avec "Produit Selenium BDD"
    Et je remplis le champ "produit-codebare" avec "BDD-001-12345"
    Et je remplis le champ "produit-category" avec "Electronique"
    Et je remplis le champ "produit-stockalert" avec "5"
    Et je remplis le champ "produit-prixvente" avec "99.99"
    Et je sauvegarde le modal
    Alors le modal est fermé
    Et le texte "Produit Selenium BDD" est visible dans la liste

  Scénario: Validation — nom manquant bloque la soumission
    Quand je clique sur le bouton "btn-nouveau-produit"
    Et le modal de création s'ouvre
    Et je remplis le champ "produit-codebare" avec "BDD-NONAME"
    Et je remplis le champ "produit-category" avec "Test"
    Et je sauvegarde le modal
    Alors le modal reste ouvert ou un message d'erreur est affiché

  Scénario: La recherche filtre les produits
    Quand je recherche "Produit Test 1"
    Alors les résultats de recherche sont affichés

  Scénario: Le bouton Export CSV est présent
    Alors le bouton "btn-export-produits-csv" est visible
