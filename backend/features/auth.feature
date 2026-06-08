# language: fr
Fonctionnalité: Authentification des utilisateurs

  En tant qu'utilisateur du système de gestion des stocks
  Je veux pouvoir me connecter à l'application
  Afin d'accéder aux fonctionnalités selon mon rôle

  Scénario: Connexion réussie d'un administrateur
    Étant donné que j'envoie une requête POST sur "/auth/login" avec l'email "admin@email.com" et le mot de passe "admin123"
    Alors le code HTTP de la réponse est 200
    Et la réponse contient le champ "access_token"
    Et le rôle de l'utilisateur est "ADMIN"

  Scénario: Connexion réussie d'un responsable de stock
    Étant donné que j'envoie une requête POST sur "/auth/login" avec l'email "manager@email.com" et le mot de passe "admin123"
    Alors le code HTTP de la réponse est 200
    Et la réponse contient le champ "access_token"
    Et le rôle de l'utilisateur est "RESPONSABLE_STOCK"

  Scénario: Échec de connexion avec mauvais mot de passe
    Étant donné que j'envoie une requête POST sur "/auth/login" avec l'email "admin@email.com" et le mot de passe "MauvaisPass"
    Alors le code HTTP de la réponse est 401

  Scénario: Échec de connexion avec email inexistant
    Étant donné que j'envoie une requête POST sur "/auth/login" avec l'email "inexistant@test.com" et le mot de passe "Test1234"
    Alors le code HTTP de la réponse est 401

  Scénario: Accès refusé à une route protégée sans token
    Étant donné que je ne suis pas authentifié
    Quand j'envoie une requête GET sur "/auth/profile"
    Alors le code HTTP de la réponse est 401

  Scénario: Un non-ADMIN ne peut pas lister les utilisateurs
    Étant donné que je suis connecté avec l'email "manager@email.com" et le mot de passe "admin123"
    Quand j'envoie une requête GET sur "/auth/users"
    Alors le code HTTP de la réponse est 403
