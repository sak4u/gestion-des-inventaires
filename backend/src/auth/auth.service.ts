import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Check if any roles exist
    const rolesCount = await this.prisma.role.count();

    let role;
    if (rolesCount === 0) {
      // First user: create ADMIN role
      role = await this.prisma.role.create({
        data: { name: 'ADMIN', description: 'Administrator role' }
      });
    } else {
      const targetRoleName = data.roleName;
      if (!targetRoleName) {
        throw new BadRequestException('A role must be chosen for registration.');
      }

      role = await this.prisma.role.findUnique({
        where: { name: targetRoleName }
      });

      if (!role) {
        role = await this.prisma.role.create({
          data: { name: targetRoleName, description: `${targetRoleName} role` }
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleName, ...userData } = data;
    return this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        roleId: role.id
      }
    });
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      const payload = { email: user.email, sub: user.id, role: user.role.name };
      return {
        access_token: this.jwtService.sign(payload),
        user: result
      };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    const resetCode = randomInt(100000, 999999).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.user.update({
      where: { email },
      data: { resetCode, resetExpires }
    });

    await this.mailService.sendResetCode(email, resetCode);
    return { message: 'Code de réinitialisation envoyé' };
  }

  async resetPassword(data: any) {
    const { email, code, newPassword } = data;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.resetCode !== code || !user.resetExpires || user.resetExpires < new Date()) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetExpires: null
      }
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
