import { Type } from "class-transformer";
import { 
  IsArray, 
  IsBoolean, 
  IsNotEmpty, 
  IsNumber, 
  IsString, 
  ValidateNested, 
  ArrayMinSize, 
  IsOptional 
} from "class-validator";

export class PurchaseItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    costprice: number;

    @IsNumber()
    @IsNotEmpty()
    Discount: number;   // 0-1 for percentage or fixed amount
}

export class CreatePurchaseDto {
    @IsString()
    @IsNotEmpty()
    supplierId: string;

    // --- CHANGE: Single ID ko Array banaya ---
    @IsArray({ message: "Branches must be an array" })
    @IsString({ each: true, message: "Each branch ID must be a string" })
    @ArrayMinSize(1, { message: "Select at least one branch" })
    branchIds: string[];
    // ----------------------------------------

    @IsOptional() // Optional kar diya taake agar frontend na bheje to default false ho jaye
    @IsBoolean()
    status?: boolean; 

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseItemDto)
    items: PurchaseItemDto[];
}