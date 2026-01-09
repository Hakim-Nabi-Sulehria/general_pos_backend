import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { StockTransferService } from '../services/stock-transfer.service';
import { TransferStatus } from '@prisma/client';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('transfer')
@UseGuards(AuthGuard('jwt'), RolesGuard) 
export class TransferController {
  constructor(private readonly service: StockTransferService) {}

  
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Cashier ko transfers dekhne ki zaroorat nahi
  findAll() {
    return this.service.findAll();
  }

  // --- WRITE OPERATIONS (Approval & Deletion) ---

  // Update Status (Pending -> Approved/In Transit -> Completed)
  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Sirf Manager receive/approve karega
  // FIX: Added @Request() req
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    // Frontend strings ko Prisma Enum mein convert kar rahe hain
    let dbStatus: TransferStatus;
    
    switch(status) {
        case 'IN_TRANSIT': dbStatus = TransferStatus.APPROVED; break; // Approved means now moving
        case 'COMPLETED': dbStatus = TransferStatus.COMPLETED; break; // Received at destination
        case 'CANCELLED': dbStatus = TransferStatus.REJECTED; break;
        default: dbStatus = TransferStatus.PENDING;
    }

    // FIX: Pass userId to service
    return this.service.updateStatus(id, dbStatus, req.user.userId);
  }

  // Delete Transfer
  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER) // Delete restricted to management
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}