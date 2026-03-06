import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.MAIL_PORT || '2525', 10),
      auth: {
        user: process.env.MAIL_USER || 'your_user',
        pass: process.env.MAIL_PASS || 'your_pass',
      },
    });
  }

  async sendResetCode(email: string, code: string) {
    const mailOptions = {
      from: '"Gestion Inventaire" <no-reply@gestion-inventaire.com>',
      to: email,
      subject: 'Code de réinitialisation du mot de passe',
      text: `Votre code de réinitialisation est : ${code}. Ce code expirera dans 15 minutes.`,
      html: `<p>Votre code de réinitialisation est : <b>${code}</b></p><p>Ce code expirera dans 15 minutes.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }
  }
}
