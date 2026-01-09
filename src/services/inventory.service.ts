import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateInventoryAdjustmentDto } from "src/dtos/create-adjustment.dto";
import { InventoryAdjustmentType, Role } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 1. GET ALL HISTORY (Filtered by Role) ---
  async findAll(user: any) {
    const where: any = {};

    // Logic: Manager sirf apni branch dekhe
    if (user.role === Role.MANAGER) {
        where.branchId = user.branchId;
    }
    
    // Logic: Admin sirf apni Organization ka data dekhe
    if (user.role === Role.ADMIN) {
        where.branch = {
            organizationId: user.organizationId
        };
    }

    return this.prisma.inventoryAdjustment.findMany({
      where, // <-- Filter Applied
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { branch: true },
        },
        branch: { select: { name: true } },
        createdByUser: { select: { name: true, email: true } } 
      },
    });
  }

  // --- 2. MANUAL ADJUSTMENT ---
  async adjustStock(data: CreateInventoryAdjustmentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      
      // Verify Product
      const product = await tx.product.findUnique({ 
          where: { id: data.productId } 
      });
      
      if (!product) {
        throw new BadRequestException('Product not found');
      }
      
      let change = 0;

      const increaseTypes: InventoryAdjustmentType[] = [
        InventoryAdjustmentType.PURCHASE,
        InventoryAdjustmentType.MANUAL_ADD,
        InventoryAdjustmentType.TRANSFER_IN,
        InventoryAdjustmentType.RETURN,
      ];

      if (increaseTypes.includes(data.type)) {
        change = data.quantity;
      } else {
        if (product.stockQuantity < data.quantity) {
             throw new BadRequestException(`Insufficient stock. Current: ${product.stockQuantity}`);
        }
        change = -data.quantity;
      }

      // A. Stock Update
      const updatedProduct = await tx.product.update({
        where: { id: data.productId },
        data: { stockQuantity: { increment: change } },
      });

      // B. History Record
      const record = await tx.inventoryAdjustment.create({
        data: {
          productId: data.productId,
          branchId: data.branchId,
          type: data.type,
          quantity: change, 
          reason: data.reason || "Manual Adjustment",
          referenceId: data.referenceId || "MANUAL",
          createdById: userId, // User Tracking
        },
      });

      return { updatedProduct, record };
    });
  }

  // --- 3. GET BRANCH STOCK ---
  async getBranchStock(branchId: string) {
    return this.prisma.product.findMany({
      where: { branchId },
      select: { id: true, name: true, stockQuantity: true, sku: true },
    });
  }
}