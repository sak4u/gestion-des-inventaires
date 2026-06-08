# language: fr
Fonctionnalité: Gestion du catalogue de produits

  En tant qu'administrateur du système de gestion des stocks
  Je veux gérer le catalogue de produits
  Afin de maintenir l'inventaire à jour

  Scénario: Consulter la liste des produits
    Étant donné que je suis connecté avec l'email "admin@email.com" et le mot de passe "admin123"
    Quand j'envoie une requête GET sur "/produits"
    Alors le code HTTP de la réponse est 200
    Et la réponse est une liste JSON

  Scénario: Créer un nouveau produit
    Étant donné que je suis connecté avec l'email "admin@email.com" et le mot de passe "admin123"
    Quand je crée un produit avec le nom "Produit BDD Test" et le code barre "BDD-FEAT-001"
    Alors le code HTTP de la réponse est 201
    Et la réponse contient le champ "id"

  Scénario: Accès refusé à la liste des produits sans authentification
    Étant donné que je ne suis pas authentifié
    Quand j'envoie une requête GET sur "/produits"
    Alors le code HTTP de la réponse est 401

  Scénario: Consultation d'un produit inexistant retourne 404
    Étant donné que je suis connecté avec l'email "admin@email.com" et le mot de passe "admin123"
    Quand j'envoie une requête GET sur "/produits/00000000-0000-0000-0000-000000000000"
    Alors le code HTTP de la réponse est 404
