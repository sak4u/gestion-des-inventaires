import { Injectable, UnauthorizedException, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  dateCreation: true,
  role: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.role.count();
    if (count < 3) {
      const roles = [
        { name: 'ADMIN', description: 'Administrateur principal' },
        { name: 'RESPONSABLE_STOCK', description: 'Gestionnaire de stock (entrepôt, flux, prédictions)' },
        { name: 'ACHAT', description: 'Gestionnaire Achat & Fournisseurs' },
      ];
      for (const role of roles) {
        await this.prisma.role.upsert({
          where: { name: role.name },
          update: {},
          create: { name: role.name, description: role.description },
        });
      }
      console.log('Rôles initiaux créés ou vérifiés :', roles.map(r => r.name).join(', '));
    }
  }


  // ── Connexion ────────────────────────────────────────────────────────────────

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé. Contactez votre administrateur.');
    }

    const payload = { email: user.email, sub: user.id, role: user.role.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        dateCreation: user.dateCreation,
        roleId: user.roleId,
        role: user.role,
      },
    };
  }

  // ── Mot de passe oublié ──────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.' };
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 3);

    await this.prisma.user.update({
      where: { email },
      data: { resetCode, resetExpires },
    });

    await this.mailService.sendResetCode(email, resetCode);
    return { message: 'Le code de réinitialisation a été envoyé.' };
  }

  async resetPassword(body: ResetPasswordDto) {
    const { email, code, newPassword } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.resetCode !== code || !user.resetExpires || user.resetExpires < new Date()) {
      throw new UnauthorizedException('Code de réinitialisation invalide ou expiré.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword, resetCode: null, resetExpires: null },
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // ── Gestion des utilisateurs (Admin) ─────────────────────────────────────────

  async getUsers() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { dateCreation: 'desc' },
    });
  }

  /** Création d'un utilisateur par l'admin (avec rôle imposé) */
  async createUserByAdmin(data: { name: string; email: string; password: string; roleName: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException(`Un compte existe déjà avec l'email '${data.email}'.`);

    const role = await this.prisma.role.findUnique({ where: { name: data.roleName } });
    if (!role) throw new BadRequestException(`Rôle '${data.roleName}' invalide.`);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        roleId: role.id,
      },
      select: USER_SELECT,
    });
  }

  /** Modification du nom, email et/ou rôle d'un utilisateur */
  async updateUser(userId: string, data: { name?: string; email?: string; roleName?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur '${userId}' introuvable.`);

    const updateData: { name?: string; email?: string; roleId?: string } = {};

    if (data.name)  updateData.name  = data.name;
    if (data.email) updateData.email = data.email;

    if (data.roleName) {
      const role = await this.prisma.role.findUnique({ where: { name: data.roleName } });
      if (!role) throw new BadRequestException(`Rôle '${data.roleName}' invalide.`);
      updateData.roleId = role.id;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });
  }

  /** Bascule le statut actif/désactivé d'un utilisateur */
  async toggleActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur '${userId}' introuvable.`);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: USER_SELECT,
    });

    return {
      message: updated.isActive ? 'Compte réactivé avec succès.' : 'Compte désactivé avec succès.',
      user: updated,
    };
  }

  /** Suppression définitive (conservée mais réservée à l'admin) */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur '${userId}' introuvable.`);
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Utilisateur supprimé définitivement.' };
  }

  async getRoles() {
    return this.prisma.role.findMany({ select: { id: true, name: true, description: true } });
  }
}
