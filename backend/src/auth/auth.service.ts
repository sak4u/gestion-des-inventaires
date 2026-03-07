import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);


    let role = await this.prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'ADMIN', description: 'Administrator role' }
      });
    }

    return this.prisma.user.create({
      data: {
        ...data,
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
      return { message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.' };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
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

  async resetPassword(body: any) {
    const { email, code, newPassword } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.resetCode !== code || !user.resetExpires || user.resetExpires < new Date()) {
      throw new UnauthorizedException('Code de réinitialisation invalide ou expiré');
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
