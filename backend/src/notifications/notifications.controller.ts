import { Controller, Get, Patch, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import type { JwtRequestUser } from '../auth/interfaces/jwt-request-user.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  async findAll(
    @Request() req: { user: JwtRequestUser },
    @Query('limit') limit?: string,
  ) {
    const role = req.user.role;
    const items = await this.notificationsService.findByRole(role, limit ? parseInt(limit, 10) : 50);
    return items;
  }

  @Patch('read-all')
  async markAllRead(@Request() req: { user: JwtRequestUser }) {
    const role = req.user.role;
    const result = await this.notificationsService.markAllRead(role);
    this.notificationsGateway.broadcastAllRead(role);
    return result;
  }

  @Delete()
  async deleteAll(@Request() req: { user: JwtRequestUser }) {
    const role = req.user.role;
    const result = await this.notificationsService.deleteByRole(role);
    this.notificationsGateway.broadcastCleared(role);
    return result;
  }
}
