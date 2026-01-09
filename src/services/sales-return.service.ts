import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { InventoryAdjustmentType } from '@prisma/client';

@Injectable()
export class SalesReturnService {
  constructor(private prisma: PrismaService) {}

  async processReturn(data: any, userId: string) {
    const { saleId, items, reason } = data;

    // 1. Fetch Sale with Items AND Previous Returns
    const sale = await this.prisma.sale.findUnique({ 
        where: { id: saleId },
        include: { 
            items: true,
            returns: { include: { items: true } } // Pehle wale returns bhi laao
        }
    });

    if (!sale) throw new BadRequestException("Sale Invoice not found");

    return this.prisma.$transaction(async (tx) => {
      let totalRefund = 0;
      
      // --- FIX IS HERE: Explicitly defined as any[] ---
      const newReturnItems: any[] = []; 

      // 2. Validate Quantity Logic (The Fix)
      for (const reqItem of items) {
          const originalItem = sale.items.find(i => i.productId === reqItem.productId);
          if (!originalItem) throw new BadRequestException(`Item ${reqItem.productId} not found in this invoice`);

          // Calculate kitna pehle return ho chuka hai
          let alreadyReturnedQty = 0;
          sale.returns.forEach(ret => {
              const prevItem = ret.items.find(i => i.productId === reqItem.productId);
              if (prevItem) alreadyReturnedQty += prevItem.quantity;
          });

          // Remaining Quantity check karo
          const remainingQty = originalItem.quantity - alreadyReturnedQty;

          if (reqItem.quantity > remainingQty) {
              throw new BadRequestException(
                  `Cannot return ${reqItem.quantity} items of Product ${originalItem.productId}. Only ${remainingQty} remaining (Sold: ${originalItem.quantity}, Returned: ${alreadyReturnedQty})`
              );
          }

          // Agar quantity valid hai, to process karo
          const amount = originalItem.unitPrice * reqItem.quantity; // Price bhi original wali lo (User ki bheji hui nahi)
          totalRefund += amount;

          // Object array mein push
          newReturnItems.push({
              productId: reqItem.productId,
              quantity: reqItem.quantity,
              refundAmount: amount
          });
      }

      // 3. Create Return Record
      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId,
          reason,
          processedById: userId,
          totalRefund,
          items: {
            create: newReturnItems // Ab ye array sahi type ka hai
          }
        }
      });

      // 4. Update Stock & Inventory
      for (const item of newReturnItems) {
          // Stock Wapis Add
          await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } }
          });

          // History Log
          await tx.inventoryAdjustment.create({
              data: {
                  productId: item.productId,
                  branchId: sale.branchId,
                  type: InventoryAdjustmentType.RETURN,
                  quantity: item.quantity,
                  referenceId: saleReturn.id,
                  reason: `Return for Sale Invoice #${sale.invoiceNo}`,
                  createdById: userId
              }
          });
      }

      return saleReturn;
    });
  }

  // List of all returns
  async findAll() {
      return this.prisma.saleReturn.findMany({
          include: { 
              sale: { select: { invoiceNo: true } }, 
              items: { include: { product: true } },
              processedBy: { select: { name: true } }
          },
          orderBy: { returnDate: 'desc' }
      });
  }
}