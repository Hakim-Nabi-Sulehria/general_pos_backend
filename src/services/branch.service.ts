import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateBranchDto } from 'src/dtos/create-branch.dto';
import { UpdateBranchDto } from 'src/dtos/update-branch.dto';
import { Role } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService){}

  async create(data: CreateBranchDto) {
    return this.prisma.branch.create({
      data: data, 
      include:{organization: true, products: true}
    })
  }

  // --- UPDATED FIND ALL (Filtered) ---
  async findAll(user: any) {
    const where: any = {};

    // 1. Manager/Cashier -> Sirf apni assigned branch dekhein
    if (user.role === Role.MANAGER || user.role === Role.CASHIER) {
        if (user.branchId) {
            where.id = user.branchId;
        } else {
            return []; // Agar branch assign nahi hai to kuch mat dikhao
        }
    }
    
    // 2. Admin -> Sirf apni Organization ki branches dekhe
    if (user.role === Role.ADMIN) {
        where.organizationId = user.organizationId;
    }

    // 3. SuperAdmin -> Sab kuch dekhe (where empty rahega)

    return this.prisma.branch.findMany({
      where,
      include: {
          organization: true, 
          // Optional: Count bhi dikhayen k is branch me kitne products/users hain
          _count: { select: { products: true, users: true } } 
      }
    });
  }

  findOne(id: string) {
    return this.prisma.branch.findUnique({
      where:{id},
      include:{organization:true, products:true}
    });
  }

  update(id: string, data: UpdateBranchDto) {
    return this.prisma.branch.update({
      where:{id},
      data,
      include:{organization:true,products:true}
    })
  }

  async remove(branchId: string) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Find all purchases of this branch
      const purchases = await prisma.purchase.findMany({
        where: { branchId },
        select: { id: true },
      });

      // 2. Delete PurchaseItems
      for (const purchase of purchases) {
        await prisma.purchaseItem.deleteMany({
          where: { purchaseId: purchase.id },
        });
      }

      // 3. Delete Purchases
      await prisma.purchase.deleteMany({ where: { branchId } });

      // 4. Delete Suppliers
      await prisma.supplier.deleteMany({ where: { branchId } });

      // 5. Delete InventoryAdjustments
      await prisma.inventoryAdjustment.deleteMany({ where: { branchId } });

      // 6. Delete StockTransfers
      await prisma.stockTransfer.deleteMany({
        where: { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] },
      });

      // 7. Delete Products
      await prisma.product.deleteMany({ where: { branchId } });
      const sales = await prisma.sale.findMany({ where: { branchId }, select: { id: true } });
      for(const sale of sales) {
          await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
      }
      await prisma.sale.deleteMany({ where: { branchId } });

      // 9. Finally, delete the Branch itself
      return prisma.branch.delete({ where: { id: branchId } });
    });
  }
}