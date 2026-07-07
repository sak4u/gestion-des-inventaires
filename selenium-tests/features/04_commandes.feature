# language: fr
Fonctionnalité: Gestion des Commandes

  En tant qu'administrateur
  Je veux gérer les commandes d'achat
  Afin de suivre les approvisionnements

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur
    Et je suis sur la page "/commandes"

  Scénario: La liste des commandes est chargée
    Alors la liste des commandes est affichée

  Scénario: Le bouton Nouvelle commande est présent
    Alors le bouton "btn-nouvelle-commande" est visible

  Scénario: Cliquer Nouvelle commande redirige vers le formulaire
    Quand je clique sur le bouton "btn-nouvelle-commande"
    Alors l'URL contient "commandes"

  Scénario: Filtrer les commandes par état EN_COURS
    Quand je sélectionne "EN_COURS" dans le filtre "filter-etat"
    Alors les résultats de recherche sont affichés

  Scénario: Filtrer les commandes par type ACHAT
    Quand je sélectionne "ACHAT" dans le filtre "filter-type"
    Alors les résultats de recherche sont affichés
