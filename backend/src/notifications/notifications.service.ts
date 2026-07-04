import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  type: 'stock_alert' | 'proposition' | 'commande' | 'info';
  title: string;
  message: string;
  role: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        message: dto.message,
        role: dto.role,
        data: (dto.data ?? {}) as any,
        timestamp: new Date(),
      },
    });
  }

  async findByRole(role: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findAll(limit = 50) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteOlderThan(date: Date) {
    return this.prisma.notification.deleteMany({
      where: { createdAt: { lt: date } },
    });
  }

  async markAllRead(role: string) {
    return this.prisma.notification.updateMany({
      where: { role, read: false },
      data: { read: true },
    });
  }

  async deleteByRole(role: string) {
    return this.prisma.notification.deleteMany({
      where: { role },
    });
  }
}
