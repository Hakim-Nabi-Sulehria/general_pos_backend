import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from '../dtos/create-auth.dto';

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