import { ConsoleLogger } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  log(message: any, context?: string) {
    // Si on s'apprête à afficher les routes d'un nouveau contrôleur, on ajoute un espace
    if (context === 'RoutesResolver') {
      console.log(); // Ligne vide pour aérer l'affichage
    }
    
    super.log(message, context);
  }
}
