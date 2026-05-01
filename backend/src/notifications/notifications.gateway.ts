import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  /** Envoie une notification à tous les clients connectés */
  sendNotification(payload: {
    type: 'stock_alert' | 'proposition' | 'commande' | 'info';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    this.server.emit('notification', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /** Alerte stock bas */
  alertStockBas(produitNom: string, quantite: number, seuilAlerte: number) {
    this.sendNotification({
      type: 'stock_alert',
      title: '⚠️ Stock critique',
      message: `${produitNom} : ${quantite} unités restantes (seuil: ${seuilAlerte})`,
      data: { produitNom, quantite, seuilAlerte },
    });
  }

  /** Nouvelle proposition IA */
  alertNouvelleProposition(produitNom: string, quantite: number) {
    this.sendNotification({
      type: 'proposition',
      title: '🤖 Nouvelle proposition IA',
      message: `Réapprovisionnement suggéré : ${quantite} unités de ${produitNom}`,
      data: { produitNom, quantite },
    });
  }

  /** Commande livrée */
  alertCommandeLivree(commandeId: string) {
    this.sendNotification({
      type: 'commande',
      title: '✅ Commande livrée',
      message: `La commande ${commandeId.slice(0, 8)}... a été marquée comme livrée.`,
      data: { commandeId },
    });
  }
}
