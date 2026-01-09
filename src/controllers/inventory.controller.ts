import { Body, Controller, Get, Post, UseGuards, Request } from "@nestjs/common";
import { StockTransferService } from 'src/services/stock-transfer.service';
import { InventoryService } from './../services/inventory.service';
import { CreateInventoryAdjustmentDto } from 'src/dtos/create-adjustment.dto';
import { CreateStockTransferDto } from 'src/dtos/create-transfer.dto';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators'; // Path check kr lein (.decorator vs .decorators)
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Login required, 2. Role check
export class InventoryController {
    constructor(
        private readonly Service: InventoryService,
        private readonly transfer: StockTransferService
    ) {}


    @Get()
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
    // FIX: Added @Request() req
    findAll(@Request() req) {
        // FIX: Pass req.user to service for Branch Filtering
        return this.Service.findAll(req.user);
    }

    // --- WRITE OPERATIONS (Restricted to Management) ---

    @Post('adjust')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
    // FIX: Added @Request() req
    adjust(@Body() data: CreateInventoryAdjustmentDto, @Request() req) {
        // Pass userId to service (createdById k liye)
        return this.Service.adjustStock(data, req.user.userId);
    }

    @Post('transfer')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) 
    // FIX: Added @Request() req
    tranfer(@Body() data: CreateStockTransferDto, @Request() req) {
        // Pass userId to service (createdById k liye)
        return this.transfer.initiateTransfer(data, req.user.userId);
    }
}