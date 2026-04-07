import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(data: RegisterDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let role = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'USER', description: 'Standard user role' },
      });
    }

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        roleId: role.id,
      },
    });
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      const result = {
        id: user.id,
        name: user.name,
        email: user.email,
        dateCreation: user.dateCreation,
        roleId: user.roleId,
        role: user.role,
      };
      const payload = { email: user.email, sub: user.id, role: user.role.name };
      return {
        access_token: this.jwtService.sign(payload),
        user: result,
      };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        message:
          'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
      };
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 3);

    await this.prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetExpires,
      },
    });

    await this.mailService.sendResetCode(email, resetCode);

    return { message: 'le code de réinitialisation a été envoyé.' };
  }

  async resetPassword(body: ResetPasswordDto) {
    const { email, code, newPassword } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      user.resetCode !== code ||
      !user.resetExpires ||
      user.resetExpires < new Date()
    ) {
      throw new UnauthorizedException(
        'Code de réinitialisation invalide ou expiré',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetExpires: null,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
