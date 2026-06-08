# language: fr
Fonctionnalité: Gestion du cycle de vie des commandes d'achat

  En tant que gestionnaire achat du système de gestion des inventaires
  Je veux créer et gérer des commandes d'achat
  Afin d'approvisionner les entrepôts en produits

  Contexte:
    Étant donné que je suis connecté en tant que "admin@email.com" avec le mot de passe "admin123"

  Scénario: Création d'une commande d'achat valide
    Quand je crée une commande d'achat avec un fournisseur et un entrepôt
    Alors la commande est créée avec l'état "EN_COURS"
    Et le code de statut HTTP est 201

  Scénario: Échec création sans fournisseur
    Quand je crée une commande d'achat sans fournisseur
    Alors le code de statut HTTP est 400

  Scénario: Échec création sans entrepôt
    Quand je crée une commande d'achat sans entrepôt
    Alors le code de statut HTTP est 400

  Scénario: Passage d'une commande EN_COURS à FERMEE
    Étant donné qu'il existe une commande avec l'état "EN_COURS"
    Quand je mets à jour l'état de la commande à "FERMEE"
    Alors la commande a l'état "FERMEE"
    Et le code de statut HTTP est 200

  Scénario: Génération automatique d'une proposition par l'IA
    Quand je déclenche la vérification automatique des stocks
    Alors je reçois un résumé avec le nombre de propositions créées
    Et le code de statut HTTP est 200
