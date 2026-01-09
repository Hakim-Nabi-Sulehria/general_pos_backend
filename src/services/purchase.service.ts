import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from '../dtos/create-purchase.dto';
import { PrismaService } from '../../prisma/prisma.service'; // Check path
import { InventoryAdjustmentType } from '@prisma/client';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePurchaseDto, userId: string) {
    const { branchIds, items, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      const createdPurchaseIds: string[] = []; 

      for (const branchId of branchIds) {
        
        // 1. Create Purchase Header
        const purchase = await tx.purchase.create({
          data: {
            supplier: { connect: { id: data.supplierId } },
            branch: { connect: { id: branchId } },
            status: data.status ?? false,
            totalAmount: 0,
            
            // Connect User Relation
            createdBy: userId ? { connect: { id: userId } } : undefined,
          },
        });

        let totalAmount = 0;

        // 2. Process Items
        for (const item of items) {
            const originalProduct = await tx.product.findUnique({ where: { id: item.productId } });
            
            if(!originalProduct) throw new NotFoundException("Product not found");

            const targetProduct = await tx.product.findFirst({
                where: { sku: originalProduct.sku, branchId: branchId }
            });

            if(!targetProduct) {
                throw new NotFoundException(`Product SKU ${originalProduct.sku} not found in branch ${branchId}`);
            }

            // FIX: Using lowercase 'discount' and adding fallback
            const discountVal = item.Discount || 0; 
            const costPrice = item.costprice;

            // Calculate Discounted Price
            // Assuming discount < 1 means percentage (e.g. 0.10 for 10%)
            // and discount >= 1 means fixed amount (e.g. 100 PKR)
            const discountedPrice = discountVal > 0 && discountVal < 1 
                ? costPrice * (1 - discountVal) 
                : costPrice - discountVal;

            const lineTotal = discountedPrice * item.quantity;
            totalAmount += lineTotal;

            await tx.purchaseItem.create({
                data: {
                    purchaseId: purchase.id,
                    productId: targetProduct.id, 
                    quantity: item.quantity,
                    costPrice: costPrice,
                    // FIX: Database column name is lowercase 'discount'
                    discount: discountVal,
                    totalDiscount: costPrice - discountedPrice, // Storing amount saved per unit
                    total: lineTotal,
                }
            });

            // Update Stock
            await tx.product.update({
                where: { id: targetProduct.id },
                data: { stockQuantity: { increment: item.quantity }}
            });

            // Log Inventory Adjustment
            await tx.inventoryAdjustment.create({
                data: {
                    productId: targetProduct.id,
                    branchId: branchId,
                    type: InventoryAdjustmentType.PURCHASE,
                    quantity: item.quantity,
                    referenceId: purchase.id,
                    reason: `Purchase from Supplier`,
                    createdById: userId, 
                }
            });
        }

        await tx.purchase.update({
            where: { id: purchase.id },
            data: { totalAmount }
        });

        createdPurchaseIds.push(purchase.id);
      }

      return createdPurchaseIds;
    }, { maxWait: 5000, timeout: 10000 });
  }

  // ... (Rest of the methods remain same)
  findAll() {
    return this.prisma.purchase.findMany({
      include: {
        supplier: true,
        branch: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  findOne(id: string) {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: { include: { product: true } },
        createdBy: true
      },
    });
  }

  async remove(id: string) {
      return this.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException(`Purchase not found`);

        const purchaseItems = await tx.purchaseItem.findMany({ where: { purchaseId: id }});
        
        for(const item of purchaseItems) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { decrement: item.quantity }}
            });
            
            await tx.inventoryAdjustment.create({
                data: {
                    productId: item.productId,
                    branchId: purchase.branchId,
                    type: InventoryAdjustmentType.MANUAL_REMOVE,
                    quantity: -item.quantity,
                    referenceId: id,
                    reason: `Purchase Deleted`,
                    createdById: null 
                }
            });
        }

        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        return tx.purchase.delete({ where: { id } });
      });
  }
}