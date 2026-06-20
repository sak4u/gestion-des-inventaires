/**
 * Job DSL — inventaires-api-tests
 *
 * Pipeline Jenkins pour les tests API backend.
 * Déclenché automatiquement sur push GitHub (dossier backend/ ou Jenkinsfile.api).
 *
 * Usage (seed job) :
 *   jobDsl targets: ['jobs/api-tests.groovy']
 *
 * Ou manuellement depuis Jenkins :
 *   Nouveau Item → Pipeline → Pipeline from SCM → coller ce script
 */

pipelineJob('inventaires-api-tests') {

  // ── Description ──────────────────────────────────────────────────────────
  description('''
Tests API backend : unitaires, E2E Supertest, BDD Cucumber, Newman Postman.
<hr/>
<b>Déclenché automatiquement</b> sur chaque push vers <code>dev</code>
quand le dossier <code>backend/</code> ou <code>Jenkinsfile.api</code> est modifié.
'''.stripIndent().trim())

  // ── GitHub project link ──────────────────────────────────────────────────
  properties {
    githubProjectUrl('https://github.com/sak4u/gestion-des-inventaires/')
  }

  // ── Paramètres ───────────────────────────────────────────────────────────
  parameters {
    booleanParam('WITH_COVERAGE', true,  'Générer le rapport de couverture de code (lcov)')
    booleanParam('RUN_NEWMAN',    true,  'Exécuter les tests Postman via Newman')
    booleanParam('RUN_BDD',       true,  'Exécuter les scénarios Cucumber BDD')
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
            // Nettoyage du workspace avant chaque build
            cleanBeforeCheckout()
          }
        }
      }
      scriptPath('Jenkinsfile.api')
      lightweight(true)  // Ne checkout que le Jenkinsfile, pas tout le repo
    }
  }
}
