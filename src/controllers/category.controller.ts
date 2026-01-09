import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CategoryService } from "../services/category.service";
import { CreateCategoryDto } from "src/dtos/create-category.dto";
import { UpdateCategoryDto } from "src/dtos/update-category.dto";

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('categoies') // Note: Typos in route name preserved to match your frontend API
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login & Role Check
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  // --- WRITE OPERATIONS (Restricted to Management) ---

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
  create(@Body() data: CreateCategoryDto) {
    return this.service.create(data); 
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: UpdateCategoryDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- READ OPERATIONS (Open to All Staff) ---

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}