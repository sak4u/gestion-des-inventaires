import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Le token peut arriver via auth.token (format "Bearer <token>" ou juste "<token>")
      let token = client.handshake.auth?.token;
      if (token?.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} tenté de se connecter sans token.`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const role = payload.role;

      if (role) {
        await client.join(`room_${role}`);
        this.logger.log(`Client connecté: ${client.id} (Rôle: ${role}) rejoint room_${role}`);
      }
    } catch (error) {
      this.logger.error(`Erreur authentification Socket ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  /** Envoie une notification à des rôles spécifiques */
  sendToRoles(roles: string[], payload: {
    type: 'stock_alert' | 'proposition' | 'commande' | 'info';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    const dataWithTimestamp = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    roles.forEach(role => {
      this.server.to(`room_${role}`).emit('notification', dataWithTimestamp);
    });
  }

  /** Alerte stock bas — Destiné uniquement aux ADMIN et ACHAT */
  alertStockBas(produitNom: string, quantite: number, seuilAlerte: number) {
    this.sendToRoles(['ADMIN', 'ACHAT'], {
      type: 'stock_alert',
      title: '⚠️ Stock critique',
      message: `${produitNom} : ${quantite} unités restantes (seuil: ${seuilAlerte})`,
      data: { produitNom, quantite, seuilAlerte },
    });
  }

  /** Nouvelle proposition IA */
  alertNouvelleProposition(produitNom: string, quantite: number) {
    this.sendToRoles(['ADMIN', 'ACHAT'], {
      type: 'proposition',
      title: '🤖 Nouvelle proposition IA',
      message: `Réapprovisionnement suggéré : ${quantite} unités de ${produitNom}`,
      data: { produitNom, quantite },
    });
  }

  /** Commande livrée */
  alertCommandeLivree(commandeId: string) {
    this.sendToRoles(['ADMIN', 'ACHAT'], {
      type: 'commande',
      title: '✅ Commande livrée',
      message: `La commande ${commandeId.slice(0, 8)}... a été marquée comme livrée.`,
      data: { commandeId },
    });
  }
}
