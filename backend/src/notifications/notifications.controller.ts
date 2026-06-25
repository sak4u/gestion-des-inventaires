import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { JwtRequestUser } from '../auth/interfaces/jwt-request-user.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Request() req: { user: JwtRequestUser },
    @Query('limit') limit?: string,
  ) {
    const role = req.user.role;
    const items = await this.notificationsService.findByRole(role, limit ? parseInt(limit, 10) : 50);
    return items;
  }
}
