/**
 * Job DSL — inventaires-e2e-selenium
 *
 * Pipeline Jenkins pour les tests E2E Selenium frontend.
 * Déclenché automatiquement sur push GitHub (dossier selenium-tests/, frontend/ ou Jenkinsfile.e2e).
 *
 * Usage (seed job) :
 *   jobDsl targets: ['jobs/e2e-tests.groovy']
 *
 * Ou manuellement depuis Jenkins :
 *   Nouveau Item → Pipeline → Pipeline from SCM → coller ce script
 */

pipelineJob('inventaires-e2e-selenium') {

  // ── Description ──────────────────────────────────────────────────────────
  description('''
Tests E2E Selenium frontend : login, produits, fournisseurs, entrepots, commandes,
flux de stock, propositions, utilisateurs.
<hr/>
<b>Déclenché automatiquement</b> sur chaque push vers <code>dev</code>
quand le dossier <code>selenium-tests/</code>, <code>frontend/</code>
ou <code>Jenkinsfile.e2e</code> est modifié.
'''.stripIndent().trim())

  // ── Rétention des builds ────────────────────────────────────────────────
  logRotator {
    numToKeep(10)
    artifactNumToKeep(5)
  }

  // ── Empêcher les builds concurrents ──────────────────────────────────────
  concurrentBuild(false)

  // ── GitHub project link ──────────────────────────────────────────────────
  properties {
    githubProjectUrl('https://github.com/sak4u/gestion-des-inventaires/')
  }

  // ── Paramètres ───────────────────────────────────────────────────────────
  parameters {
    booleanParam('HEADLESS', true, 'Exécuter Chrome en mode headless (true = sans fenêtre)')
    choiceParam('SELENIUM_SUITE', ['ALL', 'SMOKE', 'LOGIN', 'PRODUITS', 'REGRESSION'], 'Suite de tests Selenium à exécuter')
    booleanParam('SKIP_CONNECTIVITY_CHECK', false, 'Ignorer la vérification de connectivité (si services déjà vérifiés)')
  }

  // ── Déclencheurs ─────────────────────────────────────────────────────────
  triggers {
    githubPush()  // Webhook GitHub → hook trigger for GITScm polling
  }

  // ── Définition du pipeline (SCM) ─────────────────────────────────────────
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url('https://github.com/sak4u/gestion-des-inventaires.git')
            credentials('github-credentials')  // ← REPO PRIVÉ : à créer dans Jenkins
          }
          branch('dev')
          extensions {
            cleanBeforeCheckout()
          }
        }
      }
      scriptPath('Jenkinsfile.e2e')
      lightweight(true)
    }
  }
}
