import { Module } from '@nestjs/common';

import { PrismaModule } from 'prisma/prisma.module';
import { DiscountController } from 'src/controllers/discount.controller';
import { DiscountService } from 'src/services/discount.service';

@Module({
  imports:[PrismaModule],
  controllers: [DiscountController],
  providers: [DiscountService],
})
export class DiscountModule {}
