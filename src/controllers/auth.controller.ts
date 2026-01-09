import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dtos/create-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorators'; // File name check kr len
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN) 
  @Post('register') 
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // --- 4. GET ALL USERS (For Staff List Page) ---
  // Ye naya function hai jo Frontend k 'Users' page ko data dega
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MANAGER)
  @Get('users')
  findAll(@Request() req) {
    // Agar SuperAdmin hai to sab users dekh sake
    if (req.user.role === Role.SUPERADMIN) {
        return this.authService.findAllUsers();
    }
    // Agar Admin/Manager hai to sirf apni Organization ke log dekhe
    return this.authService.findAllUsers(req.user.organizationId);
  }
}