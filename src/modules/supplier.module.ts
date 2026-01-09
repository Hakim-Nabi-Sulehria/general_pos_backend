import { Module } from '@nestjs/common';
import { SupplierService } from '../services/supplier.service';
import { SupplierController } from '../controllers/supplier.controller';

@Module({
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}
