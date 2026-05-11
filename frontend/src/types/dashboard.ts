export interface Kpis {
  totalProduits: number;
  produitsEnAlerte: number;
  commandesEnCours: number;
  valeurStock: number;
  revenue?: number;
  profit?: number;
}

export interface FluxPoint {
  date: string;
  entrees: number;
  sorties: number;
}

export interface EntrepotStock {
  nom: string;
  valeur: number;
}

export interface Proposition {
  id: string;
  quantiteProposee: number;
  statut: string;
  produit?: { nom: string };
  fournisseur?: { nom: string };
}

export interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  fournisseurProduits?: unknown[];
}

export interface Commande {
  id: string;
  type: string;
  etat: string;
  dateCreation: string;
  fournisseur?: { nom?: string };
  entrepot?: { nom?: string };
  commandesLigne?: Array<{ quantite: number; prixUnitaire?: number }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: { name?: string };
  createdAt?: string;
}

export interface Flux {
  id: string;
  date: string;
  type: string;
  quantite: number;
  produit?: { nom: string };
}
