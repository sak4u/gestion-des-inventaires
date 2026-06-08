import { Given, When, Then, Before } from '@cucumber/cucumber';
import axios from 'axios';
import * as assert from 'assert';
import { sharedCtx } from './shared-ctx';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Réinitialiser le contexte avant chaque scénario
Before(function () {
  sharedCtx.response      = null;
  sharedCtx.statusCode    = 0;
  sharedCtx.token         = null;
  sharedCtx.lastCreatedId = null;
});

// ═══════════════════════════════════════════════════════════════════
//  GIVEN — authentification
// ═══════════════════════════════════════════════════════════════════

Given(
  "j'envoie une requête POST sur {string} avec l'email {string} et le mot de passe {string}",
  async (path: string, email: string, password: string) => {
    const res = await axios.post(
      `${BASE_URL}${path}`,
      { email, password },
      { validateStatus: () => true },
    );
    sharedCtx.response   = res.data;
    sharedCtx.statusCode = res.status;
    if (res.status === 200 && res.data?.access_token) {
      sharedCtx.token = res.data.access_token;
    }
  },
);

Given("je ne suis pas authentifié", () => {
  sharedCtx.token = null;
});

Given(
  "je suis connecté avec l'email {string} et le mot de passe {string}",
  async (email: string, password: string) => {
    const res = await axios.post(
      `${BASE_URL}/auth/login`,
      { email, password },
      { validateStatus: () => true },
    );
    sharedCtx.token = res.data?.access_token ?? null;
  },
);

// Step pour commande.feature (wording différent "en tant que")
Given(
  "je suis connecté en tant que {string} avec le mot de passe {string}",
  async (email: string, password: string) => {
    const res = await axios.post(
      `${BASE_URL}/auth/login`,
      { email, password },
      { validateStatus: () => true },
    );
    sharedCtx.token = res.data?.access_token ?? null;
  },
);

// ═══════════════════════════════════════════════════════════════════
//  GIVEN — commandes
// ═══════════════════════════════════════════════════════════════════

Given(
  "il existe une commande avec l'état {string}",
  async (_etat: string) => {
    // Récupérer un fournisseur et un entrepôt existants
    const headers = sharedCtx.token
      ? { Authorization: `Bearer ${sharedCtx.token}` }
      : {};

    const fRes = await axios.get(`${BASE_URL}/fournisseurs`, { headers, validateStatus: () => true });
    const eRes = await axios.get(`${BASE_URL}/entrepots`,    { headers, validateStatus: () => true });
    const pRes = await axios.get(`${BASE_URL}/auth/profile`, { headers, validateStatus: () => true });

    const fournisseurId = fRes.data?.[0]?.id;
    const entrepotId    = eRes.data?.[0]?.id;
    const userId        = pRes.data?.userId;

    const res = await axios.post(
      `${BASE_URL}/commandes`,
      { type: 'ACHAT', userId, fournisseurId, entrepotId },
      { headers: { ...headers, 'Content-Type': 'application/json' }, validateStatus: () => true },
    );
    sharedCtx.response      = res.data;
    sharedCtx.statusCode    = res.status;
    sharedCtx.lastCreatedId = res.data?.id ?? null;
  },
);

// ═══════════════════════════════════════════════════════════════════
//  WHEN
// ═══════════════════════════════════════════════════════════════════

When("j'envoie une requête GET sur {string}", async (path: string) => {
  const headers: Record<string, string> = {};
  if (sharedCtx.token) headers['Authorization'] = `Bearer ${sharedCtx.token}`;
  const res = await axios.get(`${BASE_URL}${path}`, { headers, validateStatus: () => true });
  sharedCtx.response   = res.data;
  sharedCtx.statusCode = res.status;
});

