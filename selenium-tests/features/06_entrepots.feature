# language: fr
Fonctionnalité: Gestion des Entrepôts

  En tant qu'administrateur
  Je veux gérer les entrepôts
  Afin de suivre les stocks par emplacement

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur
    Et je suis sur la page "/entrepots"

  Scénario: La liste des entrepôts est chargée
    Alors au moins une carte entrepôt est visible

  Scénario: Créer un nouvel entrepôt avec succès
    Quand je clique sur le bouton "btn-nouvel-entrepot"
    Et le modal de création s'ouvre
    Et je remplis le champ avec placeholder "Entrepôt Central" avec "Entrepôt BDD Test"
    Et je sauvegarde le modal
    Alors le texte "Entrepôt BDD Test" est visible dans la liste

  Scénario: Validation — nom manquant bloque la soumission
    Quand je clique sur le bouton "btn-nouvel-entrepot"
    Et le modal de création s'ouvre
    Et je sauvegarde le modal
    Alors le modal reste ouvert ou un message d'erreur est affiché
