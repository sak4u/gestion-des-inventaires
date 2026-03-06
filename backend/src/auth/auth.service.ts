import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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
}
