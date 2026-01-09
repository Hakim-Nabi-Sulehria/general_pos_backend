import { Module } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt'; // <-- Ye Zaroori Hai
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    // --- FIX IS HERE: JwtModule Registration ---
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // .env se secret uthayega ya default use karega
      signOptions: { expiresIn: '24h' }, // Token expire time
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule], // JwtModule ko export bhi kar dein just in case
})
export class AuthModule {}