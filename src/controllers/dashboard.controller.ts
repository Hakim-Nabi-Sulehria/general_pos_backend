import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  getStats(@Request() req) {
    return this.service.getStats(req.user);
  }
}