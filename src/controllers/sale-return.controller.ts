import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { SalesReturnService } from './../services/sales-return.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('returns')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SalesReturnController {
  constructor(private readonly service: SalesReturnService) {}

  // Return Create karna (Sirf Manager/Admin)
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER) 
  create(@Body() data: any, @Request() req) {
      return this.service.processReturn(data, req.user.userId);
  }

  // Returns ki History dekhna
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll() {
      return this.service.findAll();
  }
}