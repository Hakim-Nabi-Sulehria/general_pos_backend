import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { RegisterDto, LoginDto } from '../dtos/create-auth.dto';
import { BootstrapSuperadminDto } from '../dtos/bootstrap-superadmin.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // --- LOGIN LOGIC ---
  async login(dto: LoginDto) {
    // 1. Find User
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2. Check Password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // 3. Generate Token
    const payload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role,
        branchId: user.branchId,
        organizationId: user.organizationId
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        branchId: user.branchId
      }
    };
  }

  /** Public: true if at least one SUPERADMIN exists (hide setup UI). */
  async bootstrapSuperadminExists(): Promise<{ superadminExists: boolean }> {
    const count = await this.prisma.user.count({
      where: { role: Role.SUPERADMIN },
    });
    return { superadminExists: count > 0 };
  }

  /**
   * Public one-time setup: create default organization + single SUPERADMIN.
   * Refuses if any SUPERADMIN already exists.
   */
  async bootstrapSuperadmin(
    dto: BootstrapSuperadminDto,
    bootstrapSecretHeader?: string,
  ) {
    const expected = process.env.AUTH_BOOTSTRAP_SECRET?.trim();
    if (expected) {
      const got = bootstrapSecretHeader?.trim() ?? '';
      if (got !== expected) {
        throw new ForbiddenException('Invalid or missing bootstrap secret');
      }
    }

    const existing = await this.prisma.user.count({
      where: { role: Role.SUPERADMIN },
    });
    if (existing > 0) {
      throw new ConflictException(
        'A super admin already exists. Sign in or use an admin to add users.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { password: _, ...user } = await this.prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.orgName,
            email: dto.orgEmail?.trim() || null,
            address: dto.orgAddress,
            phone: dto.orgPhone?.trim() || null,
            currency: dto.orgCurrency?.trim() || 'PKR',
            timezone: dto.orgTimezone?.trim() || 'UTC',
          },
        });
        return tx.user.create({
          data: {
            email: dto.email.trim(),
            password: hashedPassword,
            name: dto.name.trim(),
            role: Role.SUPERADMIN,
            organizationId: org.id,
            branchId: null,
          },
        });
      },
    );

    return {
      message: 'Super admin and organization created. You can sign in now.',
      user,
    };
  }

  // --- REGISTER USER (Admin Only) ---
  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email }
    });
    if (existingUser) throw new ConflictException('Email already exists');

    // Hash Password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create User
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
        organizationId: dto.organizationId,
        branchId: dto.branchId,
      },
    });

    // Return without password
    const { password, ...result } = user;
    return result;
  }

  // --- NEW: GET ALL USERS (Dynamic List) ---
  async findAllUsers(organizationId?: string) {
    // Agar Org ID mili to filter karo, warna sab (SuperAdmin case)
    const where = organizationId ? { organizationId } : {};

    return this.prisma.user.findMany({
      where,
      select: { 
        // Password select nahi karna (Security Risk)
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        branch: { 
            select: { name: true } // Branch ka naam bhi chahiye list me
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}