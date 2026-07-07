import { When } from '@cucumber/cucumber';
import axios from 'axios';
import { sharedCtx } from './shared-ctx';

// NOTE: Ce fichier n'ajoute que les steps EXCLUSIFS aux produits.
// Tous les steps génériques (login, GET, assertions HTTP) sont dans auth.steps.ts.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

When(
  "je crée un produit avec le nom {string} et le code barre {string}",
  async (nom: string, codeBare: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sharedCtx.token) headers['Authorization'] = `Bearer ${sharedCtx.token}`;

    const res = await axios.post(
      `${BASE_URL}/produits`,
      {
        nom,
        codeBare:   `${codeBare}-${Date.now()}`,
        category:   'Test',
        stockAlert: 5,
        prixVente:  10.0,
      },
      { headers, validateStatus: () => true },
    );
    sharedCtx.response   = res.data;
    sharedCtx.statusCode = res.status;

    if (res.status === 201 && res.data?.id) {
      sharedCtx.lastCreatedId = res.data.id;
    }
  },
);
