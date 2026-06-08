# language: fr
Fonctionnalité: Propositions IA

  En tant que gestionnaire achat
  Je veux consulter les propositions générées par l'IA
  Afin d'accepter ou refuser le réapprovisionnement automatique

  Contexte:
    Étant donné je suis connecté en tant que gestionnaire achat
    Et je suis sur la page "/propositions"

  Scénario: La page Propositions IA est chargée
    Alors la page "/propositions" est affichée

  Scénario: Le filtre Toutes les propositions est présent
    Alors le texte "Toutes" est visible sur la page

  Scénario: Le contenu de la page est affiché sans erreur
    Alors la page ne contient pas de message d'erreur critique
