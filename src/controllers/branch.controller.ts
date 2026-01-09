import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Request } from "@nestjs/common";
import { BranchService } from "../services/branch.service";
import { CreateBranchDto } from "src/dtos/create-branch.dto";
import { UpdateBranchDto } from "src/dtos/update-branch.dto";

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('branches')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check required
export class BranchController {
  constructor(private readonly service: BranchService) {}

  // --- WRITE OPERATIONS (Admins Only) ---

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN) // Sirf Admin nayi branch bana sakta hai
  create(@Body() data: CreateBranchDto) {
    return this.service.create(data);
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN) // Sirf Admin edit kar sakta hai
  update(@Param('id') id: string, @Body() data: UpdateBranchDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN) // Sirf Admin delete kar sakta hai
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- READ OPERATIONS (Accessible to Staff) ---

  @Get()
  // Managers aur Cashiers ko branches dekhne ki zaroorat hoti hai (Dropdowns ke liye)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER) 
  // FIX: Added @Request() req
  findAll(@Request() req) {
    // Service ko user pass karein taake filtering ho sake (Manager -> Only Own Branch)
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}