import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DiscountService } from '../services/discount.service';
import { CreateDiscountDto } from '../dtos/create-discount.dto';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('discount')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check required
export class DiscountController {
  constructor(private readonly service: DiscountService) {}

  // --- WRITE OPERATIONS (Restricted to Management) ---

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Cashier naya discount nahi bana sakta
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.service.create(createDiscountDto);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Cashier edit nahi kar sakta
  update(@Param('id') id: string, @Body() updateDiscountDto: any) {
    return this.service.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Cashier delete nahi kar sakta
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- READ OPERATIONS (Accessible to Cashiers for POS) ---

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER) // Zaroori hai POS ke liye
  findActive() {
    return this.service.findActive();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('validate')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  validateCoupon(@Body('code') code: string) {
    return this.service.validateByCode(code);
  }
}