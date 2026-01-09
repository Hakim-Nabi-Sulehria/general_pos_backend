import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationDto } from "src/dtos/create-organization.dto";
import { UpdateOrganizationDto } from "src/dtos/update-organization.dto";

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('organizations')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  // --- SUPERADMIN ONLY (Critical Actions) ---

  @Post()
  @Roles(Role.SUPERADMIN) // Nayi company register karna
  create(@Body() data: CreateOrganizationDto) {
    return this.service.create(data);
  }

  @Get()
  @Roles(Role.SUPERADMIN) // Saari companies ki list dekhna
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN) // Company delete karna
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- ADMIN LEVEL (Manage Own Org) ---

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN) // Admin apni org edit kar sakta hai
  update(@Param('id') id: string, @Body() data: UpdateOrganizationDto) {
    return this.service.update(id, data);
  }

  // --- READ ACCESS (All Staff) ---

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findOne(@Param('id') id: string) {
    // FIX: Pichle code me 'this.findOne' tha jo crash kar raha tha
    return this.service.findOne(id); 
  }
}