import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PurchaseService } from '../services/purchase.service';
import { CreatePurchaseDto } from '../dtos/create-purchase.dto';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('purchase')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  // --- WRITE OPERATIONS (Managers & Admins Only) ---

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
  create(@Body() data: CreatePurchaseDto, @Request() req) {
    // User ID pass kar rahe hain taake record rahe kisne purchase ki
    const userId = req.user.userId; 
    return this.service.create(data, userId);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- READ OPERATIONS (Managers & Admins Only) ---
  // Cashier ko Purchase invoices dekhne ki zaroorat nahi hoti

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}