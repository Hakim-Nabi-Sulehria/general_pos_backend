import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { DashboardController } from 'src/controllers/dashboard.controller';
import { DashboardService } from 'src/services/dashboard.service';


@Module({
  imports:[PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
