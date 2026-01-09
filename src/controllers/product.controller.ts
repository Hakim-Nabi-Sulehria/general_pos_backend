import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('product')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check
export class ProductController {
  constructor(private readonly service: ProductService) {}

  // --- WRITE OPERATIONS (Restricted to Management) ---

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Cashier product nahi bana sakta
  // FIX: Added @Request() req
  create(@Body() data: CreateProductDto, @Request() req) {
    // Service ko user pass karein taake Manager sirf apni branch me create kar sake
    return this.service.create(data, req.user);
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: UpdateProductDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- READ OPERATIONS (Open to Cashiers for POS) ---

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  // FIX: Added @Request() req
  findAll(@Request() req) {
    // Service ko user pass karein taake filtering ho sake (Manager -> Branch Products Only)
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}