When(
  "je crée une commande d'achat avec un fournisseur et un entrepôt",
  async () => {
    const headers = sharedCtx.token
      ? { Authorization: `Bearer ${sharedCtx.token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };

    const fRes = await axios.get(`${BASE_URL}/fournisseurs`, { headers, validateStatus: () => true });
    const eRes = await axios.get(`${BASE_URL}/entrepots`,    { headers, validateStatus: () => true });
    const pRes = await axios.get(`${BASE_URL}/auth/profile`, { headers, validateStatus: () => true });

    const res = await axios.post(
      `${BASE_URL}/commandes`,
      {
        type:         'ACHAT',
        userId:       pRes.data?.userId,
        fournisseurId: fRes.data?.[0]?.id,
        entrepotId:   eRes.data?.[0]?.id,
      },
      { headers, validateStatus: () => true },
    );
    sharedCtx.response      = res.data;
    sharedCtx.statusCode    = res.status;
    sharedCtx.lastCreatedId = res.data?.id ?? null;
  },
);

When("je crée une commande d'achat sans fournisseur", async () => {
  const headers = sharedCtx.token
    ? { Authorization: `Bearer ${sharedCtx.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const eRes = await axios.get(`${BASE_URL}/entrepots`,    { headers, validateStatus: () => true });
  const pRes = await axios.get(`${BASE_URL}/auth/profile`, { headers, validateStatus: () => true });

  const res = await axios.post(
    `${BASE_URL}/commandes`,
    { type: 'ACHAT', userId: pRes.data?.userId, entrepotId: eRes.data?.[0]?.id },
    { headers, validateStatus: () => true },
  );
  sharedCtx.response   = res.data;
  sharedCtx.statusCode = res.status;
});

When("je crée une commande d'achat sans entrepôt", async () => {
  const headers = sharedCtx.token
    ? { Authorization: `Bearer ${sharedCtx.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const fRes = await axios.get(`${BASE_URL}/fournisseurs`, { headers, validateStatus: () => true });
  const pRes = await axios.get(`${BASE_URL}/auth/profile`, { headers, validateStatus: () => true });

  const res = await axios.post(
    `${BASE_URL}/commandes`,
    { type: 'ACHAT', userId: pRes.data?.userId, fournisseurId: fRes.data?.[0]?.id },
    { headers, validateStatus: () => true },
  );
  sharedCtx.response   = res.data;
  sharedCtx.statusCode = res.status;
});

When("je mets à jour l'état de la commande à {string}", async (etat: string) => {
  const headers = sharedCtx.token
    ? { Authorization: `Bearer ${sharedCtx.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const res = await axios.patch(
    `${BASE_URL}/commandes/${sharedCtx.lastCreatedId}`,
    { etat },
    { headers, validateStatus: () => true },
  );
  sharedCtx.response   = res.data;
  sharedCtx.statusCode = res.status;
});

When("je déclenche la vérification automatique des stocks", async () => {
  const headers = sharedCtx.token
    ? { Authorization: `Bearer ${sharedCtx.token}` }
    : {};
  const res = await axios.post(`${BASE_URL}/propositions/check-all`, {}, { headers, validateStatus: () => true });
  sharedCtx.response   = res.data;
  sharedCtx.statusCode = res.status;
});

// ═══════════════════════════════════════════════════════════════════
//  THEN
// ═══════════════════════════════════════════════════════════════════

Then("le code HTTP de la réponse est {int}", (expected: number) => {
  assert.strictEqual(
    sharedCtx.statusCode,
    expected,
    `Attendu: ${expected}, Reçu: ${sharedCtx.statusCode} — Body: ${JSON.stringify(sharedCtx.response)}`,
  );
});

Then("le code de statut HTTP est {int}", (expected: number) => {
  assert.strictEqual(
    sharedCtx.statusCode,
    expected,
    `Attendu: ${expected}, Reçu: ${sharedCtx.statusCode} — Body: ${JSON.stringify(sharedCtx.response)}`,
  );
});

Then("la réponse contient le champ {string}", (field: string) => {
  assert.ok(
    Object.prototype.hasOwnProperty.call(sharedCtx.response, field),
    `Champ "${field}" absent. Body: ${JSON.stringify(sharedCtx.response)}`,
  );
});

Then("le rôle de l'utilisateur est {string}", (roleName: string) => {
  assert.strictEqual(
    sharedCtx.response?.user?.role?.name,
    roleName,
    `Rôle attendu: "${roleName}", Reçu: "${sharedCtx.response?.user?.role?.name}"`,
  );
});

Then("la réponse est une liste JSON", () => {
  assert.ok(Array.isArray(sharedCtx.response), `Attendu tableau, reçu: ${typeof sharedCtx.response}`);
});

Then("la commande est créée avec l'état {string}", (etat: string) => {
  assert.strictEqual(
    sharedCtx.response?.etat,
    etat,
    `État attendu: "${etat}", Reçu: "${sharedCtx.response?.etat}"`,
  );
});

Then("la commande a l'état {string}", (etat: string) => {
  assert.strictEqual(
    sharedCtx.response?.etat,
    etat,
    `État attendu: "${etat}", Reçu: "${sharedCtx.response?.etat}"`,
  );
});

Then("je reçois un résumé avec le nombre de propositions créées", () => {
  assert.ok(
    typeof sharedCtx.response?.checked === 'number',
    `Champ "checked" manquant. Body: ${JSON.stringify(sharedCtx.response)}`,
  );
  assert.ok(
    typeof sharedCtx.response?.propositionsCreated === 'number',
    `Champ "propositionsCreated" manquant`,
  );
});
