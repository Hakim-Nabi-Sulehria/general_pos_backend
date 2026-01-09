import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './modules/organization.module';
import { BranchModule } from './modules/branch.module';
import { CategoryModule } from './modules/category.module';
import { ProductModule } from './modules/product.module';
import { PrismaModule } from 'prisma/prisma.module';
import { SupplierModule } from './modules/supplier.module';
import { PurchaseModule } from './modules/purchase.module';
import { InventoryModule } from './modules/inventory.module';
import { DiscountModule } from './modules/discount.module';
import { SaleModule } from './modules/sales.modules';
import { TransferModule } from './modules/transfer.module';
import { AccountModule } from './modules/account.module';
import { AuthModule } from './modules/auth.module';
import { DashboardModule } from './modules/dashboard.module';
import { SaleReturnModule } from './modules/sales-return.module';
import { CashRequestsModule } from './modules/cashrequest.module';


@Module({
  imports: [ConfigModule.forRoot({isGlobal: true}),OrganizationModule, BranchModule, CategoryModule, ProductModule, PrismaModule, SupplierModule,InventoryModule, PurchaseModule,DiscountModule,SaleModule,TransferModule,AccountModule,AuthModule,DashboardModule,SaleReturnModule,CashRequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
