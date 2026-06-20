/**
 * Seed Job — Générer les 2 pipelines Jenkins
 *
 * Ce job lit les définitions DSL dans jobs/ et crée/met à jour
 * automatiquement les 2 pipelines Jenkins.
 *
 * Installation :
 *   1. Créer un job "Freestyle" dans Jenkins
 *   2. Configuration :
 *      - Source : Git → https://github.com/sak4u/gestion-des-inventaires.git
 *      - Branche : */dev
 *      - Build : Add build step → "Process Job DSLs"
 *        - DSL Scripts : jobs/*.groovy
 *        - Action for existing jobs : Update
 *      - Déclencheur : Poll SCM (H/5 * * * *) pour vérifier les changements
 *   3. Lancer le build une première fois
 *
 * Alternative (sans seed job) :
 *   Installer le plugin "Job DSL" puis coller directement dans Jenkins :
 *     Manage Jenkins → Script Console → coller le contenu d'un fichier jobs/*.groovy
 */

// Lister toutes les définitions de jobs dans le dossier jobs/
def jobFiles = findFiles(glob: 'jobs/*.groovy')
jobFiles.each { file ->
    println "Found job definition: ${file.name}"
}
