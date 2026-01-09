import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { SalesReturnController } from 'src/controllers/sale-return.controller';
import { SalesReturnService } from 'src/services/sales-return.service';

@Module({
  imports:[PrismaModule],
  controllers: [SalesReturnController],
  providers: [SalesReturnService],
})
export class SaleReturnModule {}
