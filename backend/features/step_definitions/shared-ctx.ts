/**
 * Contexte partagé entre tous les step_definitions Cucumber.
 * Cucumber charge tous les fichiers step_definitions dans le même process,
 * donc un module singleton suffit pour partager l'état entre fichiers.
 */
export const sharedCtx: {
  response: any;
  statusCode: number;
  token: string | null;
  lastCreatedId: string | null;
} = {
  response:      null,
  statusCode:    0,
  token:         null,
  lastCreatedId: null,
};
