# language: fr
Fonctionnalité: Authentification — Connexion

  En tant qu'utilisateur du système de gestion des inventaires
  Je veux pouvoir me connecter avec mes identifiants
  Afin d'accéder aux fonctionnalités selon mon rôle

  Scénario: Connexion réussie en tant qu'Administrateur
    Étant donné je suis sur la page de connexion
    Quand je saisis l'email "admin@email.com" et le mot de passe "admin123"
    Et je clique sur Se connecter
    Alors je suis redirigé vers le dashboard
    Et le titre de la page contient "dashboard"

  Scénario: Connexion réussie en tant que Responsable Stock
    Étant donné je suis sur la page de connexion
    Quand je saisis l'email "manager@email.com" et le mot de passe "admin123"
    Et je clique sur Se connecter
    Alors je suis redirigé vers le dashboard

  Scénario: Connexion réussie en tant que Gestionnaire Achat
    Étant donné je suis sur la page de connexion
    Quand je saisis l'email "achat@email.com" et le mot de passe "admin123"
    Et je clique sur Se connecter
    Alors je suis redirigé vers le dashboard

  Scénario: Échec de connexion avec un mauvais mot de passe
    Étant donné je suis sur la page de connexion
    Quand je saisis l'email "admin@email.com" et le mot de passe "MauvaisPass"
    Et je clique sur Se connecter
    Alors un message d'erreur est affiché

  Scénario: Échec de connexion avec un email inexistant
    Étant donné je suis sur la page de connexion
    Quand je saisis l'email "inconnu@test.com" et le mot de passe "Test1234"
    Et je clique sur Se connecter
    Alors un message d'erreur est affiché

  Scénario: Connexion bloquée si les champs sont vides
    Étant donné je suis sur la page de connexion
    Quand je clique sur Se connecter sans remplir les champs
    Alors je reste sur la page de connexion ou un message d'erreur est affiché
