import { Controller, Get, Post, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { CreateAccountDto } from '../dtos/create-account.dto';

// --- SECURITY IMPORTS ---
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AccountController {
    constructor(private readonly service: AccountService) {}

    // --- SETUP & MANUAL ENTRIES ---
    
    @Post('seed')
    @Roles(Role.SUPERADMIN)
    seed() {
        return this.service.seedDefaults();
    }

    @Post('create')
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    create(@Body() data: CreateAccountDto) {
        return this.service.create(data);
    }

    @Post('expense')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    recordExpense(@Body() data: any, @Request() req) {
        // Note: Branch filter is complex here, handled in service/global
        return this.service.recordExpense(data);
    }

    // --- FINANCIAL REPORTS (FILTERED BY BRANCH) ---

    // 1. Full Chart of Accounts (COA)
    @Get()
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    findAll(@Query('branchId') branchId: string) {
        // Pass branchId to filter live/auto accounts
        return this.service.findAll(branchId);
    }

    // 2. Balance Sheet (SOFP)
    @Get('balance-sheet')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    getBalanceSheet(@Query('branchId') branchId: string) {
        // Pass branchId to filter Asset/Liability values
        return this.service.getBalanceSheet(branchId);
    }

    // 3. Income Statement (P&L)
    @Get('income-statement')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    getIncomeStatement(@Query('branchId') branchId: string) {
        // Pass branchId to filter Sales and COGS
        return this.service.getProfitLoss(branchId);
    }
    
    // 4. Cash Flow
    @Get('cash-flow')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    getCashFlow(@Query('branchId') branchId: string) {
        // Pass branchId to filter sales and cash movements
        return this.service.getCashFlow(branchId);
    }
    
    // 5. Account Details / Ledger View
    @Get('ledger/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
    getAccountDetails(@Param('id') id: string, @Query('branchId') branchId: string) {
        // Pass both the specific account ID and the branch filter
        return this.service.getAccountDetails(id, branchId);
    }
}