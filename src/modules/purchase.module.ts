import { Module } from '@nestjs/common';
import { PurchaseService } from '../services/purchase.service';
import { PurchaseController } from '../controllers/purchase.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports:[PrismaModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
