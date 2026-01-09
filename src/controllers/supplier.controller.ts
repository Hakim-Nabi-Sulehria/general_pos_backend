import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards, Request } from '@nestjs/common';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { UpdateSupplierDto } from '../dtos/update-supplier.dto';

// Security Imports
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('supplier')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  // FIX: Added @Request()
  create(@Body() data: CreateSupplierDto, @Request() req) {
    return this.supplierService.create(data, req.user);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  // FIX: Added @Request()
  findAll(@Request() req) {
    return this.supplierService.findAll(req.user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: UpdateSupplierDto) {
    return this.supplierService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN) // Manager shayad delete na kar sake (Optional)
  remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }
}