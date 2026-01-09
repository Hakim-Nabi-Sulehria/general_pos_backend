import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { CashRequestsService } from '../services/cashrequest.service';
import { CreateCashRequestDto, UpdateCashRequestStatusDto, AddCashDto } from '../dtos/create-cashrequest.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard'; // Agar Roles guard hai to
import { Roles } from '../common/decorators/roles.decorators';

@Controller('cash-requests')
@UseGuards(JwtAuthGuard, RolesGuard)// Sabhi routes protected hain
export class CashRequestsController {
  constructor(private readonly cashRequestsService: CashRequestsService) {}

  // 1. Create Request
  // POST /cash-requests
  @Post()
  create(@Request() req, @Body() createDto: CreateCashRequestDto) {
    // Req.user JWT se aa raha hai
    return this.cashRequestsService.create(req.user.id, req.user.branchId, createDto);
  }

  // 2. My Sent Requests
  // GET /cash-requests/my
  @Get('my')
  getMyRequests(@Request() req) {
    return this.cashRequestsService.findAllMyRequests(req.user.id);
  }

  // 3. Incoming Requests (Manager/Admin Only)
  // GET /cash-requests/incoming
  @Get('incoming')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN', 'SUPERADMIN') // Sirf ye roles access karein
  getIncomingRequests(@Request() req) {
    return this.cashRequestsService.findAllIncoming(req.user);
  }

  // 4. Update Status (Approve/Reject)
  // PATCH /cash-requests/:id/status
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN', 'SUPERADMIN')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateCashRequestStatusDto,
  ) {
    return this.cashRequestsService.updateStatus(id, req.user.id, updateDto);
  }


  @Post('admin/add-cash')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  addCashDirectly(@Request() req, @Body() dto: AddCashDto) {
    return this.cashRequestsService.addCashDirectly(req.user.id, dto.branchId, dto.amount, dto.reason);
  }

 
  @Get('balance/overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER') // Manager bhi dekh sake
  getBalanceOverview() {
    return this.cashRequestsService.getOrganizationBalance();
  }
}