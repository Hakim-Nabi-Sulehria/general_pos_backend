import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from 'prisma/prisma.service';
import { CreateProductDto } from 'src/dtos/create-product.dto';
import { UpdateProductDto } from 'src/dtos/update-product.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // --- 1. CREATE PRODUCT (Secure) ---
  async create(data: CreateProductDto, user: any) {
    let { branchIds, categoryId, ...rest } = data;

    // SECURITY CHECK:
    // Agar Manager product bana raha hai, to wo sirf APNI branch me bana sake.
    if (user.role === Role.MANAGER) {
        branchIds = [user.branchId]; 
    }
    
    // Agar Cashier try kare (Waise Controller rok lega, par double safety)
    if (user.role === Role.CASHIER) {
        throw new ForbiddenException("Cashiers cannot create products");
    }

    return this.prisma.$transaction(async (tx) => {
      const creationPromises = branchIds.map((branchId) => {
        return tx.product.create({
          data: {
            ...rest,
            branch: { connect: { id: branchId } },
            category: { connect: { id: categoryId } },
          },
          include: { branch: true, category: true },
        });
      });

      const createdProducts = await Promise.all(creationPromises);
      return createdProducts;
    }, 
    {
      maxWait: 5000,
      timeout: 10000, 
    });
  }

  // --- 2. FIND ALL (Filtered) ---
  async findAll(user: any) {
    const where: any = {};

    // Logic: Agar User Admin/SuperAdmin nahi hai (Yani Manager ya Cashier hai)
    // To sirf uski Branch ka data dikhao.
    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN) {
        if (!user.branchId) {
            // Agar ghalati se branchId nahi hai token me
            return []; 
        }
        where.branchId = user.branchId;
    }

    // Agar Admin hai to sirf apni Organization ka data dikhe
    if (user.role === Role.ADMIN) {
        // Assuming products are filtered via branch which is linked to Org
        // Prisma relation query:
        where.branch = {
            organizationId: user.organizationId
        };
    }

    return this.prisma.product.findMany({
      where, // <-- Ye filter zaroori hai
      include: { 
        branch: { select: { id: true, name: true } }, 
        category: { select: { id: true, name: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- 3. FIND ONE (Verification) ---
  async findOne(id: string) {
    return this.prisma.product.findUnique({ 
        where: { id }, 
        include: { branch: true, category: true } 
    });
  }

  // --- 4. UPDATE ---
  async update(id: string, data: UpdateProductDto) {
    const { branchIds, categoryId, ...rest } = data;
    
    // Note: Update mein usually branch change nahi hoti, 
    // agar karni hai to complex logic lagegi. Filhal basic update:
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
      },
      include: { branch: true, category: true },
    });
  }

  // --- 5. REMOVE ---
  async remove(id: string) {
    return this.prisma.$transaction(async (prisma) => {
      await prisma.purchaseItem.deleteMany({ where: { productId: id } });
      await prisma.inventoryAdjustment.deleteMany({ where: { productId: id } });
      await prisma.stockTransfer.deleteMany({ where: { productId: id } });
      return prisma.product.delete({ where: { id } });
    });
  }
}