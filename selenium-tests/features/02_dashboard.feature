# language: fr
Fonctionnalité: Dashboard et Navigation

  En tant qu'administrateur connecté
  Je veux naviguer vers toutes les pages de l'application
  Afin de vérifier que la navigation fonctionne correctement

  Contexte:
    Étant donné je suis connecté en tant qu'administrateur

  Scénario: Le dashboard s'affiche après connexion
    Quand je navigue vers "/dashboard"
    Alors la page "/dashboard" est affichée

  Scénario: Navigation vers la page Produits
    Quand je navigue vers "/produits"
    Alors la page "/produits" est affichée

  Scénario: Navigation vers la page Commandes
    Quand je navigue vers "/commandes"
    Alors la page "/commandes" est affichée

  Scénario: Navigation vers la page Fournisseurs
    Quand je navigue vers "/fournisseurs"
    Alors la page "/fournisseurs" est affichée

  Scénario: Navigation vers la page Entrepôts
    Quand je navigue vers "/entrepots"
    Alors la page "/entrepots" est affichée

  Scénario: Navigation vers la page Flux de Stock
    Quand je navigue vers "/flux-de-stock"
    Alors la page "/flux-de-stock" est affichée

  Scénario: Navigation vers la page Propositions IA
    Quand je navigue vers "/propositions"
    Alors la page "/propositions" est affichée

  Scénario: Navigation vers la page Utilisateurs (ADMIN)
    Quand je navigue vers "/utilisateurs"
    Alors la page "/utilisateurs" est affichée
