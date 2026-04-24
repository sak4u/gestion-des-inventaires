# Comprendre les Logs de l'Intelligence Artificielle 🤖📊

Ce document explique en détail le résultat généré par votre moteur de prédiction lors de l'exécution du Batch (Cron). 

Voici un exemple du message que votre console affiche :
> `[PredictionService] Prediction [8be736d3...] for "Laptop Dell XPS": CMJ=90.00 (1 active day(s)), trend=stable, stockout in 0 days, reorder=460, confidence=0%`

Voici la signification exacte de chaque attribut calculé :

---

### 1. `CMJ` (Consommation Moyenne Journalière)
**C'est quoi ?** La quantité estimée d'unités qui seront vendues chaque jour.
**Comment c'est calculé ?** Ce n'est pas une simple moyenne globale ! Votre système utilise un modèle hybride : il combine la **Moyenne Mobile** des 30 derniers jours et la prédiction de la **Régression Linéaire**. Si le produit a très peu d'historique, il utilise astucieusement la moyenne des *jours actifs uniques*.
_Exemple : `CMJ=90.00` signifie que l'IA s'attend à 90 ventes quotidiennes de ce produit._

### 2. `active day(s)` (Jours avec ventes)
**C'est quoi ?** Le nombre de jours pour lesquels une vente réelle a eu lieu dans la période historique (généralement sur 90 jours écoulés).
**A quoi ça sert ?** Cela empêche l'IA de se tromper avec les produits rarement vendus. 100 jours sans vente dilueraient une CMJ proche de 0... Compter les "jours actifs" permet d'isoler le vrai flux d'un produit.

### 3. `trend` (La Tendance de la Demande)
**C'est quoi ?** L'évolution de votre dynamique de vente. Elle peut être `increasing` (en hausse), `decreasing` (en baisse), ou `stable`.
**Comment c'est calculé ?** L'IA calcule le coefficient de pente (Slope) de l'équation mathématique du modèle de Régression Linéaire ($y = ax + b$). Si cette pente évolue agressivement (à hauteur d'un seuil `TREND_THRESHOLD` comme 5% de déviation relative), la tendance monte ou chute. 

### 4. `stockout in X days` (Temps avant Rupture de Stock)
**C'est quoi ?** Une estimation alarmante (ou rassurante) du temps restant avant que vos entrepôts soient totalement à sec.
**Comment c'est calculé ?** C'est une simple division mathématique de bon sens : `Stock Actuel / CMJ`. 
_Attention : Si `stockout in 9999 days` apparaît, c'est l'identifiant technique de l'IA pour signifier un produit inerte (zéro vente, donc le stock est éternel)._

### 5. `reorder` (Quantité Recommandée)
**C'est quoi ?** La clé de votre module de propositions ! C'est le nombre exact de pièces qu'il faut générer dans les Proposions de Commandes.
**Comment c'est calculé ?**
$$ Reorder = (CMJ \times Délai Livraison) + Stock Sécurité - Stock Actuel $$
_Votre système s'assure d'avoir de quoi vendre le produit pendant qu'il est en transit fournisseur, tout en gardant une couverture de sécurité !_

### 6. `confidence` (Taux de Fiabilité de l'IA)
**C'est quoi ?** Représente la stabilité des données et, par extension, la fiabilité de la prédiction (de 0% à 100%).
**Comment c'est calculé ?** C'est calculé en utilisant la variance et l'écart-type via le _Coefficient de Variation_ ($CV = \sigma / \mu$). 
Si les ventes font des "montagnes russes" asymétriques chaque jour, la fiabilité sera basse (ex: `0%`). Si 90 laptops sont vendus tous les lundis avec une précision d'horloger, la confiance tendra vers `100%`.
