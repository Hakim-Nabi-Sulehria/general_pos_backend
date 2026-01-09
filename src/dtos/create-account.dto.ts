import { IsEnum, IsNotEmpty, IsString, IsOptional } from "class-validator";
import { AccountType } from "@prisma/client";

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  code: string; // e.g. "6001" for Rent

  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Office Rent"

  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType; // EXPENSE, LIABILITY, etc.

  @IsOptional()
  @IsString()
  description?: string;
}