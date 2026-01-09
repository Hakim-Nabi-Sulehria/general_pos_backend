import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { UpdateSupplierDto } from '../dtos/update-supplier.dto';
import { Role } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  // --- CREATE (Secure) ---
  async create(data: CreateSupplierDto, user: any) {
    // Agar Manager hai to zabardasti uski branch ID use karo
    if (user.role === Role.MANAGER) {
        data.branchId = user.branchId;
    }

    return this.prisma.supplier.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        branch: { connect: { id: data.branchId } }
      },
    });
  }

  // --- FIND ALL (Filtered) ---
  async findAll(user: any) {
    const where: any = {};

    // 1. Manager -> Sirf apni Branch ke Suppliers dekhe
    if (user.role === Role.MANAGER) {
        where.branchId = user.branchId;
    }

    // 2. Admin -> Sirf apni Organization ke Suppliers dekhe
    if (user.role === Role.ADMIN) {
        where.branch = {
            organizationId: user.organizationId
        };
    }

    // 3. SuperAdmin -> Sab kuch dekhe

    return this.prisma.supplier.findMany({
      where,
      include: { branch: { select: { name: true } } }, // Branch name dikhana zaroori hai
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- FIND ONE (Secure Check) ---
  async findOne(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: { branch: true }
    });
  }

  async update(id: string, data: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    return this.prisma.supplier.delete({ where: { id } });
  }
}