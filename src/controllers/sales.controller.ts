import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SaleService } from '../services/sales.service'; // Path check kr lein

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators'; // .decorators check kr lein
import { Role } from '@prisma/client';

@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check
export class SaleController {
  constructor(private readonly service: SaleService) {}

  // --- CREATE SALE (Operational Action) ---
  @Post()
  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  create(@Body() data: any, @Request() req) {
    // 1. User ID nikalein (Audit ke liye)
    const userId = req.user.userId;
    
    // 2. Branch ID nikalein (Cashier apni branch change nahi kar sakta)
    const userBranchId = req.user.branchId;

    // Service ko data pass karein
    return this.service.create(data, userId, userBranchId);
  }

  // --- VIEW SALES HISTORY (Filtered Access) ---
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findAll(@Request() req) {
    // User object pass kar rahe hain taake Service filter kar sake
    return this.service.findAll(req.user);
  }
}