import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Apne path ke hisab se change karein
import { CreateCashRequestDto, UpdateCashRequestStatusDto } from '../dtos/create-cashrequest.dto';

@Injectable()
export class CashRequestsService {
  constructor(private prisma: PrismaService) {}

  // 1. Create Request
  async create(userId: string, userBranchId: string, dto: CreateCashRequestDto) {
    return this.prisma.cashRequest.create({
      data: {
        amount: dto.amount,
        reason: dto.reason,
        requesterId: userId,
        branchId: userBranchId,
        status: 'PENDING',
      },
    });
  }

  // 2. Get My Requests (Jo user ne khud bheji hain)
  async findAllMyRequests(userId: string) {
    return this.prisma.cashRequest.findMany({
      where: { requesterId: userId },
      include: {
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Get Incoming Requests (Role Based Logic)
  // Manager -> Sirf apni branch ke Cashiers ki requests dekhega
  // Admin -> Sirf Managers ki requests dekhega
  async findAllIncoming(user: any) {
    const { role, branchId } = user;
    let whereCondition: any = { status: 'PENDING' };

    if (role === 'MANAGER') {
      whereCondition = {
        ...whereCondition,
        branchId: branchId, // Must be same branch
        requester: {
          role: 'CASHIER', // Must be from Cashier
        },
      };
    } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
      whereCondition = {
        ...whereCondition,
        requester: {
          role: 'MANAGER', // Must be from Manager
        },
      };
    } else {
      // Cashier ko incoming requests dekhne ki permission nahi
      throw new ForbiddenException('You are not authorized to view incoming requests');
    }

    return this.prisma.cashRequest.findMany({
      where: whereCondition,
      include: {
        requester: {
          select: { name: true, role: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. Update Status (Approve/Reject)
  async updateStatus(id: string, approverId: string, dto: UpdateCashRequestStatusDto) {
    
    // Transaction use karenge taake Status update aur Cash add dono sath hon
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Pehle Request dhoondain (Kyunke humein Amount aur BranchId chahiye)
      const existingRequest = await tx.cashRequest.findUnique({
        where: { id }
      });

      if (!existingRequest) {
        throw new NotFoundException("Request not found");
      }

      // Safety Check: Agar pehle se Approved hai to dubara paise add na hon
      if (existingRequest.status === 'APPROVED') {
        throw new BadRequestException("This request is already approved.");
      }

      // 2. Request ka Status Update karein
      const updatedRequest = await tx.cashRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approverId: approverId,
        },
      });

      // 3. MAIN FIX: Agar Status APPROVED hai, to Branch Balance barhayein
      if (dto.status === 'APPROVED') {
        if (existingRequest.branchId) {
            await tx.branch.update({
                where: { id: existingRequest.branchId },
                data: {
                    cashBalance: { increment: existingRequest.amount } // <--- YE LINE PAISE ADD KAREGI
                }
            });
        } else {
            console.warn(`Request ${id} has no branchId attached.`);
        }
      }

      return updatedRequest;
    });
  }

  async addCashDirectly(adminId: string, branchId: string, amount: number, reason: string) {
  // Transaction start
  return this.prisma.$transaction(async (tx) => {
    
    // 1. Branch Balance Update
    const branch = await tx.branch.update({
      where: { id: branchId },
      data: {
        cashBalance: { increment: amount }
      }
    });

    // 2. Log Entry Create
    await tx.cashRequest.create({
      data: {
        amount,
        reason: `Admin Deposit: ${reason}`,
        status: 'APPROVED',
        requesterId: adminId, // Admin ID (Make sure yeh ID valid ho)
        approverId: adminId,
        branchId: branchId,
        // Yahan 'requester' connect syntax use karne ki zaroorat nahi agar aap seedha ID de rahay hain
        // Lekin agar error aaye to 'connect' wala syntax use karein jo pehle discuss hua tha
      }
    });

    return branch;

  }, {
    // --- YE SETTINGS ADD KAREIN (TIMEOUT FIX) ---
    maxWait: 5000,  // Connection milne ka wait (5 sec)
    timeout: 20000  // Transaction chalne ka time (20 sec kar dein)
  });
}

  // 2. GET TOTAL BALANCE (Organization Wide)
  async getOrganizationBalance() {
    // Sari branches ka balance sum karein
    const branches = await this.prisma.branch.findMany({
      select: { id: true, name: true, cashBalance: true }
    });

    const totalCash = branches.reduce((sum, b) => sum + b.cashBalance, 0);

    return {
      totalBalance: totalCash,
      breakdown: branches // Har branch ka alag alag bhi dikha sakein
    };
  }
}