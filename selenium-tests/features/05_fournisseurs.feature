# language: fr
Fonctionnalité: Gestion des Fournisseurs

  En tant qu'administrateur
  Je veux gérer les fournisseurs
  Afin de maintenir le carnet d'adresses des partenaires

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur
    Et je suis sur la page "/fournisseurs"

  Scénario: La liste des fournisseurs est chargée
    Alors la liste des fournisseurs est affichée
    Et la liste contient au moins 1 élément

  Scénario: Créer un nouveau fournisseur avec succès
    Quand je clique sur le bouton "btn-nouveau-fournisseur"
    Et le modal de création s'ouvre
    Et je remplis le champ avec placeholder "Société Fournitures SA" avec "Fournisseur BDD Test"
    Et je sauvegarde le modal
    Alors le texte "Fournisseur BDD Test" est visible dans la liste

  Scénario: Validation — nom manquant bloque la soumission
    Quand je clique sur le bouton "btn-nouveau-fournisseur"
    Et le modal de création s'ouvre
    Et je sauvegarde le modal
    Alors le modal reste ouvert ou un message d'erreur est affiché

  Scénario: La recherche filtre les fournisseurs
    Quand je recherche "Fournisseur Tech"
    Alors les résultats de recherche sont affichés
