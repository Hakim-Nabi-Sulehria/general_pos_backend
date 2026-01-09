import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { SaleController } from 'src/controllers/sales.controller';
import { SaleService } from 'src/services/sales.service';


@Module({
  imports: [PrismaModule],
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}