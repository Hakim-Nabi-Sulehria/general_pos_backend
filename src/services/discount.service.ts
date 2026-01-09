import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'; // NotFoundException add kiya
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto } from '../dtos/create-discount.dto';
import { DiscountScope, DiscountType } from '@prisma/client';

@Injectable()
export class DiscountService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateDiscountDto) {
    const { targetIds, scope, type, validUntil, ...rest } = data;

    const ids = targetIds || [];
    const connectData = ids.map((id) => ({ id }));

    const productsRelation = scope === 'PRODUCT' ? { connect: connectData } : undefined;
    const categoriesRelation = scope === 'CATEGORY' ? { connect: connectData } : undefined;

    if (new Date(validUntil) < new Date()) {
        throw new BadRequestException("Expiry date cannot be in the past");
    }

    return this.prisma.discount.create({
      data: {
        ...rest,
        scope: scope as DiscountScope,
        type: type as DiscountType,
        validUntil: new Date(validUntil),
        products: productsRelation,
        categories: categoriesRelation,
      },
      include: {
        products: true,   
        categories: true,
      },
    });
  }

  findAll() {
    return this.prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        products: { select: { name: true } }, 
        categories: { select: { name: true } },
      },
    });
  }

  findActive() {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        isActive: true,
        validUntil: { gt: now },
      },
      include: {
        products: true,
        categories: true,
      }
    });
  }

  findOne(id: string) {
    return this.prisma.discount.findUnique({
      where: { id },
      include: { products: true, categories: true },
    });
  }

  async update(id: string, data: any) {
    if (data.validUntil) {
      data.validUntil = new Date(data.validUntil);
    }
    if (data.scope) {
        data.scope = data.scope as DiscountScope;
    }
    if (data.type) {
        data.type = data.type as DiscountType;
    }

    return this.prisma.discount.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.discount.delete({
      where: { id },
    });
  }

  // --- NEW: COUPON VALIDATION FOR POS ---
  async validateByCode(code: string) {
    // 1. Database me code dhoondhein
    const discount = await this.prisma.discount.findFirst({
        where: { 
            code: { equals: code, mode: 'insensitive' } // Case-insensitive search (SALE50 = sale50)
        }, 
        include: {
            products: true,
            categories: true
        }
    });

    // 2. Checks
    if (!discount) {
        throw new NotFoundException('Invalid Coupon Code');
    }

    if (!discount.isActive) {
        throw new BadRequestException('This coupon is currently inactive');
    }

    if (new Date(discount.validUntil) < new Date()) {
        throw new BadRequestException('This coupon has expired');
    }

    // (Optional) Agar aapne 'isPosAvailable' field add ki hai to ye uncomment karein:
    // if (!discount.isPosAvailable) {
    //    throw new BadRequestException('This coupon cannot be used on POS');
    // }

    // 3. Success response
    return {
        success: true,
        data: discount
    };
  }
}