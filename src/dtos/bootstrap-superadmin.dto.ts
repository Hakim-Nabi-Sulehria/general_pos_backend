import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** One-time public setup: creates first Organization + SUPERADMIN (only if none exist). */
export class BootstrapSuperadminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  orgName: string;

  @IsOptional()
  @IsEmail()
  orgEmail?: string;

  @IsString()
  @IsNotEmpty()
  orgAddress: string;

  @IsOptional()
  @IsString()
  orgPhone?: string;

  @IsOptional()
  @IsString()
  orgCurrency?: string;

  @IsOptional()
  @IsString()
  orgTimezone?: string;
}
