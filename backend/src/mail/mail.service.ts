import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

// ── Types ──────────────────────────────────────────────────────────────
export interface CommandeLigneMailData {
  nomProduit: string;
  quantite: number;
  prixUnitaireAchat?: number | null;
}

export type CommandeNotificationType = 'CREATION' | 'FERMEE' | 'LIVREE';

export interface CommandeMailData {
  commandeId: string;
  dateCreation: Date;
  nomFournisseur: string;
  lignes: CommandeLigneMailData[];
}

// ───────────────────────────────────────────────────────────────────────
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt((process.env.MAIL_PORT as string) || '2525', 10),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendResetCode(email: string, code: string) {
    const mailOptions = {
      from: '"Gestion Inventaire" <no-reply@gestion-inventaire.com>',
      to: email,
      subject: 'Code de réinitialisation du mot de passe',
      text: `Votre code de réinitialisation est : ${code}. Ce code expirera dans 3 minutes.`,
      html: `<p>Votre code de réinitialisation est : <b>${code}</b></p><p>Ce code expirera dans 3 minutes.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reset code email sent to ${email}`);
    } catch (error) {
      this.logger.error('Error sending reset email:', error);
      throw new Error("Erreur lors de l'envoi de l'email");
    }
  }

  /**
   * Sends a purchase order summary to the supplier.
   *
   * This method is intentionally fire-and-forget friendly:
   * it catches its own errors and logs them without throwing,
   * so a mail failure never blocks the HTTP response.
   *
   * @param email   Supplier email address
   * @param data    Order details (id, date, lignes)
   * @param type    Notification context ('CREATION' | 'FERMEE' | 'LIVREE')
   */
  async sendCommandeNotification(
    email: string,
    data: CommandeMailData,
    type: CommandeNotificationType = 'FERMEE',
  ): Promise<void> {
    const dateStr = new Date(data.dateCreation).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const labels: Record<CommandeNotificationType, { header: string; body: string; subject: string }> = {
      CREATION: {
        header: '📦 Nouvelle Commande Créée',
        body: 'Une nouvelle commande vient d\'être <b style="color:#1e40af;">créée</b> à votre attention. Veuillez trouver ci-dessous le détail des articles à préparer :',
        subject: `📦 Commande #${data.commandeId.slice(0, 8).toUpperCase()} — Nouvelle commande à préparer`,
      },
      FERMEE: {
        header: '📦 Commande Fermée',
        body: 'Une commande vous concernant vient d\'être <b style="color:#1e40af;">fermée et validée</b>. Voici le récapitulatif :',
        subject: `📦 Commande #${data.commandeId.slice(0, 8).toUpperCase()} — Fermée et en attente de livraison`,
      },
      LIVREE: {
        header: '📦 Commande Livrée',
        body: 'Une commande vous concernant vient d\'être marquée comme <b style="color:#1e40af;">livrée</b>. Voici le récapitulatif :',
        subject: `📦 Commande #${data.commandeId.slice(0, 8).toUpperCase()} — Livrée`,
      },
    };

    const { header, body, subject } = labels[type];

    // ── Build the products table rows ──
    const rows = data.lignes
      .map((ligne) => {
        const prix =
          ligne.prixUnitaireAchat != null
            ? `${ligne.prixUnitaireAchat.toFixed(2)} DT`
            : 'N/A';
        const total =
          ligne.prixUnitaireAchat != null
            ? `${(ligne.prixUnitaireAchat * ligne.quantite).toFixed(2)} DT`
            : 'N/A';
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${ligne.nomProduit}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${ligne.quantite}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${prix}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${total}</td>
          </tr>`;
      })
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">${header}</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Système de Gestion des Inventaires</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#374151;font-size:15px;">Bonjour <b>${data.nomFournisseur}</b>,</p>
            <p style="color:#374151;font-size:15px;">${body}</p>

            <!-- Order Meta -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f9fafb;border-radius:8px;padding:16px;">
              <tr>
                <td style="color:#6b7280;font-size:13px;">🆔 Référence commande</td>
                <td style="color:#111827;font-size:13px;font-weight:bold;text-align:right;">${data.commandeId.slice(0, 8).toUpperCase()}</td>
              </tr>
              <tr><td colspan="2" style="padding:4px 0;"></td></tr>
              <tr>
                <td style="color:#6b7280;font-size:13px;">📅 Date de création</td>
                <td style="color:#111827;font-size:13px;text-align:right;">${dateStr}</td>
              </tr>
            </table>

            <!-- Products Table -->
            <h3 style="color:#1e40af;font-size:15px;margin:24px 0 12px;">Détail des articles commandés</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#eff6ff;">
                  <th style="padding:10px 14px;text-align:left;color:#1e40af;font-size:13px;">Produit</th>
                  <th style="padding:10px 14px;text-align:center;color:#1e40af;font-size:13px;">Qté</th>
                  <th style="padding:10px 14px;text-align:right;color:#1e40af;font-size:13px;">Prix Unit.</th>
                  <th style="padding:10px 14px;text-align:right;color:#1e40af;font-size:13px;">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <p style="margin-top:28px;color:#374151;font-size:14px;">
              Merci de prendre en compte cette commande et de confirmer votre disponibilité dès que possible.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              Cet email est généré automatiquement par le système de gestion des inventaires.<br>
              Merci de ne pas y répondre directement.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: '"Gestion Inventaire" <no-reply@gestion-inventaire.com>',
        to: email,
        subject,
        html,
      });
      this.logger.log(
        `Commande notification sent to supplier at ${email} (commande: ${data.commandeId}, type: ${type})`,
      );
    } catch (error) {
      // Non-blocking: log but don't throw — a failed mail must not rollback the update
      this.logger.warn(
        `Failed to send commande notification to ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
