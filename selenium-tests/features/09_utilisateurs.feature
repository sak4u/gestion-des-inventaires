# language: fr
Fonctionnalité: Gestion des Utilisateurs

  En tant qu'administrateur
  Je veux gérer les comptes utilisateurs
  Afin de contrôler les accès à l'application

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur
    Et je suis sur la page "/utilisateurs"

  Scénario: La liste des utilisateurs est chargée
    Alors la liste des utilisateurs est affichée
    Et la liste contient au moins 3 éléments

  Scénario: Le bouton Ajouter un utilisateur est présent
    Alors le bouton "btn-nouvel-utilisateur" est visible

  Scénario: Cliquer Ajouter ouvre le modal de création
    Quand je clique sur le bouton "btn-nouvel-utilisateur"
    Alors le modal de création s'ouvre

  Scénario: Un non-ADMIN est redirigé depuis Utilisateurs
    Étant donné je suis connecté en tant que gestionnaire achat
    Quand je navigue vers "/utilisateurs"
    Alors je ne suis pas sur la page "/utilisateurs"
