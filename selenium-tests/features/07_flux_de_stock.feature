# language: fr
Fonctionnalité: Flux de Stock

  En tant que responsable stock
  Je veux consulter et enregistrer les mouvements de stock
  Afin de suivre les entrées et sorties

  Contexte:
    Étant donné je suis connecté en tant que responsable stock
    Et je suis sur la page "/flux-de-stock"

  Scénario: La liste des flux de stock est chargée
    Alors la liste des flux est affichée
    Et la liste contient au moins 1 élément

  Scénario: Le bouton Ajouter un mouvement est présent
    Alors le bouton "btn-nouveau-flux" est visible

  Scénario: Cliquer sur Ajouter ouvre le modal
    Quand je clique sur le bouton "btn-nouveau-flux"
    Alors le modal de création s'ouvre

  Scénario: Le bouton Export CSV est présent
    Alors le bouton "btn-export-stock-csv" est visible
