import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { WarehouseModule } from './warehouse/warehouse.module.js';
import { SupplierModule } from './supplier/supplier.module';

@Module({
  imports: [PrismaModule, AuthModule, MailModule, WarehouseModule, SupplierModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
