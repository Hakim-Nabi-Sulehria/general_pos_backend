import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ArrayMinSize } from "class-validator";

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  shape?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  categoryId: string;

  // --- UPDATED FIELD ---
  @IsArray({ message: "Branches must be an array" })
  @IsString({ each: true, message: "Each branch ID must be a string" })
  @ArrayMinSize(1, { message: "Select at least one branch" })
  branchIds: string[];
  // --------------------

  @IsNumber()
  price: number;

  @IsNumber()
  cost: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;
}