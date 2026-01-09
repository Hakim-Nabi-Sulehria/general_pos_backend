import { IsNotEmpty, IsNumber, IsString, Min, IsEnum, IsUUID, IsOptional } from 'class-validator';

// 1. STANDARD REQUEST (Cashier/Manager ke liye)
export class CreateCashRequestDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

// 2. STATUS UPDATE (Approve/Reject ke liye)
export enum RequestStatusAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateCashRequestStatusDto {
  @IsEnum(RequestStatusAction)
  status: RequestStatusAction;
}

// --- 3. NEW: ADMIN ADD CASH DTO ---
export class AddCashDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  // @IsUUID() // Agar aapke IDs UUID hain to ye uncomment karein validation ke liye
  branchId: string;
}