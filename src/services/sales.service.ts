import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { InventoryAdjustmentType } from '@prisma/client';

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  // --- CREATE SALE ---
  async create(data: any, userId: string, userBranchId: string) {
    // 20 Seconds Timeout for safety during stock updates
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Generate Invoice No
      const count = await tx.sale.count();
      const invoiceNo = `INV-${1000 + count + 1}`;

      // 2. Validate Stock (Pehle check karo taake baad me error na aaye)
      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        
        if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);
        
        if (product.stockQuantity < item.quantity) {
             throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
        }
      }

      // 3. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          // IMPORTANT: Agar Cashier hai to Token wali branch use hogi
          branchId: userBranchId || data.branchId, 
          customerName: data.customerName || "Walk-in Customer",
          customerPhone: data.customerPhone || "", 
          totalAmount: data.totalAmount,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
          paymentMethod: data.paymentMethod,
          createdById: userId, // Tracking who made the sale
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subTotal: item.subTotal,
            })),
          },
        },
      });

      // 4. Update Stock & Create Inventory History
      for (const item of data.items) {
        // A. Minus Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        // B. Add History (Inventory Page ke liye)
        await tx.inventoryAdjustment.create({
            data: {
                productId: item.productId,
                branchId: userBranchId || data.branchId,
                type: InventoryAdjustmentType.SALE,
                quantity: -item.quantity, // Negative for Sale
                referenceId: sale.id,
                reason: `Sale Invoice ${invoiceNo}`,
                createdById: userId, // User Link
            }
        });
      }

      // Return Full Object with Relations
      return tx.sale.findUnique({
        where: { id: sale.id },
        include: { 
            branch: true, 
            items: { include: { product: true } },
            createdBy: { select: { name: true } } 
        }
      });
    }, { maxWait: 5000, timeout: 20000 });
  }

  // --- FILTERED HISTORY (UPDATED) ---
  findAll(user: any) {
    const where: any = {};

    // Logic: 
    // 1. Agar Cashier hai -> Sirf apni sales dekhega
    // 2. Agar Manager hai -> Sirf apni Branch ki sales dekhega
    // 3. Agar Admin hai -> Sab kuch dekhega

    if (user.role === 'CASHIER') {
        where.createdById = user.userId;
    } else if (user.role === 'MANAGER') {
        where.branchId = user.branchId;
    }

    return this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
          branch: true, 
          items: { include: { product: true } },
          createdBy: { select: { name: true, email: true } },
          
          // --- NEW ADDITION ---
          // Returns include kiye taake frontend par status dikha saken
          // (e.g., agar totalRefund > 0 hai to 'Returned' badge lagayein)
          returns: {
            select: {
                id: true,
                totalRefund: true,
                returnDate: true
            }
          }
      },
    });
  }
}