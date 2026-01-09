import { Module } from '@nestjs/common';
import { CashRequestsService } from '../services/cashrequest.service';
import { CashRequestsController } from '../controllers/cashrequest.controller';
import { PrismaModule } from '../../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [CashRequestsController],
  providers: [CashRequestsService],
})
export class CashRequestsModule {